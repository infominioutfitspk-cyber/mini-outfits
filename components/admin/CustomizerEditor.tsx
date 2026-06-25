'use client';

import React, { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Category, StoreSettings, Review, HomepageSection } from '@/lib/types';
import { 
  Plus, Trash2, ChevronUp, ChevronDown, Smartphone, Tablet, Monitor, GripVertical, Settings, Check, RefreshCw, Eye, EyeOff, Lock, ChevronLeft, X
} from '@/components/common/Icons';
import { 
  updateHomepageSection, 
  reorderHomepageSections, 
  addHomepageSection, 
  deleteHomepageSection 
} from '@/lib/services/sections';
import { updateSettings } from '@/lib/services/settings';
import { updateProductFields } from '@/lib/services/products';
import { toast } from 'sonner';
import MediaSelectorModal from './MediaSelectorModal';
import HeroBannerSettings from './customizer/sections/HeroBannerSettings';
import ProductGridSettings from './customizer/sections/ProductGridSettings';
import CategoryListSettings from './customizer/sections/CategoryListSettings';
import CategoryGridSettings from './customizer/sections/CategoryGridSettings';
import PromoBannerSettings from './customizer/sections/PromoBannerSettings';
import RecentReviewsSettings from './customizer/sections/RecentReviewsSettings';
import BrandsLogosSettings from './customizer/sections/BrandsLogosSettings';
import SocialFeedSettings from './customizer/sections/SocialFeedSettings';
import FlashSaleSettings from './customizer/sections/FlashSaleSettings';

// New page settings tabs
import ShopPageSettings from './customizer/pages/ShopPageSettings';
import ProductDetailPageSettings from './customizer/pages/ProductDetailPageSettings';
import GlobalSettings from './customizer/pages/GlobalSettings';
import { AppearancePresetsList, AppearanceCustomizePanel } from './customizer/pages/AppearanceSettings';
import ProductCardSettings from './customizer/pages/ProductCardSettings';

interface CustomizerEditorProps {
  initialSections: HomepageSection[];
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  reviews?: Review[];
}

