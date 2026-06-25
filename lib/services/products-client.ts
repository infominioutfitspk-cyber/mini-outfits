import { createClient } from '@/lib/supabase/client';
import { Product } from '@/lib/types';

const mapClientProduct = (row: any): Product => {
  const images = (row.product_images ?? []).map((img: any) => ({
    id: img.id,
    productId: img.product_id,
    url: img.url,
    alt: img.alt || undefined,
    sortOrder: img.sort_order || 0,
    isPrimary: img.is_primary ?? false,
    createdAt: img.created_at
  })).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const variants = (row.product_variants ?? []).map((v: any) => ({
    id: v.id,
    productId: v.product_id,
    color: v.color || undefined,
    size: v.size || undefined,
    material: v.material || undefined,
    customOption: v.custom_option || undefined,
    customValue: v.custom_value || undefined,
    colorHex: v.color_hex || undefined,
    price: v.price ? parseFloat(v.price.toString()) : undefined,
    comparePrice: v.compare_price ? parseFloat(v.compare_price.toString()) : undefined,
    stock: v.stock || 0,
    sku: v.sku || undefined,
    imageUrl: v.image_url || undefined,
    active: v.active ?? true,
    sortOrder: v.sort_order || 0
  })).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const category = row.categories ? {
    id: row.categories.id,
    name: row.categories.name,
    slug: row.categories.slug,
    description: row.categories.description || undefined,
    imageUrl: row.categories.image_url || undefined,
    sortOrder: row.categories.sort_order || 0,
    active: row.categories.active ?? true,
    createdAt: row.categories.created_at,
    updatedAt: row.categories.updated_at
  } : undefined;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    shortDescription: row.short_description || undefined,
    price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
    comparePrice: row.compare_price ? parseFloat(row.compare_price.toString()) : undefined,
    cost: row.cost ? parseFloat(row.cost.toString()) : undefined,
    sku: row.sku || undefined,
    categoryId: row.category_id || undefined,
    category,
    stock: row.stock || 0,
    hasVariants: row.has_variants ?? false,
    isService: row.is_service ?? false,
    isFeatured: row.is_featured ?? false,
    enableSwatches: row.enable_swatches ?? true,
    showSwatchesOnArchive: row.show_swatches_on_archive ?? true,
    customBadgeId: row.custom_badge_id || undefined,
    badgeEnabled: row.badge_enabled ?? true,
    tags: row.tags || [],
    images,
    variants,
    modifiers: [],
    rating: row.rating ? parseFloat(row.rating.toString()) : undefined,
    reviewsCount: row.reviews_count || 0,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export const getProductsClient = async (categoryId?: string): Promise<Product[]> => {
  try {
    const supabase = createClient();
    let query = supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), categories!category_id(*)')
      .is('deleted_at', null);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data ?? []).map(mapClientProduct);
  } catch (error) {
    console.error('[products-client] getProductsClient failed:', error);
    throw error;
  }
};

export const getProductsByIdsClient = async (ids: string[]): Promise<Product[]> => {
  if (!ids || ids.length === 0) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), categories!category_id(*)')
      .is('deleted_at', null)
      .in('id', ids);

    if (error) throw error;
    
    const productsMap = (data ?? []).map(mapClientProduct);
    
    // Maintain requested order of IDs
    return ids
      .map(id => productsMap.find(p => p.id === id))
      .filter((p): p is Product => !!p);
  } catch (error) {
    console.error('[products-client] getProductsByIdsClient failed:', error);
    throw error;
  }
};

export const getDeletedProductsClient = async (): Promise<Product[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), categories!category_id(*)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapClientProduct);
  } catch (error) {
    console.error('[products-client] getDeletedProductsClient failed:', error);
    throw error;
  }
};

export const restoreProductClient = async (id: string): Promise<void> => {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[products-client] restoreProductClient failed:', error);
    throw error;
  }
};

export const hardDeleteProductClient = async (id: string): Promise<void> => {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[products-client] hardDeleteProductClient failed:', error);
    throw error;
  }
};
