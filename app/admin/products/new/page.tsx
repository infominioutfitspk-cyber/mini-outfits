import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import { getProductById } from '@/lib/services/products';
import { getAllCategories } from '@/lib/services/categories';
import { getSettings } from '@/lib/services/settings';
import type { Product } from '@/lib/types';

export const revalidate = 0; // Dynamic server rendering

interface PageProps {
  searchParams: Promise<{ duplicate?: string }>;
}

export default async function NewProductPage({ searchParams }: PageProps) {
  const { duplicate } = await searchParams;

  const [categories, settings] = await Promise.all([
    getAllCategories(),
    getSettings()
  ]);

  let initialProduct = null;
  let pageTitle = 'Add New Product';
  let pageDesc = 'Create a new product in the shop catalog';

  if (duplicate) {
    const original = await getProductById(duplicate);
    if (original) {
      const { id, createdAt, updatedAt, meta_sync_status, meta_sync_error, meta_last_synced_at, ...rest } = original;
      initialProduct = {
        ...rest,
        id: '',
        slug: `${original.slug}-copy-${Date.now()}`,
        sku: original.sku ? `${original.sku}-copy` : '',
        name: `${original.name} (Copy)`,
        createdAt: '',
        updatedAt: '',
        meta_sync_status: 'pending' as const,
        meta_sync_error: undefined,
        meta_last_synced_at: undefined,
      } as Product;
      pageTitle = `Duplicate: ${original.name}`;
      pageDesc = 'Review and save the duplicated product';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{pageDesc}</p>
        </div>
        <Link
          href="/admin/products"
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-200 text-xs font-bold transition-all hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Products</span>
        </Link>
      </div>
      <ProductForm categories={categories} initialProduct={initialProduct} aiEnabled={settings.ai_enabled} storeUrl={settings.storeUrl || undefined} />
    </div>
  );
}