export default function CustomizerEditor({
  initialSections,
  products,
  categories,
  settings,
  reviews = []
}: CustomizerEditorProps) {
  const router = useRouter();
  
  // Customizer States
  const [sections, setSections] = useState<HomepageSection[]>(initialSections);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initialSections.length > 0 ? initialSections[0].id : null
  );
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [mobileTab, setMobileTab] = useState<'preview' | 'sections' | 'settings'>('preview');
  const [isPending, startTransition] = useTransition();

  // New states for page selectors & global settings
  const [activePage, setActivePage] = useState<'home' | 'shop' | 'product_detail' | 'product_card' | 'global' | 'appearance'>('home');
  const [activeSubTab, setActiveSubTab] = useState<string>('');
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(settings);
  const isFirstRender = useRef(true);

  // Local products state for real-time preview sync
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<Product>>>({});
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(null);

  const currentProduct = useMemo(() => {
    const defaultProduct = localProducts[0];
    if (!activeProductSlug) return defaultProduct;
    return localProducts.find(p => p.slug === activeProductSlug) || defaultProduct;
  }, [localProducts, activeProductSlug]);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Set default active sub-tab when switching pages
  useEffect(() => {
    if (activePage === 'shop') {
      setActiveSubTab('swatches');
    } else if (activePage === 'product_detail') {
      setActiveSubTab('layout');
    } else if (activePage === 'global') {
      setActiveSubTab('branding');
    }
  }, [activePage]);

  // Sync state changes down to preview iframe
  useEffect(() => {
    const handleReady = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ready') {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'sync',
            sections,
            settings: storeSettings,
            products: localProducts,
            activeProductSlug,
            activeSectionId
          }, '*');
          iframeRef.current.contentWindow.postMessage({
            type: 'change_page',
            page: activePage
          }, '*');
        }
      }
    };
    window.addEventListener('message', handleReady);
    
    // Direct sync on changes
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'sync',
        sections,
        settings: storeSettings,
        products: localProducts,
        activeProductSlug,
        activeSectionId
      }, '*');
      iframeRef.current.contentWindow.postMessage({
        type: 'change_page',
        page: activePage
      }, '*');
    }

    return () => window.removeEventListener('message', handleReady);
  }, [sections, storeSettings, activePage, localProducts, activeProductSlug, activeSectionId]);

  // Auto-save settings to DB when storeSettings changes (debounced 1s)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await updateSettings(storeSettings);
      } catch {
        // Silently fail — user can still manually save
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [storeSettings]);

  // Listen for active section selection from preview iframe clicks
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.type === 'select_section') {
          setActivePage('home');
          setActiveSectionId(event.data.sectionId);
        } else if (event.data.type === 'select_global_tab') {
          setActivePage('global');
          setActiveSubTab(event.data.subTab);
          setActiveSectionId(null);
        } else if (event.data.type === 'select_product_detail_tab') {
          setActivePage('product_detail');
          setActiveSubTab(event.data.subTab);
          const blockMap: Record<string, string> = {
            swatches: 'details',
            ticker: 'ticker',
            urgency: 'reviews',
            delivery: 'related',
            recently_viewed: 'recently_viewed',
            social_feed: 'social_feed'
          };
          setActiveSectionId(blockMap[event.data.subTab] || null);
        } else if (event.data.type === 'nav_to_page') {
          const newPage = event.data.page;
          setActivePage(newPage);
          if (newPage === 'home') {
            setActiveSectionId(sections[0]?.id || null);
            setActiveSubTab('');
          } else if (newPage === 'product_detail') {
            if (event.data.href) {
              const slug = event.data.href.replace('/product/', '').split('?')[0];
              setActiveProductSlug(slug);
            }
            const firstBlock = (storeSettings.productPageLayout || ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed'])[0];
            setActiveSectionId(firstBlock);
            const tabMap: Record<string, string> = {
              details: 'swatches',
              ticker: 'ticker',
              reviews: 'urgency',
              related: 'delivery',
              recently_viewed: 'recently_viewed',
              social_feed: 'social_feed'
            };
            setActiveSubTab(tabMap[firstBlock] || 'swatches');
          } else if (newPage === 'shop') {
            setActiveSectionId(null);
            setActiveSubTab('swatches');
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sections, storeSettings.productPageLayout]);

  // Send scroll command to preview iframe when active section changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow && activeSectionId && (activePage === 'home' || activePage === 'product_detail')) {
        iframeRef.current.contentWindow.postMessage({
          type: 'scroll_to_section',
          sectionId: activeSectionId
        }, '*');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [activeSectionId, activePage]);

  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [containerHeight, setContainerHeight] = useState<number>(700);
  const previewContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Active section helper
  const activeSection = useMemo(() => {
    return sections.find(s => s.id === activeSectionId) || null;
  }, [sections, activeSectionId]);

  // Handle section value changes
  const handleUpdateSection = (id: string, updates: Partial<HomepageSection>) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...updates,
          settings: { ...s.settings, ...(updates.settings || {}) },
          content_data: { ...s.content_data, ...(updates.content_data || {}) }
        };
      }
      return s;
    }));
  };

  // Reorder sections
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    
    // Swap
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Recalculate sort orders
    const reordered = newSections.map((sec, idx) => ({
      ...sec,
      sort_order: idx + 1
    }));

    setSections(reordered);
  };

  // Delete section
  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    startTransition(async () => {
      try {
        await deleteHomepageSection(id);
        setSections(prev => prev.filter(s => s.id !== id));
        if (activeSectionId === id) {
          setActiveSectionId(sections.length > 1 ? sections.find(s => s.id !== id)?.id || null : null);
        }
        toast.success('Section deleted successfully');
      } catch (err) {
        toast.error('Failed to delete section');
      }
    });
  };

  // Add new section
  const handleAddSection = async (type: string) => {
    const defaultTitles: Record<string, string> = {
      hero_banner: 'Promo Slider',
      product_grid: 'Featured Products',
      category_list: 'Shop By Category',
      category_grid: 'Featured Collection Highlights',
      promo_banner: 'Limited Time Deal',
      trust_badges: 'Our Promises',
      recent_reviews: 'Customer Reviews',
      brands_logos: 'Our Premium Partners',
      flash_sale: 'Super Flash Sale'
    };

    startTransition(async () => {
      try {
        const newSec = await addHomepageSection(type, defaultTitles[type] || 'New Section');
        setSections(prev => [...prev, newSec]);
        setActiveSectionId(newSec.id);
        toast.success('Section added successfully');
      } catch (err) {
        toast.error('Failed to add section');
      }
    });
  };

  // Media Selector State
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaSelectCallback, setMediaSelectCallback] = useState<((url: string) => void) | null>(null);
  const [mediaUploadTarget, setMediaUploadTarget] = useState<{
    sectionId: string;
    fieldPath: 'settings' | 'content_data';
    fieldKey: string;
    isGridItem?: boolean;
    gridIndex?: number;
    isSlide?: boolean;
    slideId?: string;
  } | null>(null);

  const handleMediaSelected = (urls: string[]) => {
    if (urls.length === 0) return;
    const url = urls[0];

    if (mediaSelectCallback) {
      mediaSelectCallback(url);
      setMediaSelectCallback(null);
      setIsMediaModalOpen(false);
      return;
    }

    if (!mediaUploadTarget) return;
    const { sectionId, fieldPath, fieldKey, isGridItem, gridIndex, isSlide, slideId } = mediaUploadTarget;

    if (sectionId === 'global') {
      setStoreSettings(prev => ({
        ...prev,
        [fieldKey]: url
      }));
      return;
    }

    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (isSlide && slideId) {
      const slides = section.content_data?.slides || [];
      const updatedSlides = slides.map((s: any) => s.id === slideId ? { ...s, [fieldKey]: url } : s);
      handleUpdateSection(sectionId, {
        content_data: {
          ...section.content_data,
          slides: updatedSlides
        }
      });
    } else if (isGridItem && gridIndex !== undefined) {
      const items = section.content_data?.items || [];
      const updatedItems = [...items];
      updatedItems[gridIndex] = { ...updatedItems[gridIndex], [fieldKey]: url };
      handleUpdateSection(sectionId, { content_data: { items: updatedItems } });
    } else {
      const updates: Partial<HomepageSection> = {};
      if (fieldPath === 'settings') {
        updates.settings = { ...section.settings, [fieldKey]: url };
      } else {
        updates.content_data = { ...section.content_data, [fieldKey]: url };
      }
      handleUpdateSection(sectionId, updates);
    }
  };

  // Update product sale settings handler
  const handleUpdateProductSale = (productId: string, updates: Partial<Product>) => {
    setLocalProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, ...updates };
      }
      return p;
    }));
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        ...updates
      }
    }));
  };

  // Save layout & settings state to db
  const handleSaveLayout = () => {
    startTransition(async () => {
      try {
        // 1. Save sort order
        const orderPayload = sections.map((s, idx) => ({ id: s.id, sort_order: idx + 1 }));
        await reorderHomepageSections(orderPayload);

        // 2. Update individual sections settings/content
        const updatePromises = sections.map(sec => 
          updateHomepageSection(sec.id, {
            title: sec.title,
            active: sec.active,
            settings: sec.settings,
            content_data: sec.content_data
          })
        );

        await Promise.all(updatePromises);

        // 3. Save global settings
        await updateSettings(storeSettings);

        // 4. Save product sales overrides
        const productUpdates = Object.entries(editedProducts).map(([id, updates]) =>
          updateProductFields(id, updates)
        );
        await Promise.all(productUpdates);

        setEditedProducts({});
        toast.success('Customizer settings and layout saved successfully');
      } catch (err) {
        toast.error('Failed to save layout adjustments and settings');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-[#0f0f1b] select-none text-gray-900 dark:text-gray-100">
      
      {/* 1. TOP HEADER BAR */}
      <header className="h-16 bg-[#1a1a2e] text-white border-b border-white/10 flex items-center justify-between px-3 sm:px-6 z-50 shadow-md flex-shrink-0 gap-1">
        {/* Left: Back to Dashboard & Page Selector */}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white px-2 sm:px-3 py-1.5 hover:bg-white/5 rounded-xl transition-all font-bold text-xs cursor-pointer select-none shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <div className="w-[1px] h-6 bg-white/10 hidden sm:block shrink-0" />
          <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 mr-2 shrink-0">
            <span className="text-xs font-black tracking-wider text-white uppercase">{storeSettings.storeName || 'Zaynahs'}</span>
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Theme Customizer</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10 hidden sm:block shrink-0" />
          
          {/* Page Selector dropdown */}
          <div 
            className="flex items-center border px-2 sm:px-3 py-1.5 rounded-xl gap-1 sm:gap-2 text-xs font-bold text-white min-w-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', borderColor: 'rgba(0, 0, 0, 0.15)' }}
          >
            <span className="text-white/80 hidden md:inline shrink-0">Page:</span>
            <select
              value={activePage}
              onChange={(e) => {
                const newPage = e.target.value as 'home' | 'shop' | 'product_detail' | 'product_card' | 'global' | 'appearance';
                setActivePage(newPage);
                if (newPage === 'home') {
                  setActiveSectionId(sections[0]?.id || null);
                  setActiveSubTab('');
                } else if (newPage === 'product_detail') {
                  const firstBlock = (storeSettings.productPageLayout || ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed'])[0];
                  setActiveSectionId(firstBlock);
                  const tabMap: Record<string, string> = {
                    details: 'swatches',
                    ticker: 'ticker',
                    reviews: 'urgency',
                    related: 'delivery'
                  };
                  setActiveSubTab(tabMap[firstBlock] || 'swatches');
                } else if (newPage === 'shop') {
                  setActiveSectionId(null);
                  setActiveSubTab('swatches');
                } else if (newPage === 'product_card') {
                  setActiveSectionId(null);
                  setActiveSubTab('');
                } else if (newPage === 'global') {
                  setActiveSectionId(null);
                  setActiveSubTab('branding');
                } else if (newPage === 'appearance') {
                  setActiveSectionId(null);
                  setActiveSubTab('');
                }
              }}
              className="bg-transparent border-none focus:ring-0 text-white font-black cursor-pointer outline-none truncate max-w-[100px] sm:max-w-none"
            >
              <option value="home" className="bg-[#1a1a2e] text-white">Home Page</option>
              <option value="shop" className="bg-[#1a1a2e] text-white">Shop Page</option>
              <option value="product_detail" className="bg-[#1a1a2e] text-white">Product Details</option>
              <option value="product_card" className="bg-[#1a1a2e] text-white">Product Cards</option>
              <option value="global" className="bg-[#1a1a2e] text-white">Global Settings</option>
              <option value="appearance" className="bg-[#1a1a2e] text-white">Appearance / Presets</option>
            </select>
          </div>
        </div>

        {/* Center: Viewport Switcher */}
        <div 
          className="flex border p-0.5 rounded-xl shrink-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', borderColor: 'rgba(0, 0, 0, 0.15)' }}
        >
          <button
            onClick={() => setViewportMode('desktop')}
            className={`px-1.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              viewportMode === 'desktop'
                ? 'bg-[#e94560] text-white shadow-sm'
                : 'text-white/75 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewportMode('tablet')}
            className={`px-1.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              viewportMode === 'tablet'
                ? 'bg-[#e94560] text-white shadow-sm'
                : 'text-white/75 hover:text-white'
            }`}
          >
            <Tablet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setViewportMode('mobile')}
            className={`px-1.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1 sm:gap-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              viewportMode === 'mobile'
                ? 'bg-[#e94560] text-white shadow-sm'
                : 'text-white/75 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Save Button */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            onClick={handleSaveLayout}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2 sm:px-4 py-2 bg-[#e94560] hover:bg-[#d83550] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Save Layout</span>
          </button>
        </div>
      </header>

      {/* 2. THREE-COLUMN WORKSPACE */}
      <div className="flex-grow flex flex-row overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* LEFT COLUMN: Sections & Add Widgets */}
        <aside className={`w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[#16162a] border-r border-gray-200 dark:border-gray-800 overflow-hidden h-full ${mobileTab === 'sections' ? 'fixed inset-0 z-50' : 'hidden'} md:flex md:static md:z-auto`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/2 bg-surface-2 flex-shrink-0 flex items-center justify-between">
            <h3 className="font-extrabold text-xs tracking-wider text-gray-900 dark:text-white uppercase">
              {activePage === 'home' ? 'Sections Stack' : `${activePage.replace('_', ' ')} Properties`}
            </h3>
            <button
              onClick={() => setMobileTab('preview')}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activePage === 'home' ? (
              <>
                {/* Add section widget */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                    + Add Layout Section
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { type: 'hero_banner', label: 'Promo Slider' },
                      { type: 'product_grid', label: 'Product Grid' },
                      { type: 'category_list', label: 'Category Filter' },
                      { type: 'category_grid', label: 'Category Grid' },
                      { type: 'promo_banner', label: 'Promo Banner' },
                      { type: 'trust_badges', label: 'Trust Badges' },
                      { type: 'recent_reviews', label: 'Reviews Feed' },
                      { type: 'brands_logos', label: 'Brands Slider' },
                      { type: 'social_feed', label: 'Social Feed' },
                      { type: 'ticker', label: 'Scrolling Ticker' },
                      { type: 'flash_sale', label: 'Flash Sale Grid' }
                    ].map(item => {
                      const isFeatureDisabled = 
                        (item.type === 'social_feed' && storeSettings.social_feeds_enabled === false) ||
                        (item.type === 'flash_sale' && storeSettings.flash_sale_enabled === false);
                      
                      return (
                        <button
                          key={item.type}
                          onClick={() => {
                            if (isFeatureDisabled) {
                              const featureName = item.type === 'social_feed' ? 'Social Feeds' : 'Flash Sale';
                              toast.error(`🔒 ${featureName} is disabled! Enable it in Settings > Premium Tab.`);
                              return;
                            }
                            handleAddSection(item.type);
                          }}
                          className={`px-2.5 py-1.5 text-left border rounded-xl transition-all text-xs font-bold ${
                            isFeatureDisabled
                              ? 'bg-gray-100/50 dark:bg-gray-950/40 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-650 cursor-not-allowed'
                              : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-gray-800/80 hover:border-[#e94560] dark:hover:border-[#e94560] text-gray-700 dark:text-gray-300 active:scale-97 cursor-pointer'
                          }`}
                        >
                          {isFeatureDisabled ? `🔒 ${item.label}` : item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Announcement Bar Widget Shortcut */}
                <div
                  onClick={() => {
                    setActiveSectionId('announcement_bar');
                    setActivePage('home');
                  }}
                  className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer mb-4 ${
                    activeSectionId === 'announcement_bar'
                      ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📢</span>
                    <div className="min-w-0 flex-grow">
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        Announcement News Bar
                      </div>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                        Permanent Header Banner
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Stack */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                    Section Layout Order
                  </label>
                  
                  {sections.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-semibold text-gray-400">
                      No custom sections added yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sections.map((section, idx) => {
                        const isActive = activeSectionId === section.id;
                        return (
                          <div
                            key={section.id}
                            onClick={() => setActiveSectionId(section.id)}
                            className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer ${
                              isActive
                                ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm'
                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                              {(() => {
                                const isFeatureDisabled = 
                                  (section.section_type === 'social_feed' && storeSettings.social_feeds_enabled === false) ||
                                  (section.section_type === 'flash_sale' && storeSettings.flash_sale_enabled === false);

                                return (
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-xs font-bold truncate ${isFeatureDisabled ? 'text-gray-450 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                      {isFeatureDisabled ? '🔒 ' : ''}{section.title || section.section_type}
                                    </div>
                                    <span className="text-[9px] text-gray-455 dark:text-gray-500 font-bold uppercase tracking-wider">
                                      {section.section_type.replace('_', ' ')} {isFeatureDisabled && '(Disabled)'}
                                    </span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleUpdateSection(section.id, { active: !section.active })}
                                className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 ${
                                  section.active ? 'text-[#e94560]' : 'text-gray-400'
                                } cursor-pointer`}
                                title={section.active ? 'Hide layout' : 'Show layout'}
                              >
                                {section.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveSection(idx, 'up')}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                disabled={idx === sections.length - 1}
                                onClick={() => handleMoveSection(idx, 'down')}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(section.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : activePage === 'shop' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                  Shop Page Properties
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'swatches', label: 'Color Swatches', desc: 'Display product variant colors on list cards' },
                    { id: 'layout', label: 'Product Layout', desc: 'Grid aspect ratio, line limit, hover style' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`w-full text-left p-3 border rounded-xl transition-all cursor-pointer ${
                        activeSubTab === tab.id
                          ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {tab.label}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                        {tab.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : activePage === 'product_detail' ? (
              <div className="space-y-4">
                {/* Product Sale Configuration Tab */}
                {(() => {
                  const isFlashSaleDisabled = storeSettings.flash_sale_enabled === false;
                  return (
                    <div
                      onClick={() => {
                        setActiveSectionId(null);
                        setActiveSubTab('product_sale');
                      }}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer mb-4 ${
                        activeSubTab === 'product_sale'
                          ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏷️</span>
                        <div className="min-w-0 flex-grow">
                          <div className={`text-xs font-bold ${isFlashSaleDisabled ? 'text-gray-450 dark:text-gray-500 line-through font-semibold' : 'text-gray-900 dark:text-white'}`}>
                            {isFlashSaleDisabled ? '🔒 ' : ''}Product Sale Settings
                          </div>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block truncate max-w-[150px]">
                            {isFlashSaleDisabled ? 'Disabled' : (currentProduct?.name || 'No Product Active')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                    Product Detail Blocks Stack
                  </label>
                  
                  {/* Blocks List */}
                  <div className="space-y-2">
                    {(storeSettings.productPageLayout || ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed']).map((blockId, idx, arr) => {
                      const blockLabels: Record<string, string> = {
                        details: 'Product Details Component',
                        ticker: 'Scrolling Announcement Ticker',
                        reviews: 'Reviews & FAQ Feed',
                        related: 'Related Products Grid',
                        recently_viewed: 'Recently Viewed Products',
                        social_feed: 'Social Feed Ribbon'
                      };
                      const isActive = activeSectionId === blockId;
                      return (
                        <div
                          key={blockId}
                          onClick={() => {
                            setActiveSectionId(blockId);
                            const tabMap: Record<string, string> = {
                              details: 'swatches',
                              ticker: 'ticker',
                              reviews: 'urgency',
                              related: 'delivery',
                              recently_viewed: 'recently_viewed',
                              social_feed: 'social_feed'
                            };
                            setActiveSubTab(tabMap[blockId] || 'swatches');
                          }}
                          className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer ${
                            isActive
                              ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              {(() => {
                                const isFeatureDisabled = 
                                  (blockId === 'social_feed' && storeSettings.social_feeds_enabled === false);

                                return (
                                  <div className="min-w-0 flex-1">
                                    <div className={`text-xs font-bold truncate ${isFeatureDisabled ? 'text-gray-450 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                      {isFeatureDisabled ? '🔒 ' : ''}{blockLabels[blockId] || blockId}
                                    </div>
                                    <span className="text-[9px] text-gray-455 dark:text-gray-500 font-bold uppercase tracking-wider">
                                      {blockId} {isFeatureDisabled && '(Disabled)'}
                                    </span>
                                  </div>
                                );
                              })()}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const newLayout = arr.filter(b => b !== blockId);
                                setStoreSettings(prev => ({ ...prev, productPageLayout: newLayout }));
                                if (activeSectionId === blockId) {
                                  setActiveSectionId(null);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer animate-none"
                              title="Hide block"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={idx === 0}
                              onClick={() => {
                                const newLayout = [...arr];
                                const temp = newLayout[idx];
                                newLayout[idx] = newLayout[idx - 1];
                                newLayout[idx - 1] = temp;
                                setStoreSettings(prev => ({ ...prev, productPageLayout: newLayout }));
                              }}
                              className="p-1 text-gray-400 hover:text-gray-650 dark:hover:text-white disabled:opacity-30 cursor-pointer animate-none"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={idx === arr.length - 1}
                              onClick={() => {
                                const newLayout = [...arr];
                                const temp = newLayout[idx];
                                newLayout[idx] = newLayout[idx + 1];
                                newLayout[idx + 1] = temp;
                                setStoreSettings(prev => ({ ...prev, productPageLayout: newLayout }));
                              }}
                              className="p-1 text-gray-400 hover:text-gray-650 dark:hover:text-white disabled:opacity-30 cursor-pointer animate-none"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Block Widget */}
                {(() => {
                  const currentLayout = storeSettings.productPageLayout || ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed'];
                  const availableBlocks = [
                    { id: 'details', label: 'Product Details Component' },
                    { id: 'ticker', label: 'Scrolling Announcement Ticker' },
                    { id: 'reviews', label: 'Reviews & FAQ Feed' },
                    { id: 'related', label: 'Related Products Grid' },
                    { id: 'recently_viewed', label: 'Recently Viewed Products' },
                    { id: 'social_feed', label: 'Social Feed Ribbon' }
                  ].filter(b => !currentLayout.includes(b.id));

                  if (availableBlocks.length === 0) return null;

                  return (
                    <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                        + Add Page Block
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableBlocks.map(block => {
                          const isFeatureDisabled = 
                            (block.id === 'social_feed' && storeSettings.social_feeds_enabled === false);

                          return (
                            <button
                              key={block.id}
                              onClick={() => {
                                if (isFeatureDisabled) {
                                  toast.error("🔒 Social Feeds is disabled! Enable it in Settings > Premium Tab.");
                                  return;
                                }
                                const newLayout = [...currentLayout, block.id];
                                setStoreSettings(prev => ({ ...prev, productPageLayout: newLayout }));
                                setActiveSectionId(block.id);
                                const tabMap: Record<string, string> = {
                                  details: 'swatches',
                                  ticker: 'ticker',
                                  reviews: 'urgency',
                                  related: 'delivery',
                                  recently_viewed: 'recently_viewed',
                                  social_feed: 'social_feed'
                                };
                                setActiveSubTab(tabMap[block.id] || 'swatches');
                              }}
                              className={`px-2.5 py-1.5 text-left border rounded-xl transition-all text-[10px] font-bold truncate ${
                                isFeatureDisabled
                                  ? 'bg-gray-105/50 dark:bg-gray-950/40 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-650 cursor-not-allowed'
                                  : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-gray-800/80 hover:border-[#e94560] dark:hover:border-[#e94560] text-gray-700 dark:text-gray-300 cursor-pointer'
                              }`}
                            >
                              {isFeatureDisabled ? '🔒 ' : ''}{block.label.replace(' Component', '').replace(' Grid', '').replace(' Feed', '')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : activePage === 'appearance' ? (
              <AppearancePresetsList
                settings={storeSettings}
                onSelectPreset={(presetId, presetConfig) => {
                  setStoreSettings(prev => ({
                    ...prev,
                    theme_preset: presetId,
                    theme_config: presetConfig
                  }));
                }}
              />
            ) : activePage === 'product_card' ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                    Product Cards Design
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                    Choose templates and configure card layout preferences applied globally to all catalog grids, shop listings, and recommended sliders.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                  Global Store Settings
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'branding', label: 'Store Branding', desc: 'Upload store logo and favicon details' },
                    { id: 'header', label: 'Header & Topbar', desc: 'Stickiness, newsletter banners, phone/email' },
                    { id: 'footer', label: 'Footer & Social', desc: 'Copyright messages, social handles links' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`w-full text-left p-3 border rounded-xl transition-all cursor-pointer ${
                        activeSubTab === tab.id
                          ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/10 shadow-sm'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {tab.label}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                        {tab.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Fluid Live Preview */}
        <main className={`flex-grow bg-gray-100 dark:bg-[#0f0f1b]/30 overflow-hidden flex flex-col h-full ${mobileTab !== 'preview' ? 'hidden' : ''} md:flex`}>
          <div 
            ref={previewContainerRef}
            className="flex-1 overflow-auto p-6 flex justify-center items-center h-full"
          >
            {viewportMode === 'desktop' ? (
              (() => {
                const desktopScreenWidth = 1280;
                const desktopScreenHeight = 800;
                const desktopScale = Math.min(
                  1,
                  (containerWidth - 32) / desktopScreenWidth,
                  (containerHeight - 32) / desktopScreenHeight
                );

                return (
                  <div
                    style={{
                      width: `${desktopScreenWidth * desktopScale}px`,
                      height: `${desktopScreenHeight * desktopScale}px`,
                      transition: 'all 0.3s ease',
                    }}
                    className="relative mx-auto"
                  >
                    <div
                      style={{
                        width: `${desktopScreenWidth}px`,
                        height: `${desktopScreenHeight}px`,
                        transform: `scale(${desktopScale})`,
                        transformOrigin: 'top left',
                      }}
                      className="absolute top-0 left-0 overflow-hidden shadow-2xl bg-white dark:bg-[#0f0f1b] rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col"
                    >
                      {/* Browser header bar decoration */}
                      <div className="h-8 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-1.5 flex-shrink-0 select-none">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <div className="ml-4 flex-1 max-w-sm bg-white dark:bg-[#0f0f1b] text-[10px] text-gray-400 rounded px-3 py-0.5 border border-gray-200 dark:border-gray-800 truncate text-center">
                          https://{storeSettings.storeName?.toLowerCase().replace(/\s+/g, '') || 'zaynahs'}.pk
                        </div>
                      </div>
                      <iframe
                        ref={iframeRef}
                        src="/admin/settings/customizer/preview"
                        className="flex-grow border-none"
                        style={{
                          width: `${desktopScreenWidth}px`,
                          maxWidth: 'none',
                          height: '100%',
                        }}
                      />
                    </div>
                  </div>
                );
              })()
            ) : viewportMode === 'mobile' ? (
              (() => {
                const mobileScreenWidth = 375;
                const mobileScreenHeight = 700;
                const mobileMockupWidth = mobileScreenWidth + 24; // 399
                const mobileMockupHeight = mobileScreenHeight + 24; // 724
                const mobileScale = Math.min(
                  1,
                  (containerWidth - 32) / mobileMockupWidth,
                  (containerHeight - 32) / mobileMockupHeight
                );

                return (
                  <div
                    style={{
                      width: `${mobileMockupWidth * mobileScale}px`,
                      height: `${mobileMockupHeight * mobileScale}px`,
                      transition: 'all 0.3s ease',
                    }}
                    className="relative mx-auto"
                  >
                    <div
                      style={{
                        width: `${mobileMockupWidth}px`,
                        height: `${mobileMockupHeight}px`,
                        transform: `scale(${mobileScale})`,
                        transformOrigin: 'top left',
                      }}
                      className="absolute top-0 left-0 overflow-hidden shadow-2xl bg-white dark:bg-[#0f0f1b] rounded-[36px] border-[12px] border-gray-800 dark:border-gray-900 flex flex-col scrollbar-none"
                    >
                      {/* Camera Notch decoration */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-32 bg-gray-800 dark:bg-gray-900 rounded-b-xl z-50 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-black rounded-full" />
                      </div>
                      <iframe
                        ref={iframeRef}
                        src="/admin/settings/customizer/preview"
                        className="flex-1 border-none"
                        style={{
                          width: `${mobileScreenWidth}px`,
                          maxWidth: 'none',
                          height: '100%',
                        }}
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const tabletScreenWidth = 800;
                const tabletScreenHeight = 1024;
                const tabletMockupWidth = tabletScreenWidth + 24; // 824
                const tabletMockupHeight = tabletScreenHeight + 24; // 1048
                const tabletScale = Math.min(
                  1,
                  (containerWidth - 32) / tabletMockupWidth,
                  (containerHeight - 32) / tabletMockupHeight
                );

                return (
                  <div
                    style={{
                      width: `${tabletMockupWidth * tabletScale}px`,
                      height: `${tabletMockupHeight * tabletScale}px`,
                      transition: 'all 0.3s ease',
                    }}
                    className="relative mx-auto"
                  >
                    <div
                      style={{
                        width: `${tabletMockupWidth}px`,
                        height: `${tabletMockupHeight}px`,
                        transform: `scale(${tabletScale})`,
                        transformOrigin: 'top left',
                      }}
                      className="absolute top-0 left-0 overflow-hidden shadow-2xl bg-white dark:bg-[#0f0f1b] rounded-[24px] border-[12px] border-gray-800 dark:border-gray-900 flex flex-col"
                    >
                      {/* iPad Speaker / Camera decoration */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-16 bg-gray-800 dark:bg-gray-900 rounded-b-lg z-50 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-black rounded-full" />
                      </div>
                      <iframe
                        ref={iframeRef}
                        src="/admin/settings/customizer/preview"
                        className="flex-1 border-none"
                        style={{
                          width: `${tabletScreenWidth}px`,
                          maxWidth: 'none',
                          height: '100%',
                        }}
                      />
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: Settings Adjustment Panel */}
        <aside className={`w-96 flex-shrink-0 flex flex-col bg-white dark:bg-[#16162a] border-l border-gray-200 dark:border-gray-800 overflow-hidden h-full ${mobileTab === 'settings' ? 'fixed inset-0 z-50' : 'hidden'} md:flex md:static md:z-auto`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/2 bg-surface-2 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-[#e94560]" />
              <h3 className="font-extrabold text-xs tracking-wider text-gray-900 dark:text-white uppercase">
                {activePage === 'home' ? 'Section Settings' : `${activePage.replace('_', ' ')} Settings`}
              </h3>
            </div>
            <button
              onClick={() => setMobileTab('preview')}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activePage === 'home' ? (
              activeSectionId === 'announcement_bar' ? (
                <div className="space-y-6">
                  {/* Header title */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block leading-none mb-1">Editing Section</span>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                        Announcement Bar
                      </h4>
                    </div>
                    <span className="text-[9px] font-black text-[#e94560] bg-[#e94560]/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
                      Top News Banner
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Show Contacts Announcement Bar</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={storeSettings.headerShowTopBar}
                        onChange={(e) => setStoreSettings(prev => ({ ...prev, headerShowTopBar: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
                    </label>
                  </div>

                  {storeSettings.headerShowTopBar && (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">Header Bar Phone</label>
                        <input
                          type="text"
                          value={storeSettings.headerTopBarPhone || ''}
                          onChange={(e) => setStoreSettings(prev => ({ ...prev, headerTopBarPhone: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-800 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">Header Bar Email</label>
                        <input
                          type="text"
                          value={storeSettings.headerTopBarEmail || ''}
                          onChange={(e) => setStoreSettings(prev => ({ ...prev, headerTopBarEmail: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-800 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Show Marketing Announcement Bar</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={storeSettings.headerShowNewsletter}
                        onChange={(e) => setStoreSettings(prev => ({ ...prev, headerShowNewsletter: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
                    </label>
                  </div>

                  {storeSettings.headerShowNewsletter && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">Announcement Text (one per line)</label>
                      <textarea
                        rows={4}
                        value={storeSettings.headerNewsletterText || ''}
                        onChange={(e) => setStoreSettings(prev => ({ ...prev, headerNewsletterText: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                  )}
                </div>
              ) : activeSection ? (
                <div className="space-y-6">
                  
                  {/* Header title */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block leading-none mb-1">Editing Section</span>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                        {activeSection.title || activeSection.section_type.replace('_', ' ')}
                      </h4>
                    </div>
                    <span className="text-[9px] font-black text-[#e94560] bg-[#e94560]/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
                      {activeSection.section_type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Section title parameter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={activeSection.title || ''}
                      onChange={e => handleUpdateSection(activeSection.id, { title: e.target.value })}
                      placeholder="e.g. Featured Collection"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Specific settings based on section_type */}
                  {activeSection.section_type === 'hero_banner' && (
                    <HeroBannerSettings
                      section={activeSection}
                      viewportMode={viewportMode}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                      onSelectMedia={(fieldPath, fieldKey, isSlide, slideId) => {
                        setMediaUploadTarget({ sectionId: activeSection.id, fieldPath, fieldKey, isSlide, slideId });
                        setIsMediaModalOpen(true);
                      }}
                    />
                  )}

                  {activeSection.section_type === 'product_grid' && (
                    <ProductGridSettings
                      section={activeSection}
                      categories={categories}
                      products={products}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                    />
                  )}

                  {activeSection.section_type === 'category_list' && (
                    <CategoryListSettings
                      section={activeSection}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                    />
                  )}

                  {activeSection.section_type === 'category_grid' && (
                    <CategoryGridSettings
                      section={activeSection}
                      categories={categories}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                      onSelectMedia={(fieldPath, fieldKey, isGridItem, gridIndex) => {
                        setMediaUploadTarget({ sectionId: activeSection.id, fieldPath, fieldKey, isGridItem, gridIndex });
                        setIsMediaModalOpen(true);
                      }}
                    />
                  )}

                  {activeSection.section_type === 'promo_banner' && (
                    <PromoBannerSettings
                      section={activeSection}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                    />
                  )}

                  {activeSection.section_type === 'trust_badges' && (
                    <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-start gap-2">
                      <Lock className="h-4 w-4 text-[#e94560] flex-shrink-0 mt-0.5" />
                      <span>
                        Individual badges, descriptions, and icons are controlled in the General Settings &gt; Premium Features tab. Customize them there.
                      </span>
                    </div>
                  )}

                  {activeSection.section_type === 'recent_reviews' && (
                    <RecentReviewsSettings
                      section={activeSection}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                    />
                  )}

                  {activeSection.section_type === 'brands_logos' && (
                    <BrandsLogosSettings
                      section={activeSection}
                      onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                    />
                  )}

                  {activeSection.section_type === 'social_feed' && (
                    storeSettings.social_feeds_enabled === false ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-white/2 py-12">
                        <span className="text-3xl">🔒</span>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Social Feed Locked</h4>
                        <p className="text-[11px] text-gray-500 leading-normal max-w-[200px]">
                          This feature is disabled in your store settings. Please enable &quot;Social Feeds Embeds&quot; in Settings &gt; Premium Tab first.
                        </p>
                      </div>
                    ) : (
                      <SocialFeedSettings
                        section={activeSection}
                        onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                        onSelectMedia={(onSelect) => {
                          setMediaSelectCallback(() => onSelect);
                          setIsMediaModalOpen(true);
                        }}
                      />
                    )
                  )}

                  {activeSection.section_type === 'ticker' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Enable Scrolling Ticker</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={storeSettings.enableTicker}
                            onChange={(e) => setStoreSettings(prev => ({ ...prev, enableTicker: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
                        </label>
                      </div>

                      {storeSettings.enableTicker && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">Ticker Lines (One per line)</label>
                          <textarea
                            rows={4}
                            value={storeSettings.tickerText || ''}
                            onChange={(e) => setStoreSettings(prev => ({ ...prev, tickerText: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white resize-none"
                            placeholder="Free returns within 30 days&#10;Unlimited delivery for only Rs. 175"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection.section_type === 'flash_sale' && (
                    storeSettings.flash_sale_enabled === false ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-white/2 py-12">
                        <span className="text-3xl">🔒</span>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Flash Sale Locked</h4>
                        <p className="text-[11px] text-gray-500 leading-normal max-w-[200px]">
                          This feature is disabled in your store settings. Please enable &quot;Flash Sale Timers&quot; in Settings &gt; Premium Tab first.
                        </p>
                      </div>
                    ) : (
                      <FlashSaleSettings
                        section={activeSection}
                        products={products}
                        categories={categories}
                        onUpdateSection={(updates) => handleUpdateSection(activeSection.id, updates)}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <Settings className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">No Section Selected</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1.5 max-w-[220px] leading-relaxed">
                      Click a section in the left stack or directly on the live storefront preview to begin editing properties.
                    </p>
                  </div>
                </div>
              )
            ) : activePage === 'shop' ? (
              <ShopPageSettings
                settings={storeSettings}
                onUpdateSettings={(updates) => setStoreSettings(prev => ({ ...prev, ...updates }))}
                subTab={activeSubTab as 'swatches' | 'layout'}
              />
            ) : activePage === 'product_detail' ? (
              <ProductDetailPageSettings
                settings={storeSettings}
                onUpdateSettings={(updates) => setStoreSettings(prev => ({ ...prev, ...updates }))}
                subTab={activeSubTab as any}
                currentProduct={currentProduct}
                onUpdateProduct={handleUpdateProductSale}
                onSelectMedia={(onSelect) => {
                  setMediaSelectCallback(() => onSelect);
                  setIsMediaModalOpen(true);
                }}
              />
            ) : activePage === 'appearance' ? (
              <AppearanceCustomizePanel
                settings={storeSettings}
                onUpdateSettings={(updates) => setStoreSettings(prev => ({ ...prev, ...updates }))}
              />
            ) : activePage === 'product_card' ? (
              <ProductCardSettings
                settings={storeSettings}
                onUpdateSettings={(updates) => setStoreSettings(prev => ({ ...prev, ...updates }))}
              />
            ) : (
              <GlobalSettings
                settings={storeSettings}
                onUpdateSettings={(updates) => setStoreSettings(prev => ({ ...prev, ...updates }))}
                subTab={activeSubTab as 'header' | 'footer' | 'branding'}
                onSelectMedia={(fieldKey) => {
                  setMediaUploadTarget({ sectionId: 'global', fieldPath: 'settings', fieldKey });
                  setIsMediaModalOpen(true);
                }}
              />
            )}
          </div>
        </aside>

      </div>

      {/* 3. MOBILE BOTTOM TAB BAR */}
      <div className="md:hidden flex items-center justify-around bg-white dark:bg-[#16162a] border-t border-gray-200 dark:border-gray-800 px-2 py-2 flex-shrink-0">
        <button
          onClick={() => setMobileTab('sections')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            mobileTab === 'sections' ? 'text-[#e94560] bg-[#e94560]/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Settings className="h-4 w-4" />
          Sections
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            mobileTab === 'preview' ? 'text-[#e94560] bg-[#e94560]/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Preview
        </button>
        <button
          onClick={() => setMobileTab('settings')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            mobileTab === 'settings' ? 'text-[#e94560] bg-[#e94560]/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* 4. MEDIA SELECTOR MODAL CONTAINER */}
      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleMediaSelected}
        multiple={false}
      />
    </div>
  );
}
