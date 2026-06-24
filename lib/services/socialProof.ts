'use server';

import { SocialProof } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';

interface DBSocialProof {
  id: string;
  image_url: string;
  caption?: string | null;
  source_type: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  deleted_at?: string | null;
}

const mapSocialProof = (row: DBSocialProof): SocialProof => ({
  id: row.id,
  imageUrl: row.image_url,
  caption: row.caption || undefined,
  sourceType: row.source_type as SocialProof['sourceType'],
  active: row.active,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  deletedAt: row.deleted_at || undefined,
  linkedProducts: [],
  productIds: []
});

async function attachLinkedProducts(proofs: SocialProof[]): Promise<SocialProof[]> {
  if (proofs.length === 0) return proofs;
  try {
    const { data: junctionRows } = await supabaseAdmin
      .from('social_proof_products')
      .select('social_proof_id, product_id, products!left(id, name, slug)')
      .in('social_proof_id', proofs.map(p => p.id));

    if (!junctionRows) return proofs;

    const productsByProofId: Record<string, any[]> = {};
    const allProductIds = new Set<string>();
    for (const row of junctionRows as any[]) {
      if (!productsByProofId[row.social_proof_id]) productsByProofId[row.social_proof_id] = [];
      if (row.products) {
        const p = row.products;
        productsByProofId[row.social_proof_id].push({ id: p.id, name: p.name, slug: p.slug });
        allProductIds.add(p.id);
      }
    }

    // Fetch product images in a separate batch (avoids nested join RLS issues)
    const imageMap: Record<string, string | undefined> = {};
    if (allProductIds.size > 0) {
      const { data: images } = await supabaseAdmin
        .from('product_images')
        .select('product_id, url, is_primary')
        .in('product_id', [...allProductIds]);
      if (images) {
        for (const img of images) {
          if (!imageMap[img.product_id] || img.is_primary) {
            imageMap[img.product_id] = img.url;
          }
        }
      }
    }

    return proofs.map(proof => ({
      ...proof,
      linkedProducts: (productsByProofId[proof.id] || []).map((p: any) => ({
        ...p,
        image: imageMap[p.id]
      })),
      productIds: (productsByProofId[proof.id] || []).map((p: any) => p.id)
    }));
  } catch (err) {
    console.error('[socialProof] attachLinkedProducts failed:', err);
    return proofs;
  }
}

export const getSocialProofs = async (): Promise<SocialProof[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('social_proof')
      .select('*')
      .eq('active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    const proofs = (data ?? []).map(mapSocialProof);
    return attachLinkedProducts(proofs);
  } catch (error) {
    console.error('[socialProof] getSocialProofs failed:', error);
    return [];
  }
};

export const getAllSocialProofs = async (): Promise<SocialProof[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('social_proof')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    const proofs = (data ?? []).map(mapSocialProof);
    return attachLinkedProducts(proofs);
  } catch (error) {
    console.error('[socialProof] getAllSocialProofs failed:', error);
    throw error;
  }
};

export const submitSocialProof = async (proof: {
  imageUrl: string;
  caption?: string;
  sourceType: 'whatsapp' | 'instagram' | 'facebook' | 'manual';
  productIds?: string[];
}): Promise<SocialProof> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('social_proof')
      .insert({
        image_url: proof.imageUrl,
        caption: proof.caption || null,
        source_type: proof.sourceType,
        active: true,
        sort_order: 0
      })
      .select('*')
      .single();

    if (error) throw error;

    if (proof.productIds && proof.productIds.length > 0) {
      const junctionRows = proof.productIds.map(productId => ({
        social_proof_id: data.id,
        product_id: productId
      }));
      const { error: junctionError } = await supabaseAdmin
        .from('social_proof_products')
        .insert(junctionRows);
      if (junctionError) throw junctionError;
    }

    (revalidateTag as any)('social_proof');

    const [fullProof] = await attachLinkedProducts([mapSocialProof(data as DBSocialProof)]);
    return fullProof;
  } catch (error) {
    console.error('[socialProof] submitSocialProof failed:', error);
    throw error;
  }
};

export const updateSocialProof = async (id: string, updates: {
  imageUrl?: string;
  caption?: string;
  sourceType?: 'whatsapp' | 'instagram' | 'facebook' | 'manual';
  productIds?: string[];
}): Promise<SocialProof> => {
  try {
    const updateData: Record<string, any> = {};
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
    if (updates.caption !== undefined) updateData.caption = updates.caption;
    if (updates.sourceType !== undefined) updateData.source_type = updates.sourceType;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from('social_proof')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    }

    if (updates.productIds !== undefined) {
      const { error: delError } = await supabaseAdmin
        .from('social_proof_products')
        .delete()
        .eq('social_proof_id', id);
      if (delError) throw delError;

      if (updates.productIds.length > 0) {
        const junctionRows = updates.productIds.map(productId => ({
          social_proof_id: id,
          product_id: productId
        }));
        const { error: insError } = await supabaseAdmin
          .from('social_proof_products')
          .insert(junctionRows);
        if (insError) throw insError;
      }
    }

    (revalidateTag as any)('social_proof');

    const { data: refreshed } = await supabaseAdmin
      .from('social_proof')
      .select('*')
      .eq('id', id)
      .single();
    const [fullProof] = await attachLinkedProducts([mapSocialProof(refreshed)]);
    return fullProof;
  } catch (error) {
    console.error('[socialProof] updateSocialProof failed:', error);
    throw error;
  }
};

export const deleteSocialProof = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('social_proof')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    (revalidateTag as any)('social_proof');
  } catch (error) {
    console.error('[socialProof] deleteSocialProof failed:', error);
    throw error;
  }
};

export const restoreSocialProof = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('social_proof')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
    (revalidateTag as any)('social_proof');
  } catch (error) {
    console.error('[socialProof] restoreSocialProof failed:', error);
    throw error;
  }
};

export const hardDeleteSocialProof = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('social_proof')
      .delete()
      .eq('id', id);
    if (error) throw error;
    (revalidateTag as any)('social_proof');
  } catch (error) {
    console.error('[socialProof] hardDeleteSocialProof failed:', error);
    throw error;
  }
};

export const getDeletedSocialProofs = async (): Promise<SocialProof[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('social_proof')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSocialProof);
  } catch (error) {
    console.error('[socialProof] getDeletedSocialProofs failed:', error);
    throw error;
  }
};
