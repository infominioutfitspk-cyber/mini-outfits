'use client';

import React, { useState, useEffect } from 'react';
import { HomepageSection, StoreSettings, Product, Category, Review } from '@/lib/types';
import StoreFront from '@/components/store/StoreFront';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import FloatingContacts from '@/components/common/FloatingContacts';
import CartBar from '@/components/store/CartBar';
import PremiumFeaturesProvider from '@/components/store/PremiumFeaturesProvider';
import ShopPage from '@/components/store/ShopPage';
import ProductDetail from '@/components/store/ProductDetail';
import ProductReviews from '@/components/store/ProductReviews';
import ProductCard from '@/components/store/ProductCard';
import ThemeStyleRegistry from '@/components/common/ThemeStyleRegistry';
import SocialFeedRibbon from '@/components/store/SocialFeedRibbon';
import { formatPrice } from '@/lib/utils/whatsapp';

interface StyleGuideProps {
  settings: StoreSettings;
  products: Product[];
}

function StyleGuide({ settings, products }: StyleGuideProps) {
  const activeProduct = products[0];
  const currencySymbol = settings.currencySymbol || 'Rs.';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Title Header */}
      <div 
        style={{ borderColor: 'var(--color-border)' }}
        className="border-b pb-6"
      >
        <h1 className="text-3xl font-black font-heading tracking-tight">
          Theme Style Guide
        </h1>
        <p className="text-sm font-body mt-1 opacity-70">
          This preview dynamically adapts to your theme fonts, colors, and border styles in real-time.
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Colors Palette Section */}
        <div 
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)'
          }}
          className="p-6 rounded-2xl border space-y-4 shadow-sm"
        >
          <h3 className="text-lg font-bold font-heading">Theme Palette</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div 
              style={{ borderColor: 'var(--color-border)' }}
              className="p-3 rounded-xl border flex flex-col gap-1.5 opacity-90"
            >
              <span className="text-[10px] uppercase font-semibold tracking-wider opacity-60">Primary Color</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--color-primary)' }} />
                <span className="text-xs font-mono font-medium">Primary</span>
              </div>
            </div>

            <div 
              style={{ borderColor: 'var(--color-border)' }}
              className="p-3 rounded-xl border flex flex-col gap-1.5 opacity-90"
            >
              <span className="text-[10px] uppercase font-semibold tracking-wider opacity-60">Accent Color</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--color-accent)' }} />
                <span className="text-xs font-mono font-medium">Accent</span>
              </div>
            </div>

            <div 
              style={{ borderColor: 'var(--color-border)' }}
              className="p-3 rounded-xl border flex flex-col gap-1.5 opacity-90"
            >
              <span className="text-[10px] uppercase font-semibold tracking-wider opacity-60">Price Color</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--color-price)' }} />
                <span className="text-xs font-mono font-medium">Price</span>
              </div>
            </div>

            <div 
              style={{ borderColor: 'var(--color-border)' }}
              className="p-3 rounded-xl border flex flex-col gap-1.5 opacity-90"
            >
              <span className="text-[10px] uppercase font-semibold tracking-wider opacity-60">Secondary</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--color-secondary)' }} />
                <span className="text-xs font-mono font-medium">Secondary</span>
              </div>
            </div>
          </div>
          
          <div className="pt-2 text-xs opacity-60 font-body">
            Colors map to Tailwind utility styles automatically.
          </div>
        </div>

        {/* Typography Section */}
        <div 
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)'
          }}
          className="p-6 rounded-2xl border space-y-4 shadow-sm"
        >
          <h3 className="text-lg font-bold font-heading">Typography & Fonts</h3>
          
          <div className="space-y-3">
            <div>
              <span className="text-[10px] block mb-1 font-mono opacity-50">Heading Font (H2 / H3)</span>
              <h2 className="text-2xl font-black font-heading leading-tight">
                Fashion That Inspires
              </h2>
            </div>
            
            <div className="pt-2">
              <span className="text-[10px] block mb-1 font-mono opacity-50">Body Font (Paragraph / Description)</span>
              <p className="text-sm font-body leading-relaxed opacity-85">
                Premium quality eastern and fusion clothing designed for modern convenience. Order directly on WhatsApp with fast nationwide delivery.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-[10px] block mb-1 font-mono opacity-50">Muted Info / Subtitles</span>
              <p className="text-xs font-body opacity-60">
                Nationwide flat shipping rate of Rs. 200. Delivery in 3-5 working days.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons & Roundness Section */}
        <div 
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)'
          }}
          className="p-6 rounded-2xl border space-y-5 shadow-sm"
        >
          <h3 className="text-lg font-bold font-heading">Buttons & Corner Radii</h3>
          
          <div className="space-y-4">
            <div>
              <span className="text-[10px] block mb-1.5 font-mono opacity-50">Primary Button (WhatsApp Checkout)</span>
              <button 
                type="button"
                className="w-full py-3 px-4 font-bold text-center transition-colors shadow-sm duration-200 active:scale-95"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  borderRadius: 'var(--border-radius-btn)',
                }}
              >
                Order on WhatsApp
              </button>
            </div>

            <div>
              <span className="text-[10px] block mb-1.5 font-mono opacity-50">Accent Badges / Urgency Elements</span>
              <div className="flex gap-3 items-center">
                <span className="rounded-md bg-[#e94560]/10 dark:bg-[#e94560]/20 px-2.5 py-1 text-xs font-black text-[#e94560] tracking-wide uppercase">
                  Save 20%
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  In Stock
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-[10px] block mb-1 font-mono opacity-50">Button Radius</span>
                <div 
                  style={{ borderColor: 'var(--color-border)' }}
                  className="text-xs border p-2 text-center rounded-xl font-semibold bg-[var(--color-primary)]/5"
                >
                  {settings.theme_config?.buttons?.borderRadius ?? 12}px
                </div>
              </div>
              <div>
                <span className="text-[10px] block mb-1 font-mono opacity-50">Card Radius</span>
                <div 
                  style={{ borderColor: 'var(--color-border)' }}
                  className="text-xs border p-2 text-center rounded-xl font-semibold bg-[var(--color-primary)]/5"
                >
                  {settings.theme_config?.cards?.borderRadius ?? 16}px
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Selection Display */}
        <div 
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)'
          }}
          className="p-6 rounded-2xl border space-y-4 shadow-sm"
        >
          <h3 className="text-lg font-bold font-heading">Product Pricing Displays</h3>
          
          <div className="space-y-4">
            <div>
              <span className="text-[10px] block mb-1 font-mono opacity-50">Catalog Price / Range (Price Color Customization)</span>
              <div className="text-xl font-bold product-price">
                {currencySymbol} 2,499 – {currencySymbol} 3,299
              </div>
            </div>

            <div>
              <span className="text-[10px] block mb-1.5 font-mono opacity-50">Selected Variant Price Badge (Product Details Page)</span>
              <div 
                style={{ borderColor: 'var(--color-border)' }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-primary)]/5 border text-sm font-semibold w-fit"
              >
                <span className="opacity-70">Selected option:</span>
                <span className="product-price text-base font-black leading-none">
                  {currencySymbol} 2,899
                </span>
                <span className="inline-flex items-center gap-1.5 ml-1">
                  <span className="text-xs text-gray-400 line-through font-semibold font-body">
                    {currencySymbol} 3,500
                  </span>
                  <span className="rounded-md bg-[#e94560]/10 dark:bg-[#e94560]/20 px-1.5 py-0.5 text-[9px] font-black text-[#e94560] tracking-wide leading-none">
                    -17%
                  </span>
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] block mb-1 font-mono opacity-50">Standard Item price (With Compare)</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold product-price">
                  {currencySymbol} 1,850
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {currencySymbol} 2,500
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Catalog Card Preview */}
      {activeProduct && (
        <div 
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)'
          }}
          className="p-6 rounded-2xl border space-y-4 shadow-sm"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold font-heading">Sample Product Card</h3>
            <span className="text-xs font-mono opacity-50">Active Catalog Grid Styles</span>
          </div>
          
          <div className="max-w-[280px] sm:max-w-[320px] mx-auto">
            <ProductCard 
              product={activeProduct} 
              currencySymbol={currencySymbol} 
              settings={settings} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface PreviewClientProps {
  initialSections: HomepageSection[];
  products: Product[];
  categories: Category[];
  initialSettings: StoreSettings;
  reviews: Review[];
}

