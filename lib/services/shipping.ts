'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ShippingMethod } from '@/lib/types';
import { revalidateTag } from 'next/cache';

export async function getShippingMethods(onlyActive = false): Promise<ShippingMethod[]> {
  const supabase = await createClient();
  let query = supabase
    .from('shipping_methods')
    .select('*')
    .order('sort_order', { ascending: true });

  if (onlyActive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getShippingMethods failed:', error);
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    cost: Number(row.cost),
    estimatedDays: row.estimated_days,
    active: row.active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at
  }));
}

export async function createShippingMethod(data: {
  name: string;
  cost: number;
  estimatedDays?: string;
  active?: boolean;
  sortOrder?: number;
}): Promise<ShippingMethod> {
  const supabase = await createClient();

  // Auto-assign next sort_order if not provided
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const { data: maxRow } = await supabase
      .from('shipping_methods')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (maxRow?.sort_order ?? 0) + 1;
  }

  const { data: row, error } = await supabase
    .from('shipping_methods')
    .insert([{
      name: data.name,
      cost: data.cost,
      estimated_days: data.estimatedDays,
      active: data.active ?? true,
      sort_order: sortOrder
    }])
    .select()
    .single();

  if (error) {
    console.error('createShippingMethod failed:', error);
    throw error;
  }

  (revalidateTag as any)('shipping_methods');
  return {
    id: row.id,
    name: row.name,
    cost: Number(row.cost),
    estimatedDays: row.estimated_days,
    active: row.active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at
  };
}

export async function updateShippingMethod(
  id: string,
  data: Partial<Omit<ShippingMethod, 'id' | 'createdAt'>>
): Promise<ShippingMethod> {
  const supabase = await createClient();
  
  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.cost !== undefined) updatePayload.cost = data.cost;
  if (data.estimatedDays !== undefined) updatePayload.estimated_days = data.estimatedDays;
  if (data.active !== undefined) updatePayload.active = data.active;
  if (data.sortOrder !== undefined) updatePayload.sort_order = data.sortOrder;

  const { data: row, error } = await supabase
    .from('shipping_methods')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateShippingMethod failed:', error);
    throw error;
  }

  (revalidateTag as any)('shipping_methods');
  return {
    id: row.id,
    name: row.name,
    cost: Number(row.cost),
    estimatedDays: row.estimated_days,
    active: row.active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at
  };
}

export async function reorderShippingMethods(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabaseAdmin
      .from('shipping_methods')
      .update({ sort_order: i })
      .eq('id', orderedIds[i]);
    if (error) {
      console.error('reorderShippingMethods failed:', error);
      throw error;
    }
  }
  (revalidateTag as any)('shipping_methods');
}

export async function deleteShippingMethod(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('shipping_methods')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteShippingMethod failed:', error);
    throw error;
  }

  (revalidateTag as any)('shipping_methods');
}
