import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  TrendingUp, 
  Package, 
  Layers, 
  Search, 
  Zap, 
  CheckCircle2, 
  Settings, 
  ArrowRight,
  RefreshCw,
  SlidersHorizontal
} from '@/components/common/Icons';

export const revalidate = 0; // Don't cache admin pages

export default async function SEODashboard() {
  // 1. Fetch counts (exclude soft-deleted)
  const { count: totalProducts } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  const { count: totalCategories } = await supabaseAdmin
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  const { data: seoMetas } = await supabaseAdmin
    .from('seo_meta')
    .select('entity_type, is_optimized');

  const pTotal = totalProducts || 0;
  const cTotal = totalCategories || 0;

  // Clamp optimized counts to total — prevents >100% from orphaned seo_meta rows
  const pOptimized = Math.min(
    seoMetas?.filter(m => m.entity_type === 'product' && m.is_optimized).length || 0,
    pTotal
  );
  const cOptimized = Math.min(
    seoMetas?.filter(m => m.entity_type === 'category' && m.is_optimized).length || 0,
    cTotal
  );

  const pPending = Math.max(0, pTotal - pOptimized);
  const cPending = Math.max(0, cTotal - cOptimized);

  const pPct = pTotal > 0 ? Math.min(Math.round((pOptimized / pTotal) * 100), 100) : 0;
  const cPct = cTotal > 0 ? Math.min(Math.round((cOptimized / cTotal) * 100), 100) : 0;

  const totalSEO = pOptimized + cOptimized;
  const totalItems = pTotal + cTotal;
  const overallPct = totalItems > 0 ? Math.min(Math.round((totalSEO / totalItems) * 100), 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">SEO & AI Copywriting</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Optimize product copywriting, image tags, and ping search engines instantly.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link 
            href="/admin/seo/settings"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors cursor-pointer min-h-[44px] flex-1 sm:flex-none"
          >
            <Settings className="w-4 h-4" />
            <span>AI Settings</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products Card */}
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Products Optimized</span>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{pOptimized} / {pTotal}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Progress</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{pPct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${pPct}%` }} />
            </div>
          </div>
        </div>

        {/* Categories Card */}
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories Optimized</span>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{cOptimized} / {cTotal}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Progress</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{cPct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${cPct}%` }} />
            </div>
          </div>
        </div>

        {/* Overall SEO Score */}
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall SEO Score</span>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{overallPct}%</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Optimized Items</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{totalSEO} / {totalItems}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </div>

        {/* IndexNow Status */}
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">IndexNow Status</span>
              <h3 className="text-lg font-semibold mt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-current" />
                Active Auto-Ping
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
            Instant indexing notification enabled. New and updated pages automatically ping Bing, Yandex, Naver, and Seznam.
          </div>
        </div>
      </div>

      {/* Navigation Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products Link card */}
        <Link 
          href="/admin/seo/products"
          className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all group cursor-pointer flex justify-between items-center"
        >
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Products SEO Copywriting
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{pPending} products currently pending optimization.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all">
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>

        {/* Categories Link card */}
        <Link 
          href="/admin/seo/categories"
          className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-purple-500 dark:hover:border-purple-500 transition-all group cursor-pointer flex justify-between items-center"
        >
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              Categories SEO Overrides
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{cPending} categories currently pending optimization.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 transition-all">
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* Bulk Optimization Trigger Card */}
      <BulkOptimizeCard pPending={pPending} cPending={cPending} />
    </div>
  );
}

// Client Component helper for trigger action
import { BulkOptimizeCard } from '@/components/admin/BulkOptimizeCard';
