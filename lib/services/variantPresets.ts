'use server';

import { createClient } from '@/lib/supabase/server';
import { VariantPreset, VariantPresetValue } from '@/lib/types';

const mapPreset = (row: any): VariantPreset => ({
  id: row.id,
  name: row.name,
  attribute: row.attribute,
  values: row.values as VariantPresetValue[],
  createdAt: row.created_at,
  deletedAt: row.deleted_at || null
});

export const getVariantPresets = async (): Promise<VariantPreset[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('variant_presets')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[variantPresets] getVariantPresets:', error.message);
      return [];
    }
    return (data || []).map(mapPreset);
  } catch (error) {
    console.error('[variantPresets] getVariantPresets failed:', error);
    return [];
  }
};

export const createVariantPreset = async (preset: {
  name: string;
  attribute: VariantPreset['attribute'];
  values: VariantPresetValue[];
}): Promise<VariantPreset> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('variant_presets')
    .insert({ name: preset.name, attribute: preset.attribute, values: preset.values })
    .select()
    .single();
  if (error) throw error;
  return mapPreset(data);
};

export const deleteVariantPreset = async (id: string): Promise<void> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('variant_presets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const updateVariantPreset = async (
  id: string,
  preset: {
    name: string;
    attribute: VariantPreset['attribute'];
    values: VariantPresetValue[];
  }
): Promise<VariantPreset> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('variant_presets')
    .update({ name: preset.name, attribute: preset.attribute, values: preset.values })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapPreset(data);
};

export const getDeletedVariantPresets = async (): Promise<VariantPreset[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('variant_presets')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPreset);
  } catch (error) {
    console.error('[variantPresets] getDeletedVariantPresets failed:', error);
    return [];
  }
};

export const restoreVariantPreset = async (id: string): Promise<void> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('variant_presets')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
};

export const hardDeleteVariantPreset = async (id: string): Promise<void> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('variant_presets')
    .delete()
    .eq('id', id);
  if (error) throw error;
};
