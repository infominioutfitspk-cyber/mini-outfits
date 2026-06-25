'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SlidersHorizontal, Grid3X3, Grid2X2, List, X, Heart, Star, ShoppingCart, ChevronDown, ChevronUp } from '@/components/common/Icons';
import { Product, Category, StoreSettings } from '@/lib/types';
import ProductCard from './ProductCard';
import EmptyState from '../common/EmptyState';
import { formatPrice } from '@/lib/utils/whatsapp';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/trackEvent';
import { animateFlyTo } from '@/lib/utils/flyAnimation';
import { useScrollRestoration } from '@/lib/hooks/useScrollRestoration';
import { useSettings } from '@/lib/hooks/useSettings';

interface ShopPageProps {
  initialProducts: Product[];
  categories: Category[];
  settings: StoreSettings;
  isPreview?: boolean;
}

interface ShopProductListCardProps {
  product: Product;
  settings: StoreSettings;
  addItem: (product: Product, selectedVariant: any, selectedModifiers: any[], quantity: number) => void;
}

function ShopProductListCard({ product, settings, addItem }: ShopProductListCardProps) {
  const fallbackPlaceholder = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3C/svg%3E";
  const primaryImage = product.images.find(img => img.isPrimary)?.url || product.images[0]?.url || fallbackPlaceholder;
  const activeVariants = product.variants.filter(v => v.active);
  const defaultIndex = (settings?.defaultVariantIndex || 1) - 1;
  const defaultVar = activeVariants[defaultIndex] || activeVariants[0];
  const initialImage = (defaultVar && defaultVar.imageUrl) || primaryImage;
  const initialPrice = (defaultVar && defaultVar.price) ? defaultVar.price : product.price;
  const initialComparePrice = (defaultVar && defaultVar.comparePrice) ? defaultVar.comparePrice : product.comparePrice;

  // Check wishlist
  const [inWish, setInWish] = useState(false);
  useEffect(() => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setInWish(wishlist.includes(product.id));
  }, [product.id]);

  const handleWishClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let newW;
    if (inWish) {
      newW = wishlist.filter((id: string) => id !== product.id);
      toast.success('Removed from wishlist');
    } else {
      newW = [...wishlist, product.id];
      toast.success('Added to wishlist');

      // Trigger fly animation
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const targetId = isMobile ? 'mobile-bottom-wishlist-icon' : 'header-wishlist-icon-desktop';
      animateFlyTo(e.currentTarget as HTMLElement, targetId, primaryImage);
    }
    localStorage.setItem('wishlist', JSON.stringify(newW));
    setInWish(!inWish);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-row overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] shadow-sm hover:shadow-md transition-all duration-300 relative"
    >
      {/* Left: Image Container */}
      <div className="relative w-36 h-36 sm:w-48 sm:h-48 shrink-0 overflow-hidden bg-gray-50">
        <Image
          src={initialImage}
          alt={product.name}
          fill
          sizes="200px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"

        />
        {/* Badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {initialComparePrice && initialComparePrice > initialPrice && (
            <span className="rounded-md bg-[#e94560] px-2 py-0.5 text-[9px] font-extrabold text-white tracking-wide shadow-sm animate-none">
              -{Math.round(((initialComparePrice - initialPrice) / initialComparePrice) * 100)}%
            </span>
          )}
          {product.isFeatured && (
            <span className="rounded-md bg-[#10b981] px-2 py-0.5 text-[9px] font-extrabold text-white tracking-wide shadow-sm">
              FEATURED
            </span>
          )}
        </div>
      </div>

      {/* Right: Info container */}
      <div className="flex-1 p-3 sm:p-5 flex flex-col justify-between">
        <div className="space-y-1 sm:space-y-2">
          <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-[#e94560] transition-colors line-clamp-2">
            {product.name}
          </h4>

          {/* Stars */}
          <div className="flex items-center gap-0.5 text-xs text-amber-400">
            {Array.from({ length: 5 }).map((_, idx) => (
              <svg
                key={idx}
                className={`h-3 w-3 ${idx < Math.round(product.rating || 5)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 dark:text-gray-600'
                  }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-[10px] text-gray-400 font-semibold ml-1">
              ({product.reviewsCount || 0})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-base sm:text-lg font-bold text-[#1a1a2e] dark:text-white">
              {formatPrice(initialPrice, settings.currencySymbol)}
            </span>
            {initialComparePrice && initialComparePrice > initialPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(initialComparePrice, settings.currencySymbol)}
              </span>
            )}
          </div>

          {/* Description (desktop only) */}
          {product.shortDescription && (
            <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-2 pt-1">
              {product.shortDescription}
            </p>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {/* Wishlist and Quick buy */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWishClick}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#e94560] transition-all cursor-pointer"
            >
              <Heart className={`h-4.5 w-4.5 ${inWish ? 'fill-red-500 text-red-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (product.hasVariants) {
                  window.location.href = `/product/${product.slug}`;
                  return;
                }
                addItem(product, undefined, [], 1);
                toast.success(`${product.name} added to cart!`);

                // Trigger fly animation
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const targetId = isMobile ? 'header-cart-icon-mobile' : 'header-cart-icon-desktop';
                animateFlyTo(e.currentTarget as HTMLElement, targetId, primaryImage);
              }}
              className="flex h-9 items-center gap-1.5 px-4 rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] text-white hover:opacity-90 active:scale-95 text-xs font-bold transition-all cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{product.hasVariants ? 'Choose Options' : 'Buy Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ShopPage({
  initialProducts,
  categories,
  settings,
  isPreview = false
}: ShopPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const addItem = useCartStore((state) => state.addItem);

  // Read URL query parameters
  const urlCategorySlug = searchParams.get('category') || undefined;
  const urlSearchQuery = searchParams.get('search') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const PAGE_SIZE = 12;

  // Calculate matching category ID from slug
  const SYSTEM_CATEGORY_ID = '00000000-0000-4000-8000-000000000099';

  // Filter out system "Shop" category from user-facing list
  const displayCategories = useMemo(() => {
    return categories.filter(c => c.id !== SYSTEM_CATEGORY_ID);
  }, [categories]);

  const activeCategory = useMemo(() => {
    if (!urlCategorySlug) return undefined;
    if (urlCategorySlug === 'shop') return undefined;
    return displayCategories.find(c => c.slug === urlCategorySlug);
  }, [urlCategorySlug, displayCategories]);

  // States
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(activeCategory?.id);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const defaultSort = activeCategory?.activeSortPreference || (categories.find(c => c.id === SYSTEM_CATEGORY_ID)?.activeSortPreference) || 'manual';
  const [sortBy, setSortBy] = useState<string>(defaultSort);
  const [viewMode, setViewMode] = useState<'grid-3' | 'grid-4' | 'list'>('grid-4');
  // Live settings: SSR value shown immediately, overridden by fresh DB fetch on mount
  const { settings: liveSettings } = useSettings(settings);
  const activeSettings = isPreview ? settings : (liveSettings ?? settings);

  useScrollRestoration();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Availability Filters
  const [availability, setAvailability] = useState({
    onSale: false,
    inStock: false,
    outStock: false
  });

  // Calculate global min and max prices to initialize inputs
  const priceLimits = useMemo(() => {
    if (initialProducts.length === 0) return { min: 0, max: 10000 };
    const prices = initialProducts.map(p => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [initialProducts]);

  const [priceMin, setPriceMin] = useState<number>(priceLimits.min);
  const [priceMax, setPriceMax] = useState<number>(priceLimits.max);

  // Dynamic extraction of active/used variants (Colors, Sizes, Materials) from the active catalog products
  const usedVariants = useMemo(() => {
    const colorsSet = new Set<string>();
    const sizesSet = new Set<string>();
    const materialsSet = new Set<string>();
    const colorToHex: Record<string, string> = {};

    initialProducts.forEach(product => {
      product.variants?.forEach(variant => {
        if (!variant.active) return;

        if (variant.color) {
          const colorName = variant.color.trim();
          if (colorName) {
            colorsSet.add(colorName);
            if (variant.colorHex) {
              colorToHex[colorName] = variant.colorHex;
            }
          }
        }

        if (variant.size) {
          const sizeName = variant.size.trim();
          if (sizeName) {
            sizesSet.add(sizeName);
          }
        }

        if (variant.material) {
          const materialName = variant.material.trim();
          if (materialName) {
            materialsSet.add(materialName);
          }
        }
      });
    });

    return {
      colors: Array.from(colorsSet).sort(),
      sizes: Array.from(sizesSet).sort(),
      materials: Array.from(materialsSet).sort(),
      colorToHex
    };
  }, [initialProducts]);

  // Variant Filter States
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  // Expansion States for Variant Filters (View More)
  const [showAllColors, setShowAllColors] = useState(false);
  const [showAllSizes, setShowAllSizes] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);

  // Update states if price limits change or URL changes
  useEffect(() => {
    setPriceMin(priceLimits.min);
    setPriceMax(priceLimits.max);
  }, [priceLimits]);

  useEffect(() => {
    if (!urlCategorySlug || urlCategorySlug === 'shop') {
      setSelectedCategoryId(undefined);
    } else {
      const cat = displayCategories.find(c => c.slug === urlCategorySlug);
      setSelectedCategoryId(cat?.id);
    }
  }, [urlCategorySlug, displayCategories]);

  // Sync sort dropdown to active category's admin-configured preference
  useEffect(() => {
    const preference = activeCategory?.activeSortPreference || (categories.find(c => c.id === SYSTEM_CATEGORY_ID)?.activeSortPreference) || 'manual';
    setSortBy(preference);
  }, [activeCategory, categories]);

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
    if (urlSearchQuery) {
      trackEvent('Search', {
        search_string: urlSearchQuery
      });
    }
  }, [urlSearchQuery]);

  // Sync URL parameters when category or search changes
  const handleCategorySelect = (categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId);
    const slug = categoryId ? displayCategories.find(c => c.id === categoryId)?.slug : undefined;

    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Pre-calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialProducts.forEach(product => {
      const categoryIds = new Set<string>();
      if (product.categoryId) categoryIds.add(product.categoryId);
      product.productCategories?.forEach(pc => {
        categoryIds.add(pc.categoryId);
      });
      categoryIds.forEach(cid => {
        counts[cid] = (counts[cid] || 0) + 1;
      });
    });
    return counts;
  }, [initialProducts]);

  // Get Featured Products list
  const featuredProducts = useMemo(() => {
    return initialProducts.filter(p => p.isFeatured).slice(0, 3);
  }, [initialProducts]);

  // Handle Quick Add to Cart for Featured Products
  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      window.location.href = `/product/${product.slug}`;
      return;
    }
    addItem(product, undefined, [], 1);
    toast.success(`${product.name} added to cart!`);

    // Trigger fly animation
    const img = product.images.find(img => img.isPrimary)?.url || product.images[0]?.url;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const targetId = isMobile ? 'header-cart-icon-mobile' : 'header-cart-icon-desktop';
    animateFlyTo(e.currentTarget as HTMLElement, targetId, img);
  };

  // Double slider ref
  const sliderRef = useRef<HTMLInputElement>(null);

  // Filter products client-side
  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    // Category filter
    if (selectedCategoryId) {
      list = list.filter(p =>
        p.categoryId === selectedCategoryId ||
        p.productCategories?.some(pc => pc.categoryId === selectedCategoryId)
      );
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(product => {
        return (
          product.name.toLowerCase().includes(q) ||
          (product.description && product.description.toLowerCase().includes(q)) ||
          (product.shortDescription && product.shortDescription.toLowerCase().includes(q)) ||
          (product.sku && product.sku.toLowerCase().includes(q)) ||
          (product.tags && product.tags.some(t => t.toLowerCase().includes(q))) ||
          (product.category?.name && product.category.name.toLowerCase().includes(q)) ||
          (product.variants && product.variants.some(v =>
            v.active && (
              (v.color && v.color.toLowerCase().includes(q)) ||
              (v.size && v.size.toLowerCase().includes(q)) ||
              (v.material && v.material.toLowerCase().includes(q)) ||
              (v.sku && v.sku.toLowerCase().includes(q))
            )
          ))
        );
      });
    }

    // Availability Filter
    if (availability.onSale || availability.inStock || availability.outStock) {
      list = list.filter(product => {
        const isOnSale = product.comparePrice && product.comparePrice > product.price;
        const isInStock = product.stock > 0;

        if (availability.onSale && !isOnSale) return false;
        if (availability.inStock && !isInStock) return false;
        if (availability.outStock && isInStock) return false;

        return true;
      });
    }

    // Price Filter
    list = list.filter(p => p.price >= priceMin && p.price <= priceMax);

    // Color filter
    if (selectedColors.length > 0) {
      list = list.filter(product =>
        product.variants?.some(v => v.active && v.color && selectedColors.includes(v.color.trim()))
      );
    }

    // Size filter
    if (selectedSizes.length > 0) {
      list = list.filter(product =>
        product.variants?.some(v => v.active && v.size && selectedSizes.includes(v.size.trim()))
      );
    }

    // Material filter
    if (selectedMaterials.length > 0) {
      list = list.filter(product =>
        product.variants?.some(v => v.active && v.material && selectedMaterials.includes(v.material.trim()))
      );
    }

    // Sorting
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'alpha_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'alpha_desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    return list;
  }, [initialProducts, selectedCategoryId, searchQuery, availability, priceMin, priceMax, sortBy, selectedColors, selectedSizes, selectedMaterials]);

  const [loadMoreLimit, setLoadMoreLimit] = useState(() => Math.max(PAGE_SIZE, (isNaN(urlPage) ? 1 : urlPage) * PAGE_SIZE));

  const displayProducts = useMemo(() => {
    return filteredProducts.slice(0, loadMoreLimit);
  }, [filteredProducts, loadMoreLimit]);

  const totalResults = filteredProducts.length;
  const hasMore = displayProducts.length < totalResults;
  const currentPage = Math.ceil(displayProducts.length / PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => {
    setLoadMoreLimit(PAGE_SIZE);
  }, [selectedCategoryId, searchQuery, sortBy, availability.onSale, availability.inStock, availability.outStock, priceMin, priceMax, selectedColors.join(','), selectedSizes.join(','), selectedMaterials.join(',')]);

  // Sync loadMoreLimit when URL page param changes (browser nav)
  useEffect(() => {
    const page = isNaN(urlPage) ? 1 : Math.max(1, urlPage);
    setLoadMoreLimit(page * PAGE_SIZE);
  }, [urlPage]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    } else {
      params.delete('page');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setLoadMoreLimit(nextPage * PAGE_SIZE);
  };

  // Reset Filters helper
  const handleClearFilters = () => {
    setSelectedCategoryId(undefined);
    setSearchQuery('');
    setAvailability({ onSale: false, inStock: false, outStock: false });
    setPriceMin(priceLimits.min);
    setPriceMax(priceLimits.max);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedMaterials([]);
    setShowAllColors(false);
    setShowAllSizes(false);
    setShowAllMaterials(false);
    router.replace(pathname);
  };



  // Render Filters Container Content (reused on Desktop Sidebar & Mobile Drawer)
  const renderFiltersContent = () => (
    <div className="space-y-6">
      {/* Category List Accordion */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Products Category</span>
        <div className="space-y-1.5 md:max-h-60 md:overflow-y-auto pr-1">
          <button
            onClick={() => handleCategorySelect(undefined)}
            className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${selectedCategoryId === undefined
                ? 'bg-[#e94560] text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
          >
            <span>Shop</span>
            <span className={selectedCategoryId === undefined ? 'text-white/80' : 'text-gray-400'}>
              ({initialProducts.length})
            </span>
          </button>

          {displayCategories.map((category) => {
            const count = categoryCounts[category.id] || 0;
            const isSelected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${isSelected
                    ? 'bg-[#e94560] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
              >
                <span className="truncate pr-2">{category.name}</span>
                <span className={isSelected ? 'text-white/80' : 'text-gray-400'}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Availability check boxes */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Availability</span>
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={availability.onSale}
              onChange={(e) => setAvailability(prev => ({ ...prev, onSale: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span>On sale</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={availability.inStock}
              onChange={(e) => setAvailability(prev => ({ ...prev, inStock: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span>In stock</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={availability.outStock}
              onChange={(e) => setAvailability(prev => ({ ...prev, outStock: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span>Out of stock</span>
          </label>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Price filter double range & inputs */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Price Range</span>

        {/* Min/Max Text inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Min Price</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Rs</span>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPriceMin(val >= 0 ? val : 0);
                }}
                className="w-full pl-7 pr-2 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Max Price</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Rs</span>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPriceMax(val >= 0 ? val : 0);
                }}
                className="w-full pl-7 pr-2 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-900 focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Double Range Slider UI */}
        <div className="pt-3 px-1">
          <input
            ref={sliderRef}
            type="range"
            min={priceLimits.min}
            max={priceLimits.max}
            value={priceMax}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= priceMin) {
                setPriceMax(val);
              }
            }}
            className="w-full accent-[#e94560] h-1 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer appearance-none"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mt-1.5 uppercase">
            <span>Price: {formatPrice(priceMin, settings.currencySymbol)} — {formatPrice(priceMax, settings.currencySymbol)}</span>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Colors Filter */}
      {usedVariants.colors.length > 0 && (
        <>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Colors</span>
            <div className="flex flex-wrap gap-2">
              {(showAllColors ? usedVariants.colors : usedVariants.colors.slice(0, 4)).map(color => {
                const isSelected = selectedColors.includes(color);
                const hex = usedVariants.colorToHex[color];
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setSelectedColors(prev =>
                        prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
                      );
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[38px] ${isSelected
                        ? 'border-[#e94560] bg-[#e94560]/10 text-[#e94560] dark:text-[#e94560]'
                        : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                  >
                    {hex ? (
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-gray-400 to-gray-200 shrink-0" />
                    )}
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
            {usedVariants.colors.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllColors(!showAllColors)}
                className="text-[10px] font-black text-[#e94560] uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                {showAllColors ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>View Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>View More ({usedVariants.colors.length - 4})</span>
                  </>
                )}
              </button>
            )}
          </div>
          <hr className="border-gray-200 dark:border-gray-800" />
        </>
      )}

      {/* Sizes Filter */}
      {usedVariants.sizes.length > 0 && (
        <>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Sizes</span>
            <div className="flex flex-wrap gap-2">
              {(showAllSizes ? usedVariants.sizes : usedVariants.sizes.slice(0, 6)).map(size => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setSelectedSizes(prev =>
                        prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                      );
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer min-w-[38px] min-h-[38px] text-center ${isSelected
                        ? 'border-[#e94560] bg-[#e94560]/10 text-[#e94560]'
                        : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {usedVariants.sizes.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllSizes(!showAllSizes)}
                className="text-[10px] font-black text-[#e94560] uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                {showAllSizes ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>View Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>View More ({usedVariants.sizes.length - 6})</span>
                  </>
                )}
              </button>
            )}
          </div>
          <hr className="border-gray-200 dark:border-gray-800" />
        </>
      )}

      {/* Materials Filter */}
      {usedVariants.materials.length > 0 && (
        <>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Materials</span>
            <div className="flex flex-wrap gap-2">
              {(showAllMaterials ? usedVariants.materials : usedVariants.materials.slice(0, 4)).map(material => {
                const isSelected = selectedMaterials.includes(material);
                return (
                  <button
                    key={material}
                    type="button"
                    onClick={() => {
                      setSelectedMaterials(prev =>
                        prev.includes(material) ? prev.filter(m => m !== material) : [...prev, material]
                      );
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[38px] ${isSelected
                        ? 'border-[#e94560] bg-[#e94560]/10 text-[#e94560]'
                        : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                  >
                    {material}
                  </button>
                );
              })}
            </div>
            {usedVariants.materials.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllMaterials(!showAllMaterials)}
                className="text-[10px] font-black text-[#e94560] uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                {showAllMaterials ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>View Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>View More ({usedVariants.materials.length - 4})</span>
                  </>
                )}
              </button>
            )}
          </div>
          <hr className="border-gray-200 dark:border-gray-800" />
        </>
      )}

      {/* Featured Products visual mini sidebar items */}
      {featuredProducts.length > 0 && (
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Featured Products</span>
          <div className="space-y-3.5">
            {featuredProducts.map((p) => {
              const img = p.images.find(img => img.isPrimary)?.url || p.images[0]?.url;
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="flex gap-3 group relative cursor-pointer"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 shrink-0">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        sizes="56px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"

                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h5 className="text-xs font-bold text-gray-800 dark:text-white truncate group-hover:text-[#e94560] transition-colors">{p.name}</h5>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-400 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-2.5 w-2.5 ${i < Math.round(p.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    <div className="mt-1 text-xs font-black text-gray-900 dark:text-white">
                      {formatPrice(p.price, settings.currencySymbol)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 transition-colors duration-200">

      {/* Breadcrumbs */}
      <div className="text-center md:text-left text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
        <Link href="/" className="hover:text-[#e94560] transition-colors">Home</Link>
        <span className="mx-2">•</span>
        <Link href="/shop" className="hover:text-[#e94560] transition-colors">Shop</Link>
        {activeCategory && (
          <>
            <span className="mx-2">•</span>
            <span className="text-[#e94560] dark:text-[#e94560] font-bold">{activeCategory.name}</span>
          </>
        )}
      </div>

      {/* Page Header / Category Banner */}
      {activeCategory ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#16162a] dark:to-[#1a1a2e] mb-6 shadow-sm transition-all duration-200">
          {activeCategory.imageUrl && (
            <div className="absolute inset-0 z-0">
              <Image
                src={activeCategory.imageUrl}
                alt={activeCategory.name}
                fill
                sizes="100vw"
                className="object-cover blur-[1px]"
                style={{ opacity: 0.12 }}

              />
              <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-white/95 via-white/80 to-transparent dark:from-[#16162a]/95 dark:via-[#16162a]/80 dark:to-transparent" />
            </div>
          )}
          <div className="relative z-10 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e94560]">Category</span>
              <h1 className="text-2xl md:text-3xl font-black font-heading text-[var(--color-text-heading)] leading-tight">
                {activeCategory.name}
              </h1>
              {activeCategory.description && (
                <div
                  className="text-xs md:text-sm leading-relaxed max-w-none font-body text-[var(--color-text-secondary)] font-semibold [&_p]:m-0 [&_p]:text-[var(--color-text-secondary)] [&_p]:font-body"
                  dangerouslySetInnerHTML={{ __html: activeCategory.description }}
                />
              )}
            </div>
            {activeCategory.imageUrl && (
              <div className="relative h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm shrink-0 self-start sm:self-center">
                <Image
                  src={activeCategory.imageUrl}
                  alt={activeCategory.name}
                  fill
                  sizes="(max-width: 768px) 80px, 96px"
                  className="object-cover animate-fade-in"

                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <h1 className="text-center md:text-left text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-6">
          Shop All Products
        </h1>
      )}

      {/* Main Grid: Sidebar + List Content */}
      <div className="flex flex-col md:flex-row gap-8">

        {/* Left Sidebar (Desktop only) */}
        <aside className="hidden md:block w-64 shrink-0 bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm self-start sticky top-24 transition-colors">
          {renderFiltersContent()}
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 space-y-4">

          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#16162a] p-4 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm transition-colors">

            {/* Filter Toggle (mobile only) & Count */}
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="md:hidden flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filter</span>
              </button>

              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Showing {displayProducts.length} of {totalResults} results
              </span>
            </div>

            {/* Layout switchers & Sorting */}
            <div className="flex items-center justify-between sm:justify-end gap-4">

              {/* Layout view controls */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 shrink-0">
                {/* Mobile View Switches */}
                <button
                  onClick={() => setViewMode('grid-3')}
                  className={`md:hidden p-1.5 rounded-lg transition-all ${viewMode === 'grid-3' ? 'bg-white dark:bg-[#16162a] text-[#e94560] shadow-sm' : 'text-gray-400 hover:text-gray-650'
                    }`}
                  title="3 Columns Grid"
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>

                {/* Desktop Grid-3 Switcher */}
                <button
                  onClick={() => setViewMode('grid-3')}
                  className={`hidden md:block p-1.5 rounded-lg transition-all ${viewMode === 'grid-3' ? 'bg-white dark:bg-[#16162a] text-[#e94560] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                    }`}
                  title="3 Columns Layout"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setViewMode('grid-4')}
                  className={`hidden md:block p-1.5 rounded-lg transition-all ${viewMode === 'grid-4' ? 'bg-white dark:bg-[#16162a] text-[#e94560] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                    }`}
                  title="4 Columns Layout"
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#16162a] text-[#e94560] shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                    }`}
                  title="List Layout"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Sorting Selection Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white shadow-sm"
                >
                  <option value="manual">Manual Order</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="alpha_asc">Alphabetically: A-Z</option>
                  <option value="alpha_desc">Alphabetically: Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Tags Row (Visible when filters are active) */}
          {(selectedCategoryId || searchQuery || availability.onSale || availability.inStock || availability.outStock || priceMin > priceLimits.min || priceMax < priceLimits.max || selectedColors.length > 0 || selectedSizes.length > 0 || selectedMaterials.length > 0) && (
            <div className="flex flex-wrap items-center gap-2.5 bg-gray-100/50 dark:bg-gray-900/30 p-3 rounded-xl">
              <span className="text-[10px] font-black text-gray-450 uppercase tracking-wider">Active Filters:</span>

              {selectedCategoryId && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Category: {displayCategories.find(c => c.id === selectedCategoryId)?.name || 'Shop'}
                  <button onClick={() => handleCategorySelect(undefined)} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              )}

              {availability.onSale && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  On Sale
                  <button onClick={() => setAvailability(p => ({ ...p, onSale: false }))} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              )}

              {availability.inStock && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  In Stock
                  <button onClick={() => setAvailability(p => ({ ...p, inStock: false }))} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              )}

              {availability.outStock && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Out of Stock
                  <button onClick={() => setAvailability(p => ({ ...p, outStock: false }))} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              )}

              {(priceMin > priceLimits.min || priceMax < priceLimits.max) && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Price: Rs {priceMin} - Rs {priceMax}
                  <button onClick={() => { setPriceMin(priceLimits.min); setPriceMax(priceLimits.max); }} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              )}

              {selectedColors.map(color => (
                <span key={`col-${color}`} className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Color: {color}
                  <button onClick={() => setSelectedColors(p => p.filter(c => c !== color))} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              ))}

              {selectedSizes.map(size => (
                <span key={`sz-${size}`} className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Size: {size}
                  <button onClick={() => setSelectedSizes(p => p.filter(s => s !== size))} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              ))}

              {selectedMaterials.map(material => (
                <span key={`mat-${material}`} className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-2.5 py-1 rounded-full font-bold text-gray-800 dark:text-gray-200">
                  Material: {material}
                  <button onClick={() => setSelectedMaterials(p => p.filter(m => m !== material))} className="hover:text-red-500 shrink-0"><X className="h-3 w-3" /></button>
                </span>
              ))}

              <button
                onClick={handleClearFilters}
                className="text-[10px] font-black text-[#e94560] hover:underline uppercase tracking-wider pl-1.5"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Catalog Listing */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-[#16162a] p-10 rounded-2xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
              <EmptyState />
              <button
                onClick={handleClearFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#e94560] text-white px-5 py-2.5 text-xs font-bold transition-transform active:scale-95 shadow-md cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === 'list' ? (
            // Horizontal List Layout
            <div className="flex flex-col gap-4">
              {displayProducts.map(product => (
                <ShopProductListCard
                  key={product.id}
                  product={product}
                  settings={activeSettings}
                  addItem={addItem}
                />
              ))}
            </div>
          ) : (
            // Grid Layouts (switchable 3 or 4 columns)
            <div className={`grid ${activeSettings?.card_mobile_columns === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4 ${viewMode === 'grid-3'
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : 'sm:grid-cols-3 lg:grid-cols-4'
              }`}>
              {displayProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={activeSettings.currencySymbol}
                  settings={activeSettings}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="w-full flex items-center justify-center mt-8">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-8 py-3 text-sm font-bold uppercase tracking-wider rounded-full bg-[#e94560] text-white hover:bg-[#d8344f] hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-sm cursor-pointer"
              >
                Load More ({totalResults - displayProducts.length} remaining)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FILTER DRAWER SHEET — slides in from the side */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex justify-end transition-all duration-300 animate-fade-in"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#16162a] w-4/5 max-w-xs h-[100dvh] shadow-2xl relative flex flex-col overflow-hidden scale-up duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-[#e94560]" />
                <span>Filters</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer p-1"
                title="Close Filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content — top to bottom */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 py-4">
              {renderFiltersContent()}
            </div>

            {/* Sticky Apply Button */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full text-center bg-[#1a1a2e] dark:bg-[#e94560] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-transform active:scale-95 shadow-md cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
