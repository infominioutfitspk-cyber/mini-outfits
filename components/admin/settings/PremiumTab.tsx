'use client';

import React, { useState } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2, Plus, Search, Zap, Play } from '@/components/common/Icons';
import { Product, StoreSettings } from '@/lib/types';
import MediaSelectorModal from '../MediaSelectorModal';

interface PremiumTabProps {
  initialSettings: StoreSettings;
  
  // Enabled/Disabled Switches
  recentBuyersEnabled: boolean;
  setRecentBuyersEnabled: (v: boolean) => void;
  cookieConsentEnabled: boolean;
  setCookieConsentEnabled: (v: boolean) => void;
  freeShippingBarEnabled: boolean;
  setFreeShippingBarEnabled: (v: boolean) => void;
  volumeDiscountsEnabled: boolean;
  setVolumeDiscountsEnabled: (v: boolean) => void;
  frequentlyBoughtTogetherEnabled: boolean;
  setFrequentlyBoughtTogetherEnabled: (v: boolean) => void;
  stockUrgencyEnabled: boolean;
  setStockUrgencyEnabled: (v: boolean) => void;
  flashSaleEnabled: boolean;
  setFlashSaleEnabled: (v: boolean) => void;
  flashSaleStartDate: string;
  setFlashSaleStartDate: (v: string) => void;
  flashSaleEndDate: string;
  setFlashSaleEndDate: (v: string) => void;
  globalFlashSaleDiscountType: 'percentage' | 'fixed';
  setGlobalFlashSaleDiscountType: (v: 'percentage' | 'fixed') => void;
  globalFlashSaleDiscountValue: number;
  setGlobalFlashSaleDiscountValue: (v: number) => void;
  socialFeedsEnabled: boolean;
  setSocialFeedsEnabled: (v: boolean) => void;
  cartTimerEnabled: boolean;
  setCartTimerEnabled: (v: boolean) => void;
  sizeGuideEnabled: boolean;
  setSizeGuideEnabled: (v: boolean) => void;
  couponCodesEnabled: boolean;
  setCouponCodesEnabled: (v: boolean) => void;

  enableFakeViews: boolean;
  setEnableFakeViews: (v: boolean) => void;
  minViews: number;
  setMinViews: (v: number) => void;
  maxViews: number;
  setMaxViews: (v: number) => void;

  // Exit Intent Popup
  exitIntentEnabled: boolean;
  setExitIntentEnabled: (v: boolean) => void;
  exitIntentTitle: string;
  setExitIntentTitle: (v: string) => void;
  exitIntentText: string;
  setExitIntentText: (v: string) => void;
  exitIntentCoupon: string;
  setExitIntentCoupon: (v: string) => void;
  exitIntentImageUrl: string;
  setExitIntentImageUrl: (v: string) => void;
  exitIntentDelayMobile: number;
  setExitIntentDelayMobile: (v: number) => void;

  // Cookie Consent Banner
  cookieConsentText: string;
  setCookieConsentText: (v: string) => void;
  cookieConsentButtonText: string;
  setCookieConsentButtonText: (v: string) => void;

  // Spin to Win
  spinWheelEnabled: boolean;
  setSpinWheelEnabled: (v: boolean) => void;
  spinWheelSegments: string[];
  setSpinWheelSegments: (v: string[]) => void;

  // Urgency & Shipping
  cartTimerMinutes: number;
  setCartTimerMinutes: (v: number) => void;
  cartTimerMessage: string;
  setCartTimerMessage: (v: string) => void;
  freeShippingThreshold: number;
  setFreeShippingThreshold: (v: number) => void;
  recentlyViewedLimit: number;
  setRecentlyViewedLimit: (v: number) => void;

  // Volume Discounts
  volumeDiscountThreshold: number;
  setVolumeDiscountThreshold: (v: number) => void;
  volumeDiscountPercentage: number;
  setVolumeDiscountPercentage: (v: number) => void;

