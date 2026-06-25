import { bulkSyncProductsToMeta } from '@/lib/meta/syncProduct';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Map database product row to Product interface
const mapProduct = (row: any): any => {
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
    price: row.price ? parseFloat(row.price.toString()) : 0,
    comparePrice: row.compare_price ? parseFloat(row.compare_price.toString()) : undefined,
    categoryId: row.category_id || undefined,
    category,
    stock: row.stock || 0,
    hasVariants: row.has_variants ?? false,
    isService: row.is_service ?? false,
    isFeatured: row.is_featured ?? false,
    active: row.active ?? true,
    tags: row.tags ?? [],
    images,
    variants,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authorization (either authenticated admin user session or matching revalidate secret)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const allowedAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isAuthorized = user && (!allowedAdminEmail || user.email === allowedAdminEmail);

    const secret = req.headers.get('x-revalidate-secret');
    const hasValidSecret = secret && secret === process.env.REVALIDATE_SECRET;

    if (!isAuthorized && !hasValidSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { mode = 'all' } = body;

    let productIds: string[] | null = null;

    if (mode === 'failed') {
      // 1. Get all active products from DB
      const { data: activeProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .is('deleted_at', null);

      if (activeProducts && activeProducts.length > 0) {
        const activeIds = activeProducts.map(p => p.id);

        // 2. Fetch all logs for active products
        const { data: logs } = await supabaseAdmin
          .from('meta_sync_log')
          .select('product_id, status, created_at')
          .in('product_id', activeIds)
          .order('created_at', { ascending: true });

        // 3. Map product ID to its latest status
        const latestStatusMap = new Map<string, string>();
        if (logs) {
          logs.forEach(log => {
            latestStatusMap.set(log.product_id, log.status);
          });
        }

        // 4. Products that either have 'error' or no log at all (pending)
        productIds = activeIds.filter(id => {
          const status = latestStatusMap.get(id);
          return !status || status === 'error';
        });

        if (productIds.length === 0) {
          return NextResponse.json({ success: true, message: 'No failed or pending products found.', totalSynced: 0 });
        }
      } else {
        return NextResponse.json({ success: true, message: 'No active products found.', totalSynced: 0 });
      }
    }

    let query = supabaseAdmin
      .from('products')
      .select('*, product_images(*), product_variants(*), categories!category_id(*)');

    if (productIds !== null) {
      query = query.in('id', productIds);
    }

    const { data: rows, error } = await query;

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, message: 'No products found to sync.', totalSynced: 0 });
    }

    const products = rows.map(mapProduct);

    console.log(`[MetaSync API] Bulk syncing ${products.length} products (mode: ${mode}).`);
    const result = await bulkSyncProductsToMeta(products, 'UPDATE');

    return NextResponse.json({
      success: result.success,
      totalSynced: result.totalSynced,
      errors: result.errors
    });
  } catch (err: any) {
    console.error('[MetaSync API] Bulk sync route error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
