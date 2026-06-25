'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { Product, Category, ProductVariant } from '@/lib/types';
import { updateProductFields, updateProductVariantFields } from '@/lib/services/products';
import { toast } from 'sonner';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Check, 
  Loader2,
  SlidersHorizontal,
  PackageOpen
} from '@/components/common/Icons';
import PaginationFooter from './PaginationFooter';

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
}

export default function InventoryManager({ products: initialProducts, categories }: InventoryManagerProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Bulk updater for variants
  const handleBulkUpdateVariantStock = async (productId: string, variantIds: string[], newStock: number) => {
    const toastId = toast.loading(`Updating stock for ${variantIds.length} variants...`);
    try {
      await Promise.all(variantIds.map(id => updateProductVariantFields(id, { stock: newStock })));
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        const updatedVariants = p.variants.map(v => variantIds.includes(v.id) ? { ...v, stock: newStock } : v);
        const computedStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
        return {
          ...p,
          variants: updatedVariants,
          stock: computedStock
        };
      }));
      setSelectedVariantIds(prev => prev.filter(id => !variantIds.includes(id)));
      toast.success('Selected variant stocks updated successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to update variant stock', { id: toastId });
    }
  };

  const handleBulkUpdateVariantThreshold = async (productId: string, variantIds: string[], newThreshold: number) => {
    const toastId = toast.loading(`Updating thresholds for ${variantIds.length} variants...`);
    try {
      await Promise.all(variantIds.map(id => updateProductVariantFields(id, { inventoryThreshold: newThreshold })));
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        const updatedVariants = p.variants.map(v => variantIds.includes(v.id) ? { ...v, inventoryThreshold: newThreshold } : v);
        return {
          ...p,
          variants: updatedVariants
        };
      }));
      setSelectedVariantIds(prev => prev.filter(id => !variantIds.includes(id)));
      toast.success('Selected variant thresholds updated successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to update variant thresholds', { id: toastId });
    }
  };

  // Loading states for inline updates
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Inline updater for non-variant products
  const handleUpdateProductStock = async (productId: string, newStock: number) => {
    const idKey = `stock-${productId}`;
    setUpdatingIds(prev => ({ ...prev, [idKey]: true }));
    try {
      await updateProductFields(productId, { stock: newStock });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
      toast.success('Stock updated successfully');
    } catch (err) {
      toast.error('Failed to update stock');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [idKey]: false }));
    }
  };

  const handleUpdateProductThreshold = async (productId: string, newThreshold: number) => {
    const idKey = `threshold-${productId}`;
    setUpdatingIds(prev => ({ ...prev, [idKey]: true }));
    try {
      await updateProductFields(productId, { inventoryThreshold: newThreshold });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, inventoryThreshold: newThreshold } : p));
      toast.success('Threshold updated successfully');
    } catch (err) {
      toast.error('Failed to update threshold');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [idKey]: false }));
    }
  };

  // Inline updater for variants
  const handleUpdateVariantStock = async (productId: string, variantId: string, newStock: number) => {
    const idKey = `stock-${variantId}`;
    setUpdatingIds(prev => ({ ...prev, [idKey]: true }));
    try {
      await updateProductVariantFields(variantId, { stock: newStock });
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        const updatedVariants = p.variants.map(v => v.id === variantId ? { ...v, stock: newStock } : v);
        const computedStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
        return {
          ...p,
          variants: updatedVariants,
          stock: computedStock
        };
      }));
      toast.success('Variant stock updated successfully');
    } catch (err) {
      toast.error('Failed to update variant stock');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [idKey]: false }));
    }
  };

  const handleUpdateVariantThreshold = async (productId: string, variantId: string, newThreshold: number) => {
    const idKey = `threshold-${variantId}`;
    setUpdatingIds(prev => ({ ...prev, [idKey]: true }));
    try {
      await updateProductVariantFields(variantId, { inventoryThreshold: newThreshold });
      setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        const updatedVariants = p.variants.map(v => v.id === variantId ? { ...v, inventoryThreshold: newThreshold } : v);
        return {
          ...p,
          variants: updatedVariants
        };
      }));
      toast.success('Variant threshold updated successfully');
    } catch (err) {
      toast.error('Failed to update variant threshold');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [idKey]: false }));
    }
  };

  // Filtering Logic
  const filteredProducts = products.filter(product => {
    // 1. Search Query
    const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const skuMatch = product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const variantSkuMatch = product.variants?.some(v => v.sku?.toLowerCase().includes(searchQuery.toLowerCase())) || false;
    const matchesSearch = nameMatch || skuMatch || variantSkuMatch;

    if (!matchesSearch) return false;

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      const mainCategoryMatch = product.categoryId === selectedCategory;
      const multiCategoryMatch = product.productCategories?.some(pc => pc.categoryId === selectedCategory) || false;
      if (!mainCategoryMatch && !multiCategoryMatch) return false;
    }

    // 3. Low Stock Only Filter
    if (showLowStockOnly) {
      if (product.hasVariants) {
        // If any variant is low stock
        const hasLowStockVariant = product.variants.some(v => {
          const threshold = v.inventoryThreshold !== undefined && v.inventoryThreshold !== null ? v.inventoryThreshold : 5;
          return v.stock <= threshold;
        });
        if (!hasLowStockVariant) return false;
      } else {
        const threshold = product.inventoryThreshold !== undefined && product.inventoryThreshold !== null ? product.inventoryThreshold : 5;
        if (product.stock > threshold) return false;
      }
    }

    return true;
  });

  const totalFiltered = filteredProducts.length;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate stock status helpers
  const getStockBadge = (stock: number, threshold: number = 5) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Out of Stock</span>
        </span>
      );
    }
    if (stock <= threshold) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Low Stock ({stock})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>In Stock ({stock})</span>
      </span>
    );
  };

  const renderProductStatus = (product: Product) => {
    if (!product.hasVariants) {
      const threshold = product.inventoryThreshold !== undefined && product.inventoryThreshold !== null ? product.inventoryThreshold : 5;
      return getStockBadge(product.stock, threshold);
    }
    
    if (product.stock === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Out of Stock</span>
        </span>
      );
    }

    const totalLow = product.variants.filter(v => {
      const threshold = v.inventoryThreshold !== undefined && v.inventoryThreshold !== null ? v.inventoryThreshold : 5;
      return v.stock <= threshold;
    }).length;
    
    const totalIn = product.variants.filter(v => {
      const threshold = v.inventoryThreshold !== undefined && v.inventoryThreshold !== null ? v.inventoryThreshold : 5;
      return v.stock > threshold;
    }).length;

    return (
      <div className="flex flex-wrap gap-1.5 justify-end">
        {totalLow > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Low Stock ({totalLow})</span>
          </span>
        )}
        {totalIn > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>In Stock ({totalIn})</span>
          </span>
        )}
        {product.variants.length === 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            <span>No Variants</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Inventory Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage stock quantities and alert thresholds inline</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between text-gray-900 dark:text-white transition-colors">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products or SKUs..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] text-sm focus:outline-none focus:border-[#1a1a2e] dark:focus:border-gray-600 focus:bg-white transition-all text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b] px-3 py-2 text-sm focus:outline-none focus:bg-white text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.filter(cat => cat.slug !== 'shop').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-[#0f0f1b] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1d1d36] transition-all select-none">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => { setShowLowStockOnly(e.target.checked); setCurrentPage(1); }}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Show Low Stock Only</span>
          </label>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-16 text-center text-gray-900 dark:text-white transition-colors">
          <PackageOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Inventory Records Found</h3>
          <p className="text-sm text-gray-400 mt-1">Try resetting your search query or category filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden text-gray-900 dark:text-white transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-[#0f0f1b] border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-[10px] tracking-wider text-gray-500">
                  <tr>
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Stock Level</th>
                    <th className="py-3.5 px-4">Alert Threshold</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{paginatedProducts.map(product => {
                    const isExpanded = expandedProducts[product.id] ?? false;
                    const threshold = product.inventoryThreshold !== undefined && product.inventoryThreshold !== null ? product.inventoryThreshold : 5;
                    
                    return (
                      <React.Fragment key={product.id}><tr className="hover:bg-gray-50/50 dark:hover:bg-[#1d1d36]/30 transition-colors">
                          <td className="py-4 px-4 text-center">
                            {product.hasVariants ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(product.id)}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#252542] transition-all"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-800 flex-shrink-0">
                                {product.images?.[0] ? (
                                  <Image
                                    src={product.images[0].url}
                                    alt={product.name}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gray-100 dark:bg-gray-850 flex items-center justify-center text-gray-400 text-[10px]">
                                    No Img
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{product.name}</div>
                                <div className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold">
                                  {product.category?.name || product.productCategories?.[0]?.category?.name || 'Uncategorized'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                            {product.sku || '—'}
                          </td>
                          <td className="py-4 px-4">
                            {product.hasVariants ? (
                              <span className="font-bold text-xs text-gray-500 dark:text-gray-400">
                                {product.stock} (total across variants)
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 max-w-[120px]">
                                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-primary transition-all">
                                  <input
                                    type="number"
                                    defaultValue={product.stock}
                                    style={{ borderWidth: 0 }}
                                    className="w-16 bg-transparent text-xs text-gray-900 dark:text-white px-2.5 py-1.5 focus:outline-none"
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val !== product.stock) {
                                        handleUpdateProductStock(product.id, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = parseInt((e.target as HTMLInputElement).value, 10);
                                        if (!isNaN(val)) {
                                          handleUpdateProductStock(product.id, val);
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                {updatingIds[`stock-${product.id}`] && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#e94560]" />
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {product.hasVariants ? (
                              <span className="text-xs text-gray-400">Set per variant</span>
                            ) : (
                              <div className="flex items-center gap-2 max-w-[120px]">
                                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-primary transition-all">
                                  <input
                                    type="number"
                                    defaultValue={threshold}
                                    style={{ borderWidth: 0 }}
                                    className="w-16 bg-transparent text-xs text-gray-900 dark:text-white px-2.5 py-1.5 focus:outline-none"
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val !== threshold) {
                                        handleUpdateProductThreshold(product.id, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = parseInt((e.target as HTMLInputElement).value, 10);
                                        if (!isNaN(val)) {
                                          handleUpdateProductThreshold(product.id, val);
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                {updatingIds[`threshold-${product.id}`] && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#e94560]" />
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end">
                              {renderProductStatus(product)}
                            </div>
                          </td>
                        </tr>{/* Expanded Variants Subtable */}
                        {product.hasVariants && isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-gray-50/40 dark:bg-[#0e0e1e]/40 p-4">
                              {product.variants.some(v => selectedVariantIds.includes(v.id)) && (
                                <div className="ml-10 bg-gray-100/95 dark:bg-[#1c1c36] p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-3 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-1 duration-150">
                                  <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                    {product.variants.filter(v => selectedVariantIds.includes(v.id)).length} variant(s) selected
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3.5">
                                    {/* Bulk Set Stock */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Stock:</span>
                                      <input
                                        type="number"
                                        placeholder="Set Stock"
                                        id={`bulk-stock-input-${product.id}`}
                                        className="w-28 px-3 py-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-primary text-gray-900 dark:text-white font-medium"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.getElementById(`bulk-stock-input-${product.id}`) as HTMLInputElement;
                                          const val = parseInt(input?.value, 10);
                                          if (!isNaN(val)) {
                                            const vIds = product.variants.filter(v => selectedVariantIds.includes(v.id)).map(v => v.id);
                                            handleBulkUpdateVariantStock(product.id, vIds, val);
                                            if (input) input.value = '';
                                          } else {
                                            toast.error('Please enter a valid stock number');
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-[#e94560] hover:bg-[#e94560]/95 text-white rounded-lg text-xs font-bold transition-all"
                                      >
                                        Apply
                                      </button>
                                    </div>

                                    {/* Bulk Set Threshold */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Threshold:</span>
                                      <input
                                        type="number"
                                        placeholder="Set Threshold"
                                        id={`bulk-threshold-input-${product.id}`}
                                        className="w-28 px-3 py-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-primary text-gray-900 dark:text-white font-medium"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.getElementById(`bulk-threshold-input-${product.id}`) as HTMLInputElement;
                                          const val = parseInt(input?.value, 10);
                                          if (!isNaN(val)) {
                                            const vIds = product.variants.filter(v => selectedVariantIds.includes(v.id)).map(v => v.id);
                                            handleBulkUpdateVariantThreshold(product.id, vIds, val);
                                            if (input) input.value = '';
                                          } else {
                                            toast.error('Please enter a valid threshold number');
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-[#e94560] hover:bg-[#e94560]/95 text-white rounded-lg text-xs font-bold transition-all"
                                      >
                                        Apply
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const vIds = product.variants.map(v => v.id);
                                        setSelectedVariantIds(prev => prev.filter(id => !vIds.includes(id)));
                                      }}
                                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-350 rounded-lg text-xs font-bold transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="ml-10 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-inner">
                                <table className="w-full text-left text-xs text-gray-600 dark:text-gray-450">
                                  <thead className="bg-gray-100/70 dark:bg-[#121226] border-b border-gray-200 dark:border-gray-800 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                    <tr>
                                      <th className="py-2.5 px-4 w-10 text-center">
                                        <input
                                          type="checkbox"
                                          checked={product.variants.length > 0 && product.variants.every(v => selectedVariantIds.includes(v.id))}
                                          onChange={(e) => {
                                            const vIds = product.variants.map(v => v.id);
                                            if (e.target.checked) {
                                              setSelectedVariantIds(prev => [...new Set([...prev, ...vIds])]);
                                            } else {
                                              setSelectedVariantIds(prev => prev.filter(id => !vIds.includes(id)));
                                            }
                                          }}
                                          className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-3 w-3 cursor-pointer"
                                        />
                                      </th>
                                      <th className="py-2.5 px-4">Variant Option</th>
                                      <th className="py-2.5 px-4">SKU</th>
                                      <th className="py-2.5 px-4">Stock Level</th>
                                      <th className="py-2.5 px-4">Alert Threshold</th>
                                      <th className="py-2.5 px-4 text-right">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-150 dark:divide-gray-800 bg-white/50 dark:bg-[#16162a]/50">{product.variants.map(variant => {
                                      const variantLabel = [variant.color, variant.size, variant.material, variant.customValue].filter(Boolean).join(' / ') || 'Default';
                                      const variantThreshold = variant.inventoryThreshold !== undefined && variant.inventoryThreshold !== null ? variant.inventoryThreshold : 5;
                                      
                                      return (
                                        <tr key={variant.id} className="hover:bg-gray-150/20 dark:hover:bg-[#1e1e3b]/20 transition-colors">
                                          <td className="py-2.5 px-4 text-center">
                                            <input
                                              type="checkbox"
                                              checked={selectedVariantIds.includes(variant.id)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedVariantIds(prev => [...prev, variant.id]);
                                                } else {
                                                  setSelectedVariantIds(prev => prev.filter(id => id !== variant.id));
                                                }
                                              }}
                                              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-3.5 w-3.5 cursor-pointer"
                                            />
                                          </td>
                                          <td className="py-2.5 px-4 font-semibold text-gray-855 dark:text-gray-200">
                                            <div className="flex items-center gap-2">
                                              {variant.colorHex && (
                                                <span className="h-3 w-3 rounded-full flex-shrink-0 border border-gray-300" style={{ background: variant.colorHex }} />
                                              )}
                                              {variantLabel}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4 font-mono text-xs">
                                            {variant.sku || '—'}
                                          </td>
                                          <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center border border-gray-250 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-primary transition-all">
                                                <input
                                                  type="number"
                                                  defaultValue={variant.stock}
                                                  style={{ borderWidth: 0 }}
                                                  className="w-14 bg-transparent text-xs text-gray-900 dark:text-white px-2 py-1 focus:outline-none"
                                                  onBlur={(e) => {
                                                    const val = parseInt(e.target.value, 10);
                                                    if (!isNaN(val) && val !== variant.stock) {
                                                      handleUpdateVariantStock(product.id, variant.id, val);
                                                    }
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      const val = parseInt((e.target as HTMLInputElement).value, 10);
                                                      if (!isNaN(val)) {
                                                        handleUpdateVariantStock(product.id, variant.id, val);
                                                        (e.target as HTMLInputElement).blur();
                                                      }
                                                    }
                                                  }}
                                                />
                                              </div>
                                              {updatingIds[`stock-${variant.id}`] && (
                                                <Loader2 className="h-3 w-3 animate-spin text-[#e94560]" />
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center border border-gray-250 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-primary transition-all">
                                                <input
                                                  type="number"
                                                  defaultValue={variantThreshold}
                                                  style={{ borderWidth: 0 }}
                                                  className="w-14 bg-transparent text-xs text-gray-900 dark:text-white px-2 py-1 focus:outline-none"
                                                  onBlur={(e) => {
                                                    const val = parseInt(e.target.value, 10);
                                                    if (!isNaN(val) && val !== variantThreshold) {
                                                      handleUpdateVariantThreshold(product.id, variant.id, val);
                                                    }
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      const val = parseInt((e.target as HTMLInputElement).value, 10);
                                                      if (!isNaN(val)) {
                                                        handleUpdateVariantThreshold(product.id, variant.id, val);
                                                        (e.target as HTMLInputElement).blur();
                                                      }
                                                    }
                                                  }}
                                                />
                                              </div>
                                              {updatingIds[`threshold-${variant.id}`] && (
                                                <Loader2 className="h-3 w-3 animate-spin text-[#e94560]" />
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4 text-right">
                                            <div className="flex justify-end">
                                              {getStockBadge(variant.stock, variantThreshold)}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}</React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedProducts.map(product => {
              const isExpanded = expandedProducts[product.id] ?? false;
              const threshold = product.inventoryThreshold !== undefined && product.inventoryThreshold !== null ? product.inventoryThreshold : 5;
              
              return (
                <div 
                  key={product.id}
                  className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 text-gray-900 dark:text-white transition-colors"
                >
                  {/* Product Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-800 flex-shrink-0">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-100 dark:bg-gray-850 flex items-center justify-center text-gray-400 text-[10px]">
                            No Img
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{product.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold">
                          {product.category?.name || product.productCategories?.[0]?.category?.name || 'Uncategorized'}
                        </div>
                        {product.sku && (
                          <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                            SKU: {product.sku}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Status Badges on the right */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {renderProductStatus(product)}
                    </div>
                  </div>

                  {/* Stock Editors / Variant Toggle */}
                  {product.hasVariants ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-[#0f0f1b] p-3 rounded-xl">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          Total Stock: <span className="text-gray-900 dark:text-white font-black">{product.stock}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(product.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1d1d36] border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#252542] transition-all min-h-[36px]"
                        >
                          <span>{isExpanded ? 'Hide Variants' : 'Show Variants'}</span>
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Variants for Mobile */}
                      {isExpanded && (
                        <div className="space-y-3 pl-2 border-l-2 border-gray-200 dark:border-gray-800">
                          {/* Select All Variants Bar */}
                          <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={product.variants.length > 0 && product.variants.every(v => selectedVariantIds.includes(v.id))}
                                onChange={(e) => {
                                  const vIds = product.variants.map(v => v.id);
                                  if (e.target.checked) {
                                    setSelectedVariantIds(prev => [...new Set([...prev, ...vIds])]);
                                  } else {
                                    setSelectedVariantIds(prev => prev.filter(id => !vIds.includes(id)));
                                  }
                                }}
                                className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                                id={`select-all-variants-mobile-${product.id}`}
                              />
                              <label htmlFor={`select-all-variants-mobile-${product.id}`} className="text-xs font-bold text-gray-700 dark:text-gray-200 select-none cursor-pointer">
                                Select All Variants
                              </label>
                            </div>
                          </div>

                          {/* Bulk action toolbar for selected variants */}
                          {product.variants.some(v => selectedVariantIds.includes(v.id)) && (
                            <div className="bg-gray-100/80 dark:bg-[#1c1c36] p-3 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center justify-between">
                                <span>{product.variants.filter(v => selectedVariantIds.includes(v.id)).length} variant(s) selected</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const vIds = product.variants.map(v => v.id);
                                    setSelectedVariantIds(prev => prev.filter(id => !vIds.includes(id)));
                                  }}
                                  className="text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-255 font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="grid grid-cols-1 gap-2.5">
                                {/* Bulk Stock Input */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder="Set Stock"
                                    id={`bulk-stock-input-mobile-${product.id}`}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:border-primary text-gray-900 dark:text-white min-h-[40px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`bulk-stock-input-mobile-${product.id}`) as HTMLInputElement;
                                      const val = parseInt(input?.value, 10);
                                      if (!isNaN(val)) {
                                        const vIds = product.variants.filter(v => selectedVariantIds.includes(v.id)).map(v => v.id);
                                        handleBulkUpdateVariantStock(product.id, vIds, val);
                                        if (input) input.value = '';
                                      } else {
                                        toast.error('Please enter a valid stock number');
                                      }
                                    }}
                                    className="px-3 py-2 bg-[#e94560] hover:bg-[#e94560]/95 text-white rounded-xl text-xs font-bold min-h-[40px]"
                                  >
                                    Apply
                                  </button>
                                </div>

                                {/* Bulk Threshold Input */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder="Set Threshold"
                                    id={`bulk-threshold-input-mobile-${product.id}`}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:border-primary text-gray-900 dark:text-white min-h-[40px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`bulk-threshold-input-mobile-${product.id}`) as HTMLInputElement;
                                      const val = parseInt(input?.value, 10);
                                      if (!isNaN(val)) {
                                        const vIds = product.variants.filter(v => selectedVariantIds.includes(v.id)).map(v => v.id);
                                        handleBulkUpdateVariantThreshold(product.id, vIds, val);
                                        if (input) input.value = '';
                                      } else {
                                        toast.error('Please enter a valid threshold number');
                                      }
                                    }}
                                    className="px-3 py-2 bg-[#e94560] hover:bg-[#e94560]/95 text-white rounded-xl text-xs font-bold min-h-[40px]"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {product.variants.map(variant => {
                            const variantLabel = [variant.color, variant.size, variant.material, variant.customValue].filter(Boolean).join(' / ') || 'Default';
                            const variantThreshold = variant.inventoryThreshold !== undefined && variant.inventoryThreshold !== null ? variant.inventoryThreshold : 5;
                            
                            return (
                              <div 
                                key={variant.id}
                                className="bg-gray-50/50 dark:bg-[#0f0f1b]/50 p-3 rounded-xl border border-gray-150 dark:border-gray-800 space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedVariantIds.includes(variant.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedVariantIds(prev => [...prev, variant.id]);
                                        } else {
                                          setSelectedVariantIds(prev => prev.filter(id => id !== variant.id));
                                        }
                                      }}
                                      className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer flex-shrink-0"
                                    />
                                    {variant.colorHex && (
                                      <span className="h-3.5 w-3.5 rounded-full border border-gray-300 flex-shrink-0" style={{ background: variant.colorHex }} />
                                    )}
                                    {variantLabel}
                                  </span>
                                  {/* Right side status badge */}
                                  <div className="flex justify-end">
                                    {getStockBadge(variant.stock, variantThreshold)}
                                  </div>
                                </div>

                                {variant.sku && (
                                  <div className="text-[10px] font-mono text-gray-400">
                                    SKU: {variant.sku}
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Stock</label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-primary transition-all">
                                        <input
                                          type="number"
                                          defaultValue={variant.stock}
                                          style={{ borderWidth: 0 }}
                                          className="w-full bg-transparent text-xs text-gray-900 dark:text-white px-2.5 py-2 focus:outline-none min-h-[40px]"
                                          onBlur={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val) && val !== variant.stock) {
                                              handleUpdateVariantStock(product.id, variant.id, val);
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              const val = parseInt((e.target as HTMLInputElement).value, 10);
                                              if (!isNaN(val)) {
                                                handleUpdateVariantStock(product.id, variant.id, val);
                                                (e.target as HTMLInputElement).blur();
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                      {updatingIds[`stock-${variant.id}`] && (
                                        <Loader2 className="h-4 w-4 animate-spin text-[#e94560] flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Threshold</label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-primary transition-all">
                                        <input
                                          type="number"
                                          defaultValue={variantThreshold}
                                          style={{ borderWidth: 0 }}
                                          className="w-full bg-transparent text-xs text-gray-900 dark:text-white px-2.5 py-2 focus:outline-none min-h-[40px]"
                                          onBlur={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val) && val !== variantThreshold) {
                                              handleUpdateVariantThreshold(product.id, variant.id, val);
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              const val = parseInt((e.target as HTMLInputElement).value, 10);
                                              if (!isNaN(val)) {
                                                handleUpdateVariantThreshold(product.id, variant.id, val);
                                                (e.target as HTMLInputElement).blur();
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                      {updatingIds[`threshold-${variant.id}`] && (
                                        <Loader2 className="h-4 w-4 animate-spin text-[#e94560] flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-[#0f0f1b] p-3 rounded-xl">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Stock Level</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-[#e94560] transition-all">
                            <input
                              type="number"
                              defaultValue={product.stock}
                              style={{ borderWidth: 0 }}
                              className="w-full bg-transparent text-xs text-gray-900 dark:text-white px-2.5 py-2 focus:outline-none min-h-[40px]"
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val !== product.stock) {
                                  handleUpdateProductStock(product.id, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                                  if (!isNaN(val)) {
                                    handleUpdateProductStock(product.id, val);
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }
                              }}
                            />
                          </div>
                          {updatingIds[`stock-${product.id}`] && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#e94560] flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Alert Threshold</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] focus-within:border-[#e94560] transition-all">
                            <input
                              type="number"
                              defaultValue={threshold}
                              style={{ borderWidth: 0 }}
                              className="w-full bg-transparent text-xs text-gray-900 dark:text-white px-2.5 py-2 focus:outline-none min-h-[40px]"
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val !== threshold) {
                                  handleUpdateProductThreshold(product.id, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                                  if (!isNaN(val)) {
                                    handleUpdateProductThreshold(product.id, val);
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }
                              }}
                            />
                          </div>
                          {updatingIds[`threshold-${product.id}`] && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#e94560] flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <PaginationFooter
            totalItems={totalFiltered}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
