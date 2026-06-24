'use client';

import { useState } from 'react';
import { X, Search } from '@/components/common/Icons';
import { getClientSiteUrl } from '@/lib/site-url';

interface SEOPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity_type: 'product' | 'category' | 'page';
  entity_name: string;
  seoData: any;
  storeUrl?: string;
  storeName?: string;
}

export function SEOPreviewModal({ isOpen, onClose, entity_type, entity_name, seoData, storeUrl, storeName }: SEOPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'google' | 'facebook' | 'twitter' | 'whatsapp'>('google');

  if (!isOpen || !seoData) return null;

  const siteUrl = storeUrl
    ? storeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    : getClientSiteUrl().replace(/^https?:\/\//i, '').replace(/\/$/, '');

  const brandName = storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Zaynahs';
  const displaySlug = entity_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const titleLength = seoData.seo_title?.length || 0;
  const descLength = seoData.meta_description?.length || 0;

  // Render character count indicator
  const getLengthBadge = (len: number, min: number, max: number) => {
    if (len >= min && len <= max) {
      return <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">{len} chars 🟢 Perfect</span>;
    }
    if (len < min) {
      return <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full">{len} chars 🟡 Too short</span>;
    }
    return <span className="text-rose-600 dark:text-rose-400 font-semibold text-xs bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">{len} chars 🔴 Too long</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#16162a] rounded-2xl max-w-2xl w-full border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">SEO & Social Snippet Preview</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entity_name}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 p-2 bg-gray-50/50 dark:bg-gray-900/30 overflow-x-auto gap-1">
          {(['google', 'facebook', 'twitter', 'whatsapp'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer min-h-[40px] ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Preview Sandbox */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 font-sans">
                {/* Google mockup */}
                <div className="space-y-1 max-w-[600px]">
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 truncate">
                    <span>https://{siteUrl}</span>
                    <span>›</span>
                    <span>{entity_type === 'product' ? 'product' : 'category'}</span>
                    <span>›</span>
                    <span>{displaySlug}</span>
                  </div>
                  <h4 className="text-[20px] leading-tight text-blue-800 dark:text-blue-400 hover:underline cursor-pointer font-medium truncate">
                    {seoData.seo_title || `${entity_name} | ${brandName}`}
                  </h4>
                  <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                    {seoData.meta_description || 'Please generate SEO metadata for this item to view Google snippet description.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Google Title (Ideal: 50-60 chars)</div>
                  <div>{getLengthBadge(titleLength, 50, 60)}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Meta Description (Ideal: 150-160 chars)</div>
                  <div>{getLengthBadge(descLength, 150, 160)}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facebook' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-w-[500px] mx-auto shadow-sm">
              <div className="h-64 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <span className="text-xs font-semibold">1200 x 630 Facebook Card Image</span>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 space-y-1">
                <div className="text-xs text-gray-400 uppercase tracking-wider uppercase font-semibold">https://{siteUrl}</div>
                <h5 className="font-bold text-gray-900 dark:text-white truncate">{seoData.og_title || seoData.seo_title || entity_name}</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{seoData.og_description || seoData.meta_description}</p>
              </div>
            </div>
          )}

          {activeTab === 'twitter' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-w-[500px] mx-auto shadow-sm">
              <div className="h-56 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <span className="text-xs font-semibold">Summary Large Image Card</span>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 space-y-0.5">
                <h5 className="font-bold text-sm text-gray-900 dark:text-white truncate">{seoData.twitter_title || seoData.seo_title || entity_name}</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{seoData.twitter_description || seoData.meta_description}</p>
                <div className="text-xs text-gray-400 pt-1">@{siteUrl}</div>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="bg-emerald-50 dark:bg-[#1a382e] p-6 rounded-2xl max-w-[400px] mx-auto border border-emerald-100 dark:border-emerald-900 shadow-sm font-sans">
              <div className="bg-white dark:bg-[#121b22] p-3 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm space-y-2">
                <div className="bg-gray-100 dark:bg-[#202c33] p-2 rounded-xl flex gap-3">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0 flex items-center justify-center text-[10px] text-gray-400 font-bold">Image</div>
                  <div className="space-y-0.5 overflow-hidden">
                    <h6 className="font-bold text-xs text-gray-900 dark:text-white truncate">{seoData.og_title || entity_name}</h6>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">{seoData.og_description || seoData.meta_description}</p>
                    <div className="text-[9px] text-gray-400">{siteUrl}</div>
                  </div>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  https://{siteUrl}/{entity_type === 'product' ? 'product' : 'category'}/{displaySlug}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