  // Recent Buyers Popups
  recentBuyersSource: 'simulated' | 'real';
  setRecentBuyersSource: (v: 'simulated' | 'real') => void;
  recentBuyersNames: string;
  setRecentBuyersNames: (v: string) => void;
  recentBuyersCities: string;
  setRecentBuyersCities: (v: string) => void;
  recentBuyersProductPool: 'any' | 'featured' | 'sale' | 'recent' | 'custom';
  setRecentBuyersProductPool: (v: 'any' | 'featured' | 'sale' | 'recent' | 'custom') => void;
  recentBuyersCustomProducts: string[];
  setRecentBuyersCustomProducts: React.Dispatch<React.SetStateAction<string[]>>;
  productsList: Product[];
  recentBuyersInitialDelay: number;
  setRecentBuyersInitialDelay: (v: number) => void;
  recentBuyersInterval: number;
  setRecentBuyersInterval: (v: number) => void;
  recentBuyersDisplayDuration: number;
  setRecentBuyersDisplayDuration: (v: number) => void;
  recentBuyersShowOnCheckout: boolean;
  setRecentBuyersShowOnCheckout: (v: boolean) => void;

  // Image Upload Handlers
  handleRemoveImage: (type: 'logo' | 'favicon' | 'banner' | 'exit_intent') => void;

  // Announcement Bar properties
  headerShowNewsletter: boolean;
  setHeaderShowNewsletter: (v: boolean) => void;
  headerNewsletterText: string;
  setHeaderNewsletterText: (v: string) => void;
  headerShowTopBar: boolean;
  setHeaderShowTopBar: (v: boolean) => void;
  headerTopBarPhone: string;
  setHeaderTopBarPhone: (v: string) => void;
  headerTopBarEmail: string;
  setHeaderTopBarEmail: (v: string) => void;

  enableTicker: boolean;
  setEnableTicker: (v: boolean) => void;
  tickerText: string;
  setTickerText: (v: string) => void;
}

