'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, StoreSettings } from '@/lib/types';
import { deleteProduct, updateProduct, updateProductFields } from '@/lib/services/products';
import { triggerMetaSync } from '@/lib/services/metaSyncAction';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils/whatsapp';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  RefreshCw, 
  Loader2, 
  Globe,
  PackageOpen
} from '@/components/common/Icons';
import ImportExportModal from '@/components/admin/ImportExportModal';

interface ProductListProps {
  initialProducts: Product[];
  settings: StoreSettings;
}

export default function ProductList({ initialProducts, settings }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingFailed, setSyncingFailed] = useState(false);
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const handleBulkActive = async (activeValue: boolean) => {
    if (selectedProductIds.length === 0) return;
    const toastId = toast.loading(`Updating ${selectedProductIds.length} products...`);
    try {
      await Promise.all(selectedProductIds.map(id => updateProductFields(id, { active: activeValue })));
      setProducts(prev => prev.map(p => selectedProductIds.includes(p.id) ? { ...p, active: activeValue } : p));
      toast.success(`Successfully updated ${selectedProductIds.length} products`, { id: toastId });
      setSelectedProductIds([]);
    } catch (err) {
      toast.error('Failed to update products status', { id: toastId });
    }
  };

  const handleBulkFeatured = async (featuredValue: boolean) => {
    if (selectedProductIds.length === 0) return;
    const toastId = toast.loading(`Updating ${selectedProductIds.length} products...`);
    try {
      await Promise.all(selectedProductIds.map(id => updateProductFields(id, { isFeatured: featuredValue })));
      setProducts(prev => prev.map(p => selectedProductIds.includes(p.id) ? { ...p, isFeatured: featuredValue } : p));
      toast.success(`Successfully updated ${selectedProductIds.length} products`, { id: toastId });
      setSelectedProductIds([]);
    } catch (err) {
      toast.error('Failed to update products featured status', { id: toastId });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!confirm(`Are you sure you want to move ${selectedProductIds.length} products to Trash?`)) return;
    const toastId = toast.loading(`Deleting ${selectedProductIds.length} products...`);
    try {
      await Promise.all(selectedProductIds.map(id => deleteProduct(id)));
      setProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)));
      toast.success(`Moved ${selectedProductIds.length} products to Trash`, { id: toastId });
      setSelectedProductIds([]);
    } catch (err) {
      toast.error('Failed to move products to Trash', { id: toastId });
    }
  };

  const handleBulkMetaSync = async () => {
    if (selectedProductIds.length === 0) return;
    const toastId = toast.loading(`Syncing ${selectedProductIds.length} products to Meta catalog...`);
    try {
      const results = await Promise.all(selectedProductIds.map(async (id) => {
        try {
          const res = await triggerMetaSync(id);
          return { id, success: res.success, error: res.error };
        } catch (e: any) {
          return { id, success: false, error: e.message || 'Unknown error' };
        }
      }));
      
      const failed = results.filter(r => !r.success);
      
      setProducts(prev => prev.map(p => {
        const result = results.find(r => r.id === p.id);
        if (result) {
          return {
            ...p,
            meta_sync_status: result.success ? 'synced' as const : 'error' as const,
            meta_sync_error: result.success ? null : result.error
          };
        }
        return p;
      }));

      if (failed.length === 0) {
        toast.success('All selected products synced successfully', { id: toastId });
      } else {
        toast.warning(`Synced with ${failed.length} failure(s)`, { id: toastId });
      }
      setSelectedProductIds([]);
    } catch (err) {
      toast.error('Failed to execute bulk sync', { id: toastId });
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to move this product to Trash?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product moved to Trash successfully');
    } catch (err) {
      toast.error('Failed to move product to Trash');
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const nextActive = !product.active;
      await updateProductFields(product.id, { active: nextActive });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: nextActive } : p));
      toast.success(`Product ${nextActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('[ProductList] handleToggleActive failed:', err);
      toast.error('Failed to update product state');
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      const nextFeatured = !product.isFeatured;
      await updateProductFields(product.id, { isFeatured: nextFeatured });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFeatured: nextFeatured } : p));
      toast.success(`Product ${nextFeatured ? 'marked as featured' : 'removed from featured'} successfully`);
    } catch (err) {
      console.error('[ProductList] handleToggleFeatured failed:', err);
      toast.error('Failed to update product featured status');
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/meta-sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully synced ${data.totalSynced} products to Meta catalog`);
        window.location.reload();
      } else {
        toast.error(`Sync failed: ${data.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error('Bulk sync request failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncFailed = async () => {
    setSyncingFailed(true);
    try {
      const res = await fetch('/api/meta-sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'failed' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully synced ${data.totalSynced} failed/pending products to Meta`);
        window.location.reload();
      } else {
        toast.error(`Sync failed: ${data.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error('Retry sync request failed');
    } finally {
      setSyncingFailed(false);
    }
  };

  const handleSingleSync = async (productId: string) => {
    setSyncingProductId(productId);
    try {
      const res = await triggerMetaSync(productId);
      if (res.success) {
        toast.success('Product synced to Meta catalog successfully');
        setProducts(prev => prev.map(p => p.id === productId ? { 
          ...p, 
          meta_sync_status: 'synced', 
          meta_sync_error: null
        } : p));
      } else {
        toast.error(`Failed to sync: ${res.error}`);
        setProducts(prev => prev.map(p => p.id === productId ? { 
          ...p, 
          meta_sync_status: 'error', 
          meta_sync_error: res.error 
        } : p));
      }
    } catch (err: any) {
      toast.error('Sync failed');
    } finally {
      setSyncingProductId(null);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search & Actions header */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#1a1a2e]"
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
          {settings.meta_sync_enabled && (
            <>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a30] text-gray-700 dark:text-gray-300 px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer min-h-[44px]"
                title="Sync all active products to Meta catalog"
              >
                {syncingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 text-blue-500" />}
                <span>Sync All to Meta</span>
              </button>
              <button
                onClick={handleSyncFailed}
                disabled={syncingFailed}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a30] text-gray-700 dark:text-gray-300 px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer min-h-[44px]"
                title="Retry failed/pending product syncs"
              >
                {syncingFailed ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-amber-500" />}
                <span>Retry Failed Syncs</span>
              </button>
            </>
          )}
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a30] text-gray-700 dark:text-gray-300 px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer min-h-[44px]"
            title="Import or Export product catalog data"
          >
            <PackageOpen className="h-4 w-4 text-[#e94560]" />
            <span>Import / Export</span>
          </button>
          <Link
            href="/admin/products/new"
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] hover:bg-[#e94560] text-white px-5 py-2.5 text-xs font-bold shadow-sm transition-all min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-[#1a1a2e]/5 dark:bg-[#1c1c36] p-3.5 rounded-2xl border border-gray-250 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 animate-fade-in transition-all">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-[#e94560]/10 text-[#e94560] px-3 py-1.5 rounded-full border border-[#e94560]/20">
              {selectedProductIds.length} Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkActive(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm active:scale-95"
            >
              Set Active
            </button>
            <button
              type="button"
              onClick={() => handleBulkActive(false)}
              className="px-3.5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm active:scale-95"
            >
              Set Inactive
            </button>
            <button
              type="button"
              onClick={() => handleBulkFeatured(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm active:scale-95"
            >
              Set Featured
            </button>
            <button
              type="button"
              onClick={() => handleBulkFeatured(false)}
              className="px-3.5 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm active:scale-95"
            >
              Unfeature
            </button>
            {settings.meta_sync_enabled && (
              <button
                type="button"
                onClick={handleBulkMetaSync}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm active:scale-95"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Sync Meta</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3.5 py-2 bg-[#e94560] hover:bg-[#e94560]/95 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Move to Trash</span>
            </button>
          </div>
        </div>
      )}

      {/* Table listing - desktop / Cards - mobile */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No products found matching your criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                  <thead className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/10 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4 md:py-4 md:px-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(filteredProducts.map(p => p.id));
                            } else {
                              setSelectedProductIds([]);
                            }
                          }}
                          className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 md:py-4 md:px-6">Product</th>
                      <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">SKU</th>
                      <th className="py-3 px-4 md:py-4 md:px-6">Price</th>
                      <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">Stock</th>
                      <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">Status</th>
                      <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell text-center">Featured</th>
                      {settings.meta_sync_enabled && <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">Meta Sync</th>}
                      <th className="py-3 px-4 md:py-4 md:px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredProducts.map(product => {
                      const fallbackPlaceholder = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";
                      const primaryImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || fallbackPlaceholder;
                      const isSyncing = syncingProductId === product.id;
                      return (
                        <tr 
                          key={product.id} 
                          className={`hover:bg-gray-50/20 dark:hover:bg-white/5 transition-all ${
                            !product.active ? 'opacity-60 bg-gray-50/30 dark:bg-gray-800/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 md:py-4 md:px-6 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds(prev => [...prev, product.id]);
                                } else {
                                  setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                                }
                              }}
                              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 md:py-4 md:px-6 flex items-center gap-2 md:gap-3">
                            <div className="relative h-10 w-10 md:h-12 md:w-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-[#0f0f1b]">
                              <img src={primaryImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-[#1a1a2e] dark:text-white text-xs md:text-sm max-w-[180px] lg:max-w-[400px] line-clamp-1">
                                  {product.name}
                                </p>
                                {!product.active && (
                                  <span className="md:hidden inline-flex items-center text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              {product.category && (
                                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{product.category.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 md:py-4 md:px-6 font-semibold text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">{product.sku || '—'}</td>
                          <td className="py-3 px-4 md:py-4 md:px-6 font-bold text-gray-900 dark:text-white text-xs md:text-sm whitespace-nowrap">{formatPrice(product.price, settings.currencySymbol)}</td>
                          <td className="py-3 px-4 md:py-4 md:px-6 font-semibold text-xs hidden md:table-cell">
                            {product.hasVariants && product.variants ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Variants ({product.variants.reduce((sum, v) => sum + v.stock, 0)})</span>
                            ) : (
                              product.stock
                            )}
                          </td>
                          <td className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">
                            <div className="flex items-center">
                              <button
                                onClick={() => handleToggleActive(product)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  product.active ? 'bg-[#e94560]' : 'bg-gray-200 dark:bg-gray-800'
                                }`}
                                role="switch"
                                aria-checked={product.active}
                                title={product.active ? 'Deactivate Product' : 'Activate Product'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    product.active ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell text-center">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => handleToggleFeatured(product)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  product.isFeatured ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-800'
                                }`}
                                role="switch"
                                aria-checked={product.isFeatured}
                                title={product.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    product.isFeatured ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                          {settings.meta_sync_enabled && (
                            <td className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">
                              {product.meta_sync_status === 'synced' ? (
                                <span suppressHydrationWarning={true} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full" title={product.meta_last_synced_at ? `Synced at: ${new Date(product.meta_last_synced_at).toLocaleString()}` : 'Synced'}>🟢 Synced</span>
                              ) : product.meta_sync_status === 'error' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full cursor-help" title={product.meta_sync_error || 'Sync failed'}>🔴 Error</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full">🟡 Pending</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 md:py-4 md:px-6 text-center">
                            <div className="flex items-center justify-center gap-1.5 md:gap-3">
                              {settings.meta_sync_enabled && (
                                <button onClick={() => handleSingleSync(product.id)} disabled={isSyncing}
                                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-500 dark:hover:text-blue-400 transition-all cursor-pointer" title="Force Meta Sync">
                                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </button>
                              )}
                              <Link href={`/admin/products/${product.id}`}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1a1a2e] dark:hover:text-white transition-all" title="Edit Product">
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button onClick={() => handleDelete(product.id)}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-red-500 hover:bg-red-50/10 transition-all cursor-pointer" title="Move to Trash">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Products Select All Bar */}
            <div className="md:hidden flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-850/10 border-b border-gray-150 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProductIds(filteredProducts.map(p => p.id));
                    } else {
                      setSelectedProductIds([]);
                    }
                  }}
                  className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                  id="select-all-products-mobile"
                />
                <label htmlFor="select-all-products-mobile" className="text-xs font-bold text-gray-700 dark:text-gray-200 select-none cursor-pointer">
                  Select All Products
                </label>
              </div>
            </div>

            {/* Mobile Products Cards */}
            <div className="md:hidden space-y-3 p-4">
              {filteredProducts.map(product => {
                const fallbackPlaceholder = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";
                const primaryImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || fallbackPlaceholder;
                const isSyncing = syncingProductId === product.id;
                return (
                  <div 
                    key={product.id} 
                    className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-all ${
                      !product.active ? 'opacity-65 bg-gray-50/50 dark:bg-gray-900/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(prev => [...prev, product.id]);
                          } else {
                            setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                          }
                        }}
                        className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer mt-1 flex-shrink-0"
                      />
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-[#0f0f1b]">
                        <img src={primaryImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-black text-[#1a1a2e] dark:text-white truncate flex-1 line-clamp-1 max-w-[250px]">{product.name}</h3>
                          <span className="text-sm font-black text-gray-900 dark:text-white flex-shrink-0">{formatPrice(product.price, settings.currencySymbol)}</span>
                        </div>
                        {product.category && <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{product.category.name}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[10px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              product.active ? 'bg-[#e94560]' : 'bg-gray-200 dark:bg-gray-800'
                            }`}
                            role="switch"
                            aria-checked={product.active}
                            title={product.active ? 'Deactivate Product' : 'Activate Product'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                product.active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                            {product.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleFeatured(product)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              product.isFeatured ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-800'
                            }`}
                            role="switch"
                            aria-checked={product.isFeatured}
                            title={product.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                product.isFeatured ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                            {product.isFeatured ? 'Featured' : 'Not Featured'}
                          </span>
                        </div>

                        {settings.meta_sync_enabled && (
                          product.meta_sync_status === 'synced' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Synced</span>
                          ) : product.meta_sync_status === 'error' ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">🔴 Error</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">🟡 Pending</span>
                          )
                        )}
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">{product.sku || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                      {settings.meta_sync_enabled && (
                        <button onClick={() => handleSingleSync(product.id)} disabled={isSyncing}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 text-[10px] font-bold transition-all">
                          {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync
                        </button>
                      )}
                      <Link href={`/admin/products/${product.id}`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 text-[10px] font-bold transition-all">
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button onClick={() => handleDelete(product.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-red-500 hover:bg-red-50/10 text-[10px] font-bold transition-all">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        products={products}
        onImportComplete={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
