import React, { Suspense } from 'react';
import TrashConsole from '@/components/admin/TrashConsole';
import { getDeletedProducts } from '@/lib/services/products';
import { getDeletedCategories } from '@/lib/services/categories';
import { getDeletedReviews } from '@/lib/services/reviews';
import { getDeletedOrders } from '@/lib/services/orders';
import { getDeletedCustomers } from '@/lib/services/customers';
import { getDeletedMedia } from '@/lib/services/media';
import { getDeletedWhatsAppSubscribers, getDeletedEmailSubscribers } from '@/lib/services/sections';
import { getDeletedSizeGuides } from '@/lib/services/sizeGuides';
import { getDeletedVariantPresets } from '@/lib/services/variantPresets';

export const revalidate = 0; // Dynamic server rendering

export default async function AdminTrashPage() {
  const [
    products, 
    categories, 
    reviews,
    orders,
    customers,
    media,
    whatsappSubscribers,
    emailSubscribers,
    sizeGuides,
    variantPresets
  ] = await Promise.all([
    getDeletedProducts(),
    getDeletedCategories(),
    getDeletedReviews(),
    getDeletedOrders(),
    getDeletedCustomers(),
    getDeletedMedia(),
    getDeletedWhatsAppSubscribers(),
    getDeletedEmailSubscribers(),
    getDeletedSizeGuides(),
    getDeletedVariantPresets()
  ]);

  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl" />}>
      <TrashConsole 
        initialProducts={products} 
        initialCategories={categories} 
        initialReviews={reviews}
        initialOrders={orders}
        initialCustomers={customers}
        initialMedia={media}
        initialWhatsAppSubscribers={whatsappSubscribers}
        initialEmailSubscribers={emailSubscribers}
        initialSizeGuides={sizeGuides}
        initialVariantPresets={variantPresets}
      />
    </Suspense>
  );
}
