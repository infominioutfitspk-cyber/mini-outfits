'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';

// Products bulk
export async function bulkRestoreProducts(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: null })
      .in('id', ids);
    if (error) throw error;
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[trash] bulkRestoreProducts failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteProducts(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', ids);
    if (error) throw error;
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[trash] bulkHardDeleteProducts failed:', error);
    throw error;
  }
}

// Categories bulk
export async function bulkRestoreCategories(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: null })
      .in('id', ids);
    if (error) throw error;
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[trash] bulkRestoreCategories failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteCategories(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('categories')
      .delete()
      .in('id', ids);
    if (error) throw error;
    (revalidateTag as any)('categories');
  } catch (error) {
    console.error('[trash] bulkHardDeleteCategories failed:', error);
    throw error;
  }
}

// Reviews bulk
export async function bulkRestoreReviews(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .update({ deleted_at: null })
      .in('id', ids);
    if (error) throw error;
    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[trash] bulkRestoreReviews failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteReviews(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('reviews')
      .delete()
      .in('id', ids);
    if (error) throw error;
    (revalidateTag as any)('reviews');
    (revalidateTag as any)('products');
  } catch (error) {
    console.error('[trash] bulkHardDeleteReviews failed:', error);
    throw error;
  }
}

// Orders bulk
export async function bulkRestoreOrders(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: null })
      .in('id', ids);
    if (error) throw error;
  } catch (error) {
    console.error('[trash] bulkRestoreOrders failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteOrders(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', ids);
    if (error) throw error;
  } catch (error) {
    console.error('[trash] bulkHardDeleteOrders failed:', error);
    throw error;
  }
}

// Customers bulk
export async function bulkRestoreCustomers(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: null })
      .in('id', ids);
    if (error) throw error;
  } catch (error) {
    console.error('[trash] bulkRestoreCustomers failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteCustomers(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('customers')
      .delete()
      .in('id', ids);
    if (error) throw error;
  } catch (error) {
    console.error('[trash] bulkHardDeleteCustomers failed:', error);
    throw error;
  }
}

// Media bulk
export async function bulkRestoreMedia(ids: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('media_library')
      .update({ deleted_at: null })
      .in('id', ids);
    if (error) throw error;
  } catch (error) {
    console.error('[trash] bulkRestoreMedia failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteMedia(mediaItems: { id: string; url: string }[]): Promise<void> {
  try {
    const supabase = await createClient();
    const ids = mediaItems.map(m => m.id);
    
    // 1. Delete from database
    const { error: dbError } = await supabase
      .from('media_library')
      .delete()
      .in('id', ids);
    if (dbError) throw dbError;

    // 2. Delete files from storage
    for (const m of mediaItems) {
      const filename = m.url.split('/').pop();
      if (filename) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('product-images')
          .remove([filename]);
        if (storageError) {
          console.warn('[trash-service] Storage file failed to delete:', storageError);
        }
      }
    }
  } catch (error) {
    console.error('[trash] bulkHardDeleteMedia failed:', error);
    throw error;
  }
}

// Leads bulk (WhatsApp and Email)
export async function bulkRestoreLeads(whatsappIds: string[], emailIds: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    if (whatsappIds.length > 0) {
      const { error } = await supabase
        .from('whatsapp_subscribers')
        .update({ deleted_at: null })
        .in('id', whatsappIds);
      if (error) throw error;
    }
    if (emailIds.length > 0) {
      const { error } = await supabase
        .from('email_subscribers')
        .update({ deleted_at: null })
        .in('id', emailIds);
      if (error) throw error;
    }
  } catch (error) {
    console.error('[trash] bulkRestoreLeads failed:', error);
    throw error;
  }
}

export async function bulkHardDeleteLeads(whatsappIds: string[], emailIds: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    if (whatsappIds.length > 0) {
      const { error } = await supabase
        .from('whatsapp_subscribers')
        .delete()
        .in('id', whatsappIds);
      if (error) throw error;
    }
    if (emailIds.length > 0) {
      const { error } = await supabase
        .from('email_subscribers')
        .delete()
        .in('id', emailIds);
      if (error) throw error;
    }
  } catch (error) {
    console.error('[trash] bulkHardDeleteLeads failed:', error);
    throw error;
  }
}

// Size Guides bulk
export async function bulkRestoreSizeGuides(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('size_guides').update({ deleted_at: null }).in('id', ids);
  if (error) throw error;
  (revalidateTag as any)('size_guides');
}

export async function bulkHardDeleteSizeGuides(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('size_guides').delete().in('id', ids);
  if (error) throw error;
  (revalidateTag as any)('size_guides');
}

// Variant Presets bulk
export async function bulkRestoreVariantPresets(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('variant_presets').update({ deleted_at: null }).in('id', ids);
  if (error) throw error;
}

export async function bulkHardDeleteVariantPresets(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('variant_presets').delete().in('id', ids);
  if (error) throw error;
}