export default function PreviewClient({
  initialSections,
  products,
  categories,
  initialSettings,
  reviews
}: PreviewClientProps) {
  const [sections, setSections] = useState<HomepageSection[]>(initialSections);
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [activePage, setActivePage] = useState<'home' | 'shop' | 'product_detail' | 'product_card' | 'global' | 'appearance'>('home');
  const [productsList, setProductsList] = useState<Product[]>(products);
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Client-side real-time calculation of sale prices (matches applyFlashSaleDiscounts on server)
  const liveProducts = React.useMemo(() => {
    if (settings.flash_sale_enabled === false) {
      return productsList;
    }
    const now = Date.now();
    const fsSection = sections.find(s => s.section_type === 'flash_sale' && s.active);
    const isFsActive = fsSection ? (() => {
      const startStr = fsSection.settings?.startTime;
      const endStr = fsSection.settings?.endTime;
      if (!startStr && !endStr) return true;
      const start = startStr ? new Date(startStr).getTime() : 0;
      const end = endStr ? new Date(endStr).getTime() : 0;
      const isStarted = !startStr || start <= now;
      const isEnded = endStr && end < now;
      return isStarted && !isEnded;
    })() : false;

    return productsList.map(product => {
      // 1. Homepage manual products overrides (highest priority)
      if (isFsActive && fsSection) {
        const fsProducts = fsSection.content_data?.products || [];
        const fsProd = fsProducts.find((p: any) => p?.productId === product.id);
        
        if (fsProd) {
          const basePrice = product.comparePrice || product.price;
          const discountPrice = fsProd.discountValue ? parseFloat(fsProd.discountValue.toString()) : product.price;
          
          if (discountPrice < basePrice) {
            const ratio = discountPrice / basePrice;
            const updatedVariants = product.variants.map(v => {
              if (v.price) {
                const varBasePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                const newVarPrice = Math.round(varBasePrice * ratio);
                return {
                  ...v,
                  price: newVarPrice,
                  comparePrice: varBasePrice
                };
              }
              return v;
            });

            return {
              ...product,
              price: discountPrice,
              comparePrice: basePrice,
              variants: updatedVariants,
              flashSaleEnabled: true,
              flashSaleEndDate: fsSection.settings?.endTime || undefined,
              flashSaleStartDate: fsSection.settings?.startTime || undefined
            };
          }
        }
      }

      // 2. Product-level Sale Settings (medium priority)
      if (product.flashSaleEnabled) {
        const pStartStr = product.flashSaleStartDate;
        const pEndStr = product.flashSaleEndDate;
        const isStarted = !pStartStr || new Date(pStartStr).getTime() <= now;
        const isEnded = pEndStr && new Date(pEndStr).getTime() < now;
        
        if (isStarted && !isEnded) {
          const discountType = product.flashSaleDiscountType || 'fixed';
          const discountVal = product.flashSaleDiscountValue || 0;
          
          const basePrice = product.comparePrice || product.price;
          let discountPrice = product.price;

          if (discountType === 'percentage') {
            discountPrice = Math.round(basePrice * (1 - discountVal / 100));
          } else if (discountType === 'fixed') {
            discountPrice = Math.max(0, basePrice - discountVal);
          }

          if (discountPrice < basePrice) {
            const updatedVariants = product.variants.map(v => {
              if (v.price) {
                const varBasePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                let varDiscountPrice = v.price;
                if (discountType === 'percentage') {
                  varDiscountPrice = Math.round(varBasePrice * (1 - discountVal / 100));
                } else if (discountType === 'fixed') {
                  varDiscountPrice = Math.max(0, varBasePrice - discountVal);
                }
                return {
                  ...v,
                  price: varDiscountPrice,
                  comparePrice: varBasePrice
                };
              }
              return v;
            });

            return {
              ...product,
              price: discountPrice,
              comparePrice: basePrice,
              variants: updatedVariants,
              flashSaleEnabled: true,
              flashSaleEndDate: product.flashSaleEndDate || undefined,
              flashSaleStartDate: product.flashSaleStartDate || undefined
            };
          }
        }
      }

      // 3. Homepage Category Discounts (lowest priority)
      if (isFsActive && fsSection) {
        const categoryDiscounts = fsSection.content_data?.categoryDiscounts || [];
        const fsCat = categoryDiscounts.find((c: any) => c?.categoryId === product.categoryId);

        if (fsCat) {
          const basePrice = product.comparePrice || product.price;
          const discountVal = parseFloat(fsCat.discountValue) || 0;
          let discountPrice = product.price;

          if (fsCat.discountType === 'percentage') {
            discountPrice = Math.round(basePrice * (1 - discountVal / 100));
          } else if (fsCat.discountType === 'fixed') {
            discountPrice = Math.max(0, basePrice - discountVal);
          }

          if (discountPrice < basePrice) {
            const updatedVariants = product.variants.map(v => {
              if (v.price) {
                const varBasePrice = v.comparePrice || (product.comparePrice ? Math.round(product.comparePrice * (v.price / product.price)) : v.price);
                let varDiscountPrice = v.price;
                if (fsCat.discountType === 'percentage') {
                  varDiscountPrice = Math.round(varBasePrice * (1 - discountVal / 100));
                } else if (fsCat.discountType === 'fixed') {
                  varDiscountPrice = Math.max(0, varBasePrice - discountVal);
                }
                return {
                  ...v,
                  price: varDiscountPrice,
                  comparePrice: varBasePrice
                };
              }
              return v;
            });

            return {
              ...product,
              price: discountPrice,
              comparePrice: basePrice,
              variants: updatedVariants,
              flashSaleEnabled: true,
              flashSaleEndDate: fsSection.settings?.endTime || undefined,
              flashSaleStartDate: fsSection.settings?.startTime || undefined
            };
          }
        }
      }

      return product;
    });
  }, [productsList, sections, settings]);

  const currentProduct = React.useMemo(() => {
    const defaultProduct = liveProducts[0];
    if (!activeProductSlug) return defaultProduct;
    return liveProducts.find(p => p.slug === activeProductSlug) || defaultProduct;
  }, [liveProducts, activeProductSlug]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.type === 'sync') {
          if (event.data.sections) {
            setSections(event.data.sections);
          }
          if (event.data.settings) {
            setSettings(event.data.settings);
          }
          if (event.data.products) {
            setProductsList(event.data.products);
          }
          if (event.data.activeProductSlug) {
            setActiveProductSlug(event.data.activeProductSlug);
          }
          if (event.data.activeSectionId !== undefined) {
            setActiveSectionId(event.data.activeSectionId);
          }
          if (event.data.activeSectionId) {
            setTimeout(() => {
              const element = document.getElementById(event.data.activeSectionId);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }
        } else if (event.data.type === 'scroll_to_section') {
          const element = document.getElementById(event.data.sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else if (event.data.type === 'change_page') {
          setActivePage(event.data.page);
        }
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      let anchor: HTMLAnchorElement | null = null;
      let curr = target;
      while (curr) {
        if (curr.tagName === 'A') {
          anchor = curr as HTMLAnchorElement;
          break;
        }
        curr = curr.parentElement;
      }
      
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href) {
          const isRelative = href.startsWith('/') && !href.startsWith('//');
          const isSameDomain = href.startsWith(window.location.origin);
          
          if (isRelative || isSameDomain) {
            e.preventDefault();
            e.stopPropagation();
            
            const path = isRelative ? href : href.substring(window.location.origin.length);
            
            let page: 'home' | 'shop' | 'product_detail' | 'global' = 'home';
            if (path.startsWith('/product/')) {
              page = 'product_detail';
              const slug = path.replace('/product/', '').split('?')[0];
              setActiveProductSlug(slug);
            } else if (path.startsWith('/shop') || path === '/shop') {
              page = 'shop';
            } else if (path === '/' || path === '') {
              page = 'home';
            }
            
            setActivePage(page);
            window.parent.postMessage({ type: 'nav_to_page', page, href: path }, '*');
            return;
          }
        }
      }
      
      // Also intercept buttons like "Choose Options" or "Buy Now" that trigger page changes
      let button: HTMLButtonElement | null = null;
      curr = target;
      while (curr) {
        if (curr.tagName === 'BUTTON') {
          button = curr as HTMLButtonElement;
          break;
        }
        curr = curr.parentElement;
      }
      
      if (button) {
        const text = button.textContent?.toLowerCase() || '';
        if (text.includes('choose options') || text.includes('buy now')) {
          let card = button.parentElement;
          while (card && !card.getAttribute('href')) {
            card = card.parentElement;
          }
          if (card) {
            const href = card.getAttribute('href');
            if (href) {
              e.preventDefault();
              e.stopPropagation();
              
              let page: 'home' | 'shop' | 'product_detail' | 'global' = 'home';
              if (href.startsWith('/product/')) {
                page = 'product_detail';
                const slug = href.replace('/product/', '').split('?')[0];
                setActiveProductSlug(slug);
              }
              
              setActivePage(page);
              window.parent.postMessage({ type: 'nav_to_page', page, href }, '*');
            }
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('click', handleLinkClick, true);
    // Notify parent window that preview is loaded and ready
    window.parent.postMessage({ type: 'ready' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0f0f1b] text-gray-900 dark:text-gray-100 pb-20 md:pb-0 transition-colors duration-200 overflow-x-hidden w-full">
      <ThemeStyleRegistry settings={settings} />
      <Navbar settings={settings} />
      <main className="flex-grow bg-gray-50 dark:bg-[#0f0f1b] transition-colors duration-200 w-full">
        {(activePage === 'home' || activePage === 'global') && (
          <StoreFront
            initialProducts={liveProducts}
            categories={categories}
            settings={settings}
            reviews={reviews}
            sections={sections}
            isPreview={true}
            activeSectionId={activeSectionId}
          />
        )}
        {(activePage === 'shop' || activePage === 'product_card') && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <ShopPage
              initialProducts={liveProducts}
              categories={categories}
              settings={settings}
              isPreview={true}
            />
          </div>
        )}
        {activePage === 'product_detail' && liveProducts.length > 0 && (
          <div className="space-y-10 pb-16 pt-8">
            {(settings.productPageLayout || ['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed']).map((block) => {
              if (block === 'details') {
                return (
                  <div
                    key="details"
                    id="details"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'select_product_detail_tab', subTab: 'swatches' }, '*');
                    }}
                    className="relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-block"
                  >
                    <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-block:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Product Details
                    </div>
                    <ProductDetail product={currentProduct} settings={settings} averageRating={{ average: 5, count: 1 }} />
                  </div>
                );
              }
              if (block === 'ticker') {
                if (!settings.enableTicker || !settings.tickerText) return null;
                return (
                  <div
                    key="ticker"
                    id="ticker"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'select_product_detail_tab', subTab: 'ticker' }, '*');
                    }}
                    className="relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-block w-full overflow-hidden bg-gray-50 dark:bg-white/5 border-y border-gray-200 dark:border-gray-800 py-3.5 select-none"
                  >
                    <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-block:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Scrolling Ticker
                    </div>
                    <style>{`
                      @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                      }
                      .animate-marquee-infinite {
                        display: flex;
                        width: max-content;
                        animation: marquee 30s linear infinite;
                      }
                    `}</style>
                    <div className="animate-marquee-infinite flex items-center whitespace-nowrap gap-8">
                      {[...Array(4)].map((_, loopIdx) => (
                        <div key={loopIdx} className="flex items-center gap-8">
                          {settings.tickerText.split('\n').filter(Boolean).map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-8 text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                              <span>{item}</span>
                              <span className="text-gray-400 dark:text-gray-600 font-normal">✦</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (block === 'reviews') {
                return (
                  <div
                    key="reviews"
                    id="reviews"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'select_product_detail_tab', subTab: 'urgency' }, '*');
                    }}
                    className="relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-block mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
                  >
                    <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-block:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Reviews & FAQ
                    </div>
                    <ProductReviews product={products[0]} reviews={[]} averageRating={{ average: 5, count: 1 }} />
                  </div>
                );
              }
              if (block === 'related') {
                return (
                  <div
                    key="related"
                    id="related"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'select_product_detail_tab', subTab: 'delivery' }, '*');
                    }}
                    className="relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-block mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 pt-10"
                  >
                    <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-block:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Related Products Grid
                    </div>
                    <div className="text-center md:text-left mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Related Products</h3>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        You might also like these handpicked recommendations
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {products.slice(0, 4).map(prod => (
                        <ProductCard key={prod.id} product={prod} currencySymbol={settings.currencySymbol} settings={settings} />
                      ))}
                    </div>
                  </div>
                );
              }
              if (block === 'recently_viewed') {
                if (!settings.recently_viewed_limit || settings.recently_viewed_limit === 0) return null;
                return (
                  <div
                    key="recently_viewed"
                    id="recently_viewed"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'select_product_detail_tab', subTab: 'recently_viewed' }, '*');
                    }}
                    className="relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-block mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800 pt-10"
                  >
                    <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-block:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Recently Viewed Products
                    </div>
                    <div className="text-center md:text-left mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Viewed</h3>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Products you have recently browsed
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {products.slice(1, 1 + (settings.recently_viewed_limit || 4)).map(prod => (
                        <ProductCard key={prod.id} product={prod} currencySymbol={settings.currencySymbol} settings={settings} />
                      ))}
                    </div>
                  </div>
                );
              }
              if (block === 'social_feed') {
                if (settings.social_feeds_enabled === false) return null;
                if (settings.social_feeds_product_enabled === false) return null;
                return (
                  <div
                    key="social_feed"
                    id="social_feed"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.parent.postMessage({ type: 'select_product_detail_tab', subTab: 'social_feed' }, '*');
                    }}
                    className="relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-block"
                  >
                    <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-block:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Social Feed Ribbon
                    </div>
                    <SocialFeedRibbon settings={settings} />
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
        {activePage === 'appearance' && (
          <StyleGuide settings={settings} products={liveProducts} />
        )}
      </main>
      <Footer settings={settings} />
      <CartBar currencySymbol={settings.currencySymbol} />
      <MobileBottomNav />
      <FloatingContacts settings={settings} />
      <PremiumFeaturesProvider settings={settings} />
    </div>
  );
}
