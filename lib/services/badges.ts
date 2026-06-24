'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Badge } from '@/lib/types';
import { revalidateTag } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

const mapBadge = (row: any): Badge => ({
  id: row.id,
  name: row.name,
  bgColor: row.bg_color,
  textColor: row.text_color,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getBadges = async (): Promise<Badge[]> => {
  try {
    const { data, error } = await staticSupabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[badges] getBadges table lookup failed:', error.message);
      return [];
    }
    return (data || []).map(mapBadge);
  } catch (error) {
    console.error('[badges] getBadges failed:', error);
    return [];
  }
};

export const createBadge = async (badge: {
  name: string;
  bgColor: string;
  textColor: string;
}): Promise<Badge> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('badges')
    .insert({
      name: badge.name,
      bg_color: badge.bgColor,
      text_color: badge.textColor
    })
    .select()
    .single();

  if (error) throw error;
  (revalidateTag as any)('products');
  return mapBadge(data);
};

export const updateBadge = async (
  id: string,
  badge: {
    name: string;
    bgColor: string;
    textColor: string;
  }
): Promise<Badge> => {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('badges')
    .update({
      name: badge.name,
      bg_color: badge.bgColor,
      text_color: badge.textColor
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  (revalidateTag as any)('products');
  return mapBadge(data);
};

export const deleteBadge = async (id: string): Promise<void> => {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('badges')
    .delete()
    .eq('id', id);

  if (error) throw error;
  (revalidateTag as any)('products');
};
