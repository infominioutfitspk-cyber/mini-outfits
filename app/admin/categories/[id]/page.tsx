import React from 'react';
import { notFound } from 'next/navigation';
import CategoryDetailManager from '@/components/admin/CategoryDetailManager';
import { getCategoryById } from '@/lib/services/categories';
import { getProducts, getProductsByCategoryId } from '@/lib/services/products';

export const revalidate = 0; // Dynamic server rendering

const SYSTEM_CATEGORY_ID = '00000000-0000-4000-8000-000000000099';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { id } = await params;

  const category = await getCategoryById(id);

  if (!category) {
    notFound();
  }

  // System "Shop" category — fetch ALL products (no category filter)
  const products = id === SYSTEM_CATEGORY_ID
    ? await getProducts()
    : await getProductsByCategoryId(id);

  return (
    <CategoryDetailManager category={category} initialProducts={products} />
  );
}