export default function PremiumTab({
  initialSettings,
  recentBuyersEnabled,
  setRecentBuyersEnabled,
  cookieConsentEnabled,
  setCookieConsentEnabled,
  freeShippingBarEnabled,
  setFreeShippingBarEnabled,
  volumeDiscountsEnabled,
  setVolumeDiscountsEnabled,
  frequentlyBoughtTogetherEnabled,
  setFrequentlyBoughtTogetherEnabled,
  stockUrgencyEnabled,
  setStockUrgencyEnabled,
  flashSaleEnabled,
  setFlashSaleEnabled,
  flashSaleStartDate,
  setFlashSaleStartDate,
  flashSaleEndDate,
  setFlashSaleEndDate,
  globalFlashSaleDiscountType,
  setGlobalFlashSaleDiscountType,
  globalFlashSaleDiscountValue,
  setGlobalFlashSaleDiscountValue,
  socialFeedsEnabled,
  setSocialFeedsEnabled,
  cartTimerEnabled,
  setCartTimerEnabled,
  sizeGuideEnabled,
  setSizeGuideEnabled,
  couponCodesEnabled,
  setCouponCodesEnabled,
  enableFakeViews,
  setEnableFakeViews,
  minViews,
  setMinViews,
  maxViews,
  setMaxViews,
  exitIntentEnabled,
  setExitIntentEnabled,
  exitIntentTitle,
  setExitIntentTitle,
  exitIntentText,
  setExitIntentText,
  exitIntentCoupon,
  setExitIntentCoupon,
  exitIntentImageUrl,
  setExitIntentImageUrl,
  exitIntentDelayMobile,
  setExitIntentDelayMobile,
  cookieConsentText,
  setCookieConsentText,
  cookieConsentButtonText,
  setCookieConsentButtonText,
  spinWheelEnabled,
  setSpinWheelEnabled,
  spinWheelSegments,
  setSpinWheelSegments,
  cartTimerMinutes,
  setCartTimerMinutes,
  cartTimerMessage,
  setCartTimerMessage,
  freeShippingThreshold,
  setFreeShippingThreshold,
  recentlyViewedLimit,
  setRecentlyViewedLimit,
  volumeDiscountThreshold,
  setVolumeDiscountThreshold,
  volumeDiscountPercentage,
  setVolumeDiscountPercentage,
  recentBuyersSource,
  setRecentBuyersSource,
  recentBuyersNames,
  setRecentBuyersNames,
  recentBuyersCities,
  setRecentBuyersCities,
  recentBuyersProductPool,
  setRecentBuyersProductPool,
  recentBuyersCustomProducts,
  setRecentBuyersCustomProducts,
  productsList,
  recentBuyersInitialDelay,
  setRecentBuyersInitialDelay,
  recentBuyersInterval,
  setRecentBuyersInterval,
  recentBuyersDisplayDuration,
  setRecentBuyersDisplayDuration,
  recentBuyersShowOnCheckout,
  setRecentBuyersShowOnCheckout,
  handleRemoveImage,
  
  headerShowNewsletter,
  setHeaderShowNewsletter,
  headerNewsletterText,
  setHeaderNewsletterText,
  headerShowTopBar,
  setHeaderShowTopBar,
  headerTopBarPhone,
  setHeaderTopBarPhone,
  headerTopBarEmail,
  setHeaderTopBarEmail,

  enableTicker,
  setEnableTicker,
  tickerText,
  setTickerText
}: PremiumTabProps) {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectingType, setSelectingType] = useState<'exit_intent' | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Active Features Checklist Toggle */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4 col-span-1 md:col-span-2">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Enable / Disable Premium Storefront Features</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Toggle individual storefront enhancements. Disabled features will be completely hidden from customers.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recentBuyersEnabled}
              onChange={(e) => setRecentBuyersEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Recent Buyers Ticker</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cookieConsentEnabled}
              onChange={(e) => setCookieConsentEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Cookie Consent Banner</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={freeShippingBarEnabled}
              onChange={(e) => setFreeShippingBarEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Free Shipping Progress Bar</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={volumeDiscountsEnabled}
              onChange={(e) => setVolumeDiscountsEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Volume Discounts Logic</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={frequentlyBoughtTogetherEnabled}
              onChange={(e) => setFrequentlyBoughtTogetherEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Frequently Bought Bundles</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stockUrgencyEnabled}
              onChange={(e) => setStockUrgencyEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Low Stock Urgency</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={flashSaleEnabled}
              onChange={(e) => setFlashSaleEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Flash Sale Countdown</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={socialFeedsEnabled}
              onChange={(e) => setSocialFeedsEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Social Feeds Embeds</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cartTimerEnabled}
              onChange={(e) => setCartTimerEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Cart Expiry Countdown</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sizeGuideEnabled}
              onChange={(e) => setSizeGuideEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Size Guide Modal</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={couponCodesEnabled}
              onChange={(e) => setCouponCodesEnabled(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Store Coupon Discount Field</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableFakeViews}
              onChange={(e) => setEnableFakeViews(e.target.checked)}
              className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
            />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Live Viewer Counter</span>
          </label>
        </div>
      </div>

      {/* Storewide Flash Sale */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#e94560]/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-[#e94560]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Storewide Flash Sale</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure global countdown timer.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Global Start Date & Time</label>
            <input
              type="datetime-local"
              value={flashSaleStartDate ? new Date(new Date(flashSaleStartDate).getTime() - new Date(flashSaleStartDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFlashSaleStartDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-[#e94560] focus:border-[#e94560] bg-white dark:bg-[#16162a] text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Global End Date & Time</label>
            <input
              type="datetime-local"
              value={flashSaleEndDate ? new Date(new Date(flashSaleEndDate).getTime() - new Date(flashSaleEndDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFlashSaleEndDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-[#e94560] focus:border-[#e94560] bg-white dark:bg-[#16162a] text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Global Discount Type</label>
            <select
              value={globalFlashSaleDiscountType}
              onChange={(e) => setGlobalFlashSaleDiscountType(e.target.value as 'percentage' | 'fixed')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-[#e94560] focus:border-[#e94560] bg-white dark:bg-[#16162a] text-gray-900 dark:text-white text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (Rs.)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Global Discount Value</label>
            <input
              type="number"
              value={globalFlashSaleDiscountValue || ''}
              onChange={(e) => setGlobalFlashSaleDiscountValue(parseFloat(e.target.value) || 0)}
              placeholder={globalFlashSaleDiscountType === 'percentage' ? 'e.g. 20' : 'e.g. 500'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-[#e94560] focus:border-[#e94560] bg-white dark:bg-[#16162a] text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <p className="text-[10px] text-gray-500 mt-1">Configure when the flash sale begins and ends, and the storewide discount applied to all products. When active, it overrides individual product sales and displays a unified countdown timer to customers.</p>
      </div>

      {/* Header Announcement & News Bar */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4 col-span-1 md:col-span-2">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">📢 Header Announcement News Bar</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Configure global news bar lines and store contacts displayed at the top of the header.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Sub-card: Marketing News */}
          <div className="space-y-4 p-4 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Marketing Announcement Slider</span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={headerShowNewsletter}
                  onChange={(e) => setHeaderShowNewsletter(e.target.checked)}
                  className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                />
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Announcement Line Items (One per line)</label>
              <textarea
                value={headerNewsletterText}
                onChange={(e) => setHeaderNewsletterText(e.target.value)}
                disabled={!headerShowNewsletter}
                rows={4}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#e94560] disabled:opacity-50"
                placeholder="Summer sale discount off 50%. Shop Sale&#10;Free shipping on orders above Rs. 2,000"
              />
              <span className="text-[10px] text-gray-400">Add multiple lines to automatically rotate them at the top of the storefront.</span>
            </div>
          </div>

          {/* Right Sub-card: Contacts top-bar */}
          <div className="space-y-4 p-4 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-white/5">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Store Contacts Topbar</span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={headerShowTopBar}
                  onChange={(e) => setHeaderShowTopBar(e.target.checked)}
                  className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase block">Topbar Phone Number</label>
                <input
                  type="text"
                  value={headerTopBarPhone}
                  onChange={(e) => setHeaderTopBarPhone(e.target.value)}
                  disabled={!headerShowTopBar}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase block">Topbar Email Address</label>
                <input
                  type="text"
                  value={headerTopBarEmail}
                  onChange={(e) => setHeaderTopBarEmail(e.target.value)}
                  disabled={!headerShowTopBar}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-900 dark:text-white focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Viewer Counter Settings */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Live Viewer Counter</h3>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block mt-0.5">Show real-time simulated viewers to create urgency</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableFakeViews}
              onChange={(e) => setEnableFakeViews(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]" />
          </label>
        </div>

        {enableFakeViews && (
          <div className="space-y-4 pt-1 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Minimum Viewers</label>
                <input
                  type="number"
                  min="1"
                  value={minViews}
                  onChange={(e) => setMinViews(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
                  style={{ borderWidth: 0 }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Maximum Viewers</label>
                <input
                  type="number"
                  min="1"
                  value={maxViews}
                  onChange={(e) => setMaxViews(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
                  style={{ borderWidth: 0 }}
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
              Adjust the min and max viewer boundaries (e.g. 1 to 30) to control the dynamic counter displayed on the product page.
            </p>
          </div>
        )}
      </div>

      {/* Scrolling Announcement Ticker */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Scrolling Announcement Ticker</h3>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold block mt-0.5">Show an infinite scrolling ticker banner on storefront</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableTicker}
              onChange={(e) => setEnableTicker(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e94560]" />
          </label>
        </div>

        {enableTicker && (
          <div className="space-y-3 pt-1 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase block">Ticker Text lines (one per line)</label>
              <textarea
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                rows={4}
                placeholder="Free returns within 30 days&#10;Unlimited delivery for only Rs. 175"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white resize-none"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold leading-relaxed">
                Write one announcement per line. They will scroll in a continuous loop separated by star glyphs.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cart Timer Settings */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Exit Intent Popup (WhatsApp)</h3>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Enable Exit-Intent Popup</label>
          <input
            type="checkbox"
            checked={exitIntentEnabled}
            onChange={(e) => setExitIntentEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-[#e94560] focus:ring-[#e94560] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Popup Header Title</label>
          <input
            type="text"
            value={exitIntentTitle}
            onChange={(e) => setExitIntentTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Popup Description Text</label>
          <textarea
            value={exitIntentText}
            onChange={(e) => setExitIntentText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Coupon Code Awarded</label>
          <input
            type="text"
            value={exitIntentCoupon}
            onChange={(e) => setExitIntentCoupon(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Popup Banner Image</label>
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/30">
            {exitIntentImageUrl ? (
              <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-150 border border-gray-200 dark:border-gray-800 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={exitIntentImageUrl} alt="Exit Intent Preview" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('exit_intent')}
                  className="absolute top-1 right-1 p-1 bg-white/80 dark:bg-black/80 rounded-full text-red-500 hover:text-red-600 transition-all shadow-sm"
                  title="Remove Image"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 flex-shrink-0">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectingType('exit_intent');
                    setIsMediaModalOpen(true);
                  }}
                  className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>Select Media</span>
                </button>
                <span className="text-[10px] text-gray-400">or paste URL below</span>
              </div>
              <input
                type="text"
                value={exitIntentImageUrl}
                onChange={(e) => setExitIntentImageUrl(e.target.value)}
                placeholder="https://example.com/banner.webp"
                className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f0f1b] text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-350">
            <span>Mobile Auto-Trigger Delay</span>
            <span>{exitIntentDelayMobile} seconds</span>
          </div>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={exitIntentDelayMobile}
            onChange={(e) => setExitIntentDelayMobile(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
          />
        </div>
        
        {/* Live Preview Container */}
        {exitIntentEnabled && (
          <div className="mt-6 pt-6 border-t border-gray-150 dark:border-gray-800 space-y-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Live Preview Mockup</span>
            <div className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center text-center relative max-w-sm mx-auto shadow-sm">
              {/* Close Button mockup */}
              <div className="absolute top-3 right-3 text-gray-400 dark:text-gray-600">
                <span className="text-lg font-bold">×</span>
              </div>
              
              {exitIntentImageUrl ? (
                <div className="w-full h-24 mb-3 rounded-xl overflow-hidden bg-white dark:bg-[#16162a] border border-gray-150 dark:border-gray-850 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={exitIntentImageUrl} alt="Preview banner" className="object-contain w-full h-full" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center mb-3">
                  <span className="text-amber-500 font-bold">🏷️</span>
                </div>
              )}
              
              <h4 className="text-sm font-bold text-gray-900 dark:text-white font-serif max-w-[90%] truncate">
                {exitIntentTitle || 'Claim Your Discount!'}
              </h4>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 max-w-[90%] line-clamp-2">
                {exitIntentText || 'Subscribe to get your coupon code.'}
              </p>
              
              <div className="w-full space-y-1.5 mt-4">
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-[10px] text-gray-400 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email Address (Optional)"
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-[10px] text-gray-400 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp Number"
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-[10px] text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled
                  className="w-full py-1.5 bg-[#1a1a2e] dark:bg-amber-600 text-white font-semibold rounded-lg text-[10px] shadow-sm opacity-90 cursor-not-allowed"
                >
                  Claim Coupon Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cookie Consent Banner Config */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Cookie Consent Banner</h3>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Enable Cookie Consent Banner</label>
          <input
            type="checkbox"
            checked={cookieConsentEnabled}
            onChange={(e) => setCookieConsentEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-[#e94560] focus:ring-[#e94560] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Banner Text Description</label>
          <textarea
            value={cookieConsentText}
            onChange={(e) => setCookieConsentText(e.target.value)}
            rows={3}
            placeholder="We use cookies to optimize your experience, analyze traffic..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Accept Button Label</label>
          <input
            type="text"
            value={cookieConsentButtonText}
            onChange={(e) => setCookieConsentButtonText(e.target.value)}
            placeholder="Accept All"
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
      </div>

      {/* Spin to Win Config */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Spin to Win (WhatsApp)</h3>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Enable Spin to Win Wheel</label>
          <input
            type="checkbox"
            checked={spinWheelEnabled}
            onChange={(e) => setSpinWheelEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-[#e94560] focus:ring-[#e94560] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Wheel Slices (Comma-separated, max 6-8)</label>
          <input
            type="text"
            value={spinWheelSegments.join(', ')}
            onChange={(e) => setSpinWheelSegments(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>

        {/* Live Preview Container */}
        {spinWheelEnabled && (
          <div className="mt-6 pt-6 border-t border-gray-150 dark:border-gray-800 space-y-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Live Preview Mockup</span>
            <div className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center text-center relative max-w-sm mx-auto shadow-sm space-y-4">
              {/* Pointer indicator */}
              <div className="relative flex justify-center">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500 drop-shadow" />
                <svg viewBox="0 0 200 200" className="w-32 h-32 drop-shadow-md">
                  {spinWheelSegments.map((seg, idx) => {
                    const num = spinWheelSegments.length || 6;
                    const startAngle = (idx * 360) / num - 90;
                    const endAngle = ((idx + 1) * 360) / num - 90;
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const radius = 90;
                    const cx = 100;
                    const cy = 100;
                    const x1 = cx + radius * Math.cos(startRad);
                    const y1 = cy + radius * Math.sin(startRad);
                    const x2 = cx + radius * Math.cos(endRad);
                    const y2 = cy + radius * Math.sin(endRad);
                    
                    const largeArcFlag = 360 / num > 180 ? 1 : 0;
                    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                    const fill = idx % 2 === 0 ? '#1a1a2e' : '#e94560';
                    
                    const textAngle = startAngle + (360 / num) / 2;
                    const textRad = (textAngle * Math.PI) / 180;
                    const tx = cx + (radius * 0.65) * Math.cos(textRad);
                    const ty = cy + (radius * 0.65) * Math.sin(textRad);
                    
                    return (
                      <g key={idx}>
                        <path d={d} fill={fill} stroke="#ffffff" strokeWidth="1" />
                        <text
                          x={tx}
                          y={ty}
                          fill="#ffffff"
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle + (textAngle > 90 && textAngle < 270 ? 180 : 0)}, ${tx}, ${ty})`}
                        >
                          {seg.length > 8 ? seg.slice(0, 7) + '..' : seg}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="100" cy="100" r="10" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
                  <circle cx="100" cy="100" r="90" fill="none" stroke="#d97706" strokeWidth="3" />
                </svg>
              </div>

              <div className="w-full space-y-1.5">
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-[10px] text-gray-400 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email Address (Optional)"
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-[10px] text-gray-400 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp Number"
                  disabled
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-[10px] text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled
                  className="w-full py-1.5 bg-[#e94560] text-white font-semibold rounded-lg text-[10px] shadow-sm opacity-90 cursor-not-allowed"
                >
                  Spin the Wheel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Urgency & Shipping Thresholds */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Urgency & Shipping Thresholds</h3>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Cart Expiry Reservation Timer (Minutes)</label>
          <input
            type="number"
            value={cartTimerMinutes}
            onChange={(e) => setCartTimerMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Cart Expiry Message Template</label>
          <input
            type="text"
            value={cartTimerMessage}
            onChange={(e) => setCartTimerMessage(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
          <p className="text-[10px] text-gray-500">Use <code>{`{timer}`}</code> as a placeholder for minutes remaining.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Free Shipping Minimum Threshold ({initialSettings.currencySymbol || 'Rs.'})</label>
          <input
            type="number"
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Recently Viewed Limit (Products count)</label>
          <input
            type="number"
            value={recentlyViewedLimit}
            onChange={(e) => setRecentlyViewedLimit(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          />
        </div>
      </div>

      {/* Volume Discounts Logic */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Volume Discounts Logic</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-750 dark:text-gray-300 block">Volume Threshold (items)</label>
            <input
              type="number"
              value={volumeDiscountThreshold}
              onChange={(e) => setVolumeDiscountThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-750 dark:text-gray-300 block">Discount Percentage (%)</label>
            <input
              type="number"
              value={volumeDiscountPercentage}
              onChange={(e) => setVolumeDiscountPercentage(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
            />
          </div>
        </div>
      </div>

      {/* Recent Buyers Advanced Settings */}
      <div className="bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#e94560] uppercase tracking-wider">Recent Buyers Notification Ticker</h3>
        
        {/* Enabled / Disabled status */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Enable Ticker Popups</label>
          <input
            type="checkbox"
            checked={recentBuyersEnabled}
            onChange={(e) => setRecentBuyersEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-[#e94560] focus:ring-[#e94560] cursor-pointer"
          />
        </div>

        {/* Show on Checkout */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Show on Cart & Checkout Pages</label>
          <input
            type="checkbox"
            checked={recentBuyersShowOnCheckout}
            onChange={(e) => setRecentBuyersShowOnCheckout(e.target.checked)}
            className="w-4 h-4 rounded text-[#e94560] focus:ring-[#e94560] cursor-pointer"
          />
        </div>

        {/* Source logic: simulated vs real order data */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-750 dark:text-gray-300 block">Buyer Data Source</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="recent_buyers_source"
                value="simulated"
                checked={recentBuyersSource === 'simulated'}
                onChange={() => setRecentBuyersSource('simulated')}
                className="text-[#e94560] focus:ring-[#e94560]"
              />
              <span>Simulated (Names & Cities lists)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="recent_buyers_source"
                value="real"
                checked={recentBuyersSource === 'real'}
                onChange={() => setRecentBuyersSource('real')}
                className="text-[#e94560] focus:ring-[#e94560]"
              />
              <span>Real Orders (from Database)</span>
            </label>
          </div>
        </div>

        {/* If Simulated: render separate names and cities fields */}
        {recentBuyersSource === 'simulated' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Simulated Buyer Names (Comma/Newline-separated)
              </label>
              <textarea
                value={recentBuyersNames}
                onChange={(e) => setRecentBuyersNames(e.target.value)}
                rows={4}
                placeholder="Ahmad, Fatima, Zainab, Hamza, Ayesha..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Simulated Cities list (Comma/Newline-separated)
              </label>
              <textarea
                value={recentBuyersCities}
                onChange={(e) => setRecentBuyersCities(e.target.value)}
                rows={4}
                placeholder="Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
              />
            </div>
          </div>
        )}

        {/* Product pool logic */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Product Notification Pool</label>
          <select
            value={recentBuyersProductPool}
            onChange={(e) => setRecentBuyersProductPool(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] text-gray-955 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
          >
            <option value="any">Any Active Storefront Product</option>
            <option value="featured">Featured Products Only</option>
            <option value="sale">On Sale Products Only</option>
            <option value="recent">Recently Added Products Only</option>
            <option value="custom">Selected Custom Products</option>
          </select>
        </div>

        {/* Custom Products Checklist container */}
        {recentBuyersProductPool === 'custom' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              Select Products to Show:
            </label>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl max-h-60 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-[#0f0f1b] overscroll-contain">
              {productsList.length === 0 ? (
                <span className="text-xs text-gray-500">Loading products...</span>
              ) : (
                productsList.map((product) => {
                  const isChecked = recentBuyersCustomProducts.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setRecentBuyersCustomProducts(prev => prev.filter(id => id !== product.id));
                          } else {
                            setRecentBuyersCustomProducts(prev => [...prev, product.id]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                      />
                      {product.images?.[0]?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-8 h-8 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-850 dark:text-gray-200 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Rs. {product.price}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Time Controls: Sliders for initial delay, interval, and display duration */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-350">
              <span>Initial delay before first popup</span>
              <span>{recentBuyersInitialDelay} seconds</span>
            </div>
            <input
              type="range"
              min="2"
              max="120"
              step="1"
              value={recentBuyersInitialDelay}
              onChange={(e) => setRecentBuyersInitialDelay(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-350">
              <span>Interval time between popups</span>
              <span>{recentBuyersInterval} seconds</span>
            </div>
            <input
              type="range"
              min="5"
              max="600"
              step="5"
              value={recentBuyersInterval}
              onChange={(e) => setRecentBuyersInterval(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-350">
              <span>Popup display duration visibility</span>
              <span>{recentBuyersDisplayDuration} seconds</span>
            </div>
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={recentBuyersDisplayDuration}
              onChange={(e) => setRecentBuyersDisplayDuration(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
            />
          </div>
        </div>
      </div>

      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          setSelectingType(null);
        }}
        onSelect={(urls) => {
          if (urls.length > 0) {
            if (selectingType === 'exit_intent') {
              setExitIntentImageUrl(urls[0]);
            }
          }
          setIsMediaModalOpen(false);
          setSelectingType(null);
        }}
        multiple={false}
      />
    </div>
  );
}
