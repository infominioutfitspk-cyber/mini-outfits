import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import { getProductById } from '@/lib/services/products';
import { getAllCategories } from '@/lib/services/categories';
import { getSettings } from '@/lib/services/settings';
import { getClientSiteUrl } from '@/lib/site-url';

export const revalidate = 0; // Dynamic server rendering

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  
  const [product, categories, settings] = await Promise.all([
    getProductById(id),
    getAllCategories(),
    getSettings()
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Product</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Update product details, variants and custom modifiers</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-200 text-xs font-bold transition-all hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Link>
          <a
            href={`${getClientSiteUrl(settings)}/product/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all hover:bg-blue-100 dark:hover:bg-blue-500/20 shadow-sm cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Storefront</span>
          </a>
        </div>
      </div>
      <ProductForm categories={categories} initialProduct={product} aiEnabled={settings.ai_enabled} storeUrl={settings.storeUrl || undefined} />
    </div>
  );
}
