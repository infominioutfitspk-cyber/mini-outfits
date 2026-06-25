'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Search, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Eye, 
  Edit,
  ArrowRight,
  Settings,
  ChevronDown
} from '@/components/common/Icons';
import { toast } from 'sonner';
import { SEOPreviewModal } from '@/components/admin/SEOPreviewModal';
import { EditSEOModal } from '@/components/admin/EditSEOModal';

interface ProductSEOItem {
  id: string;
  name: string;
  slug: string;
  seo_meta: {
    seo_title: string;
    meta_description: string;
    focus_keyword: string;
    secondary_keywords: string;
    lsi_tags: string;
    og_title: string;
    og_description: string;
    twitter_title: string;
    twitter_description: string;
    image_alt: string;
    long_description: string;
    faq_schema: any[];
    pinterest_description: string;
    is_optimized: boolean;
  } | null;
}

export default function ProductsSEOClient() {
  const [products, setProducts] = useState<ProductSEOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'optimized' | 'pending'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [bulkOptimizing, setBulkOptimizing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [storeSettings, setStoreSettings] = useState<{ store_url?: string; store_name?: string } | null>(null);
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<ProductSEOItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const [aiRes, settingsRes] = await Promise.all([
          supabase
            .from('ai_settings')
            .select('ai_enabled')
            .eq('id', '00000000-0000-4000-8000-000000000002')
            .single(),
          supabase
            .from('store_settings')
            .select('store_url, store_name')
            .eq('id', '00000000-0000-4000-8000-000000000001')
            .single()
        ]);
        setAiEnabled(aiRes.data?.ai_enabled ?? false);
        setStoreSettings(settingsRes.data || null);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filter, currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      let productIdsFilter: string[] | null = null;
      let isPendingFilter = false;

      if (filter === 'optimized') {
        const { data: metas } = await supabase
          .from('seo_meta')
          .select('entity_id')
          .eq('entity_type', 'product')
          .eq('is_optimized', true);
        
        productIdsFilter = (metas || []).map(m => m.entity_id);
        if (productIdsFilter.length === 0) {
          setProducts([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      } else if (filter === 'pending') {
        const { data: metas } = await supabase
          .from('seo_meta')
          .select('entity_id')
          .eq('entity_type', 'product')
          .eq('is_optimized', true);
        
        productIdsFilter = (metas || []).map(m => m.entity_id);
        isPendingFilter = true;
      }

      // Start building query
      let query = supabase
        .from('products')
        .select('id, name, slug', { count: 'exact' });

      // Apply search
      if (search.trim()) {
        query = query.ilike('name', `%${search}%`);
      }

      // Apply optimization status filter
      if (productIdsFilter) {
        if (isPendingFilter) {
          if (productIdsFilter.length > 0) {
            query = query.not('id', 'in', `(${productIdsFilter.join(',')})`);
          }
        } else {
          query = query.in('id', productIdsFilter);
        }
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: productsData, count, error } = await query
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const items = productsData || [];
      if (items.length === 0) {
        setProducts([]);
        setTotalCount(count || 0);
        return;
      }

      // Fetch matching seo_meta records for this page's products
      const itemIds = items.map(p => p.id);
      const { data: metasData, error: metasError } = await supabase
        .from('seo_meta')
        .select('*')
        .eq('entity_type', 'product')
        .in('entity_id', itemIds);

      if (metasError) throw metasError;

      const metasMap = new Map(metasData?.map(m => [m.entity_id, m]) || []);

      const formattedData = items.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        seo_meta: metasMap.get(p.id) || null
      }));

      setProducts(formattedData);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('[Products SEO] Fetch failed:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      fetchProducts();
    }
  };

  const handleOptimize = async (id: string) => {
    try {
      setOptimizingId(id);
      const response = await fetch('/api/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'product', entity_id: id })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) throw new Error(resData.error || 'Failed to optimize product');

      if (resData.skipped) {
        toast.warning(resData.message || 'AI keys not configured');
      } else {
        toast.success('Product SEO copywriting generated!');
        fetchProducts();
      }
    } catch (err: any) {
      toast.error(err.message || 'Optimization failed');
    } finally {
      setOptimizingId(null);
    }
  };

  const handleBulkOptimize = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkOptimizing(true);
      const items = selectedIds.map(id => ({ entity_type: 'product', entity_id: id }));

      const response = await fetch('/api/seo/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Bulk process failed');

      toast.success(`Bulk optimize finished! Success: ${resData.success}, Failed: ${resData.failed}`);
      setSelectedIds([]);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Bulk optimize failed');
    } finally {
      setBulkOptimizing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-550 dark:text-gray-400">
        <Link href="/admin/seo" className="hover:text-blue-650">SEO Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-950 dark:text-white">Products List</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Products SEO Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Review, edit and write SEO copy content for your storefront catalog.</p>
        </div>
        
        {aiEnabled && selectedIds.length > 0 && (
          <button
            onClick={handleBulkOptimize}
            disabled={bulkOptimizing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-95 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 text-sm transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
          >
            {bulkOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Bulk...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Bulk Optimize Selected ({selectedIds.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {!aiEnabled && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-4 transition-all">
          <span>AI SEO features are globally disabled. Turn on the switch in the AI Settings tab to enable "Write AI" copy generation.</span>
          <Link href="/admin/seo/settings" className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg whitespace-nowrap">
            Go to Settings
          </Link>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search products... (Press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none min-h-[44px]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto">
          {(['all', 'optimized', 'pending'] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setFilter(status); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border min-h-[44px] flex-1 md:flex-none capitalize transition-all cursor-pointer ${
                filter === status
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-[#16162a] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Product Name</th>
                <th className="p-4 hidden md:table-cell">Focus Keyword</th>
                <th className="p-4">SEO Title</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm text-gray-700 dark:text-gray-300">{loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-450 dark:text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading products catalog...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-455 dark:text-gray-500">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isOptimized = product.seo_meta?.is_optimized;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">/product/{product.slug}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell font-mono text-xs">
                        {product.seo_meta?.focus_keyword || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="p-4 max-w-[200px] truncate text-xs font-mono">
                        {product.seo_meta?.seo_title || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="p-4">
                        {isOptimized ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Optimized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isOptimized ? (
                            <>
                              <button
                                onClick={() => { setSelectedProduct(product); setIsPreviewOpen(true); }}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Preview Social / Search Cards"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedProduct(product); setIsEditOpen(true); }}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                                title="Edit Copy overrides"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </>
                          ) : null}

                          {aiEnabled && (
                            <button
                              onClick={() => handleOptimize(product.id)}
                              disabled={optimizingId === product.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/10 disabled:bg-gray-50 dark:disabled:bg-gray-800 text-xs transition-all cursor-pointer min-h-[36px]"
                            >
                              {optimizingId === product.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Zap className="w-3.5 h-3.5 fill-current" />
                              )}
                              <span>{isOptimized ? 'Regen' : 'Write AI'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards Grid */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800/60">
          {loading ? (
            <div className="p-8 text-center text-gray-450 dark:text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <span>Loading products catalog...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-455 dark:text-gray-500">
              No products found matching filters.
            </div>
          ) : (
            products.map((product) => {
              const isOptimized = product.seo_meta?.is_optimized;
              const isSelected = selectedIds.includes(product.id);
              return (
                <div 
                  key={product.id} 
                  className={`p-4 flex flex-col gap-3 transition-colors ${
                    isSelected ? 'bg-blue-50/5 dark:bg-blue-900/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 dark:text-white text-sm truncate">{product.name}</span>
                        <span className="text-xs text-gray-455 dark:text-gray-500 truncate">/product/{product.slug}</span>
                      </div>
                    </div>
                    <div>
                      {isOptimized ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Optimized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-50 dark:border-gray-800/40 pt-2">
                    <div className="min-w-0">
                      <span className="text-gray-400 dark:text-gray-500 block mb-0.5">Focus Keyword</span>
                      <span className="font-mono text-gray-900 dark:text-white truncate block">
                        {product.seo_meta?.focus_keyword || <span className="text-gray-400 dark:text-gray-650">—</span>}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-gray-400 dark:text-gray-500 block mb-0.5">SEO Title</span>
                      <span className="font-mono text-gray-900 dark:text-white truncate block">
                        {product.seo_meta?.seo_title || <span className="text-gray-400 dark:text-gray-650">—</span>}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50 dark:border-gray-800/40">
                    {isOptimized ? (
                      <>
                        <button
                          onClick={() => { setSelectedProduct(product); setIsPreviewOpen(true); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer text-xs font-bold min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => { setSelectedProduct(product); setIsEditOpen(true); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer text-xs font-bold min-h-[36px]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </>
                    ) : null}

                    {aiEnabled && (
                      <button
                        onClick={() => handleOptimize(product.id)}
                        disabled={optimizingId === product.id}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 disabled:bg-gray-50 dark:disabled:bg-gray-805 text-xs transition-all cursor-pointer min-h-[36px]"
                      >
                        {optimizingId === product.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>{isOptimized ? 'Regen' : 'Write AI'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing page {currentPage} of {totalPages} ({totalCount} total products)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 dark:border-gray-800 rounded-xl disabled:text-gray-300 dark:disabled:text-gray-700 bg-white dark:bg-[#16162a] hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 dark:border-gray-800 rounded-xl disabled:text-gray-300 dark:disabled:text-gray-700 bg-white dark:bg-[#16162a] hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && selectedProduct && (
        <SEOPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          entity_type="product"
          entity_name={selectedProduct.name}
          seoData={selectedProduct.seo_meta}
          storeUrl={storeSettings?.store_url || undefined}
          storeName={storeSettings?.store_name || undefined}
        />
      )}

      {/* Edit Override Modal */}
      {isEditOpen && selectedProduct && (
        <EditSEOModal
          isOpen={isEditOpen}
          onClose={() => { setIsEditOpen(false); fetchProducts(); }}
          entity_type="product"
          entity_id={selectedProduct.id}
          seoData={selectedProduct.seo_meta}
        />
      )}
    </div>
  );
}
