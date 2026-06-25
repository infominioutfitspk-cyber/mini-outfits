'use client';

import React, { useEffect, useState } from 'react';
import { Product, StoreSettings } from '@/lib/types';
import ProductCard from './ProductCard';
import { getProductsByIdsClient } from '@/lib/services/products-client';

interface RecentlyViewedProps {
  products?: Product[];
  settings: StoreSettings;
  currentProductId: string;
}

export default function RecentlyViewed({ products, settings, currentProductId }: RecentlyViewedProps) {
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const limit = settings.recently_viewed_limit || 4;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;

    const handleUpdate = async () => {
      try {
        const recentStr = localStorage.getItem('recently-viewed') || '[]';
        const recentIds: string[] = JSON.parse(recentStr);

        // Filter out current product and limit
        const filteredIds = recentIds.filter(id => id !== currentProductId).slice(0, limit);

        if (filteredIds.length === 0) {
          if (active) setRecentProducts([]);
          return;
        }

        let mapped: Product[] = [];
        if (products && products.length > 0) {
          mapped = filteredIds
            .map(id => products.find(p => p.id === id))
            .filter((p): p is Product => !!p);
        } else {
          try {
            const fetched = await getProductsByIdsClient(filteredIds);
            mapped = fetched || [];
          } catch (fetchErr) {
            console.error('Failed to fetch recently viewed products client-side:', fetchErr);
          }
        }

        if (active) {
          setRecentProducts(mapped);
        }
      } catch (err) {
        console.error('Failed to parse recently viewed:', err);
      }
    };

    // Initialize
    handleUpdate();

    // Listen for updates
    window.addEventListener('recently-viewed-updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('recently-viewed-updated', handleUpdate);
    };
  }, [products, currentProductId, limit]);

  if (recentProducts.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 pt-10 animate-fade-in">
      <div className="text-center md:text-left mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Viewed</h3>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
          Products you have recently browsed
        </p>
      </div>
      <div className={`grid ${settings?.card_mobile_columns === 1 ? 'grid-cols-1' : 'grid-cols-2'} md:grid-cols-4 gap-4`}>
        {recentProducts.map(prod => (
          <ProductCard key={prod.id} product={prod} currencySymbol={settings.currencySymbol} settings={settings} />
        ))}
      </div>
    </div>
  );
}
