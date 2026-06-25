'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Product, Category, StoreSettings, Review, HomepageSection } from '@/lib/types';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';
import { useSearchStore } from '@/store/searchStore';
import SocialFeedRibbon from './SocialFeedRibbon';
import { 
  Truck, Shield, RefreshCw, Phone, HelpCircle, Award, Star, Lock, Clock, Gift, Headphones, Play 
} from '@/components/common/Icons';
import StarRating from './StarRating';
import { useScrollRestoration } from '@/lib/hooks/useScrollRestoration';
import { useSettings } from '@/lib/hooks/useSettings';

interface StoreFrontProps {
  initialProducts: Product[];
  categories: Category[];
  settings: StoreSettings;
  reviews?: (Review & { productName?: string; productSlug?: string })[];
  sections?: HomepageSection[];
  isPreview?: boolean;
  activeSectionId?: string | null;
  socialProofCount?: number;
}

interface FlashSaleSectionProps {
  section: HomepageSection;
  products: Product[];
  currencySymbol: string;
  settings: StoreSettings;
}

function FlashSaleSection({ section, products, currencySymbol, settings }: FlashSaleSectionProps) {
  if (settings.flash_sale_enabled === false) return null;
  const startTimeStr = section.settings?.startTime;
  const endTimeStr = section.settings?.endTime;

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: true, isIncoming: false, isInfinite: false });

  useEffect(() => {
    if (!startTimeStr && !endTimeStr) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: false, isIncoming: false, isInfinite: true });
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const start = startTimeStr ? new Date(startTimeStr).getTime() : 0;
      const end = endTimeStr ? new Date(endTimeStr).getTime() : 0;

      const isStarted = !startTimeStr || start <= now;
      const isEnded = endTimeStr && end < now;

      if (!isStarted) {
        const diff = start - now;
        if (diff <= 0) {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: false, isIncoming: false, isInfinite: false });
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft({ hours, minutes, seconds, expired: false, isIncoming: true, isInfinite: false });
        }
      } else if (isStarted && !isEnded) {
        let targetTime = end;
        if (!endTimeStr) {
          const midnight = new Date();
          midnight.setHours(23, 59, 59, 999);
          targetTime = midnight.getTime();
        }
        
        const diff = targetTime - now;
        if (diff <= 0) {
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true, isIncoming: false, isInfinite: false });
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft({ hours, minutes, seconds, expired: false, isIncoming: false, isInfinite: false });
        }
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true, isIncoming: false, isInfinite: false });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [startTimeStr, endTimeStr]);

  if (timeLeft.expired) return null;

  const fsProducts = section.content_data?.products || [];
  const categoryDiscounts = section.content_data?.categoryDiscounts || [];
  const displayProducts = products
    .filter(p => 
      fsProducts.some((fsp: any) => fsp.productId === p.id) ||
      categoryDiscounts.some((cd: any) => cd.categoryId === p.categoryId)
    )
    .sort((a, b) => {
      const idxA = fsProducts.findIndex((fsp: any) => fsp.productId === a.id);
      const idxB = fsProducts.findIndex((fsp: any) => fsp.productId === b.id);
      if (idxA !== -1 && idxB !== -1) {
        return idxA - idxB;
      }
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  if (displayProducts.length === 0) return null;

  const viewAllLink = section.settings?.viewAllUrl || '/shop';
  const viewAllText = section.settings?.viewAllText || 'View All';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-[#1a1a2e]/5 dark:bg-[#16162a]/30 rounded-3xl border border-gray-200 dark:border-gray-800 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4 mb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timeLeft.isIncoming ? 'bg-amber-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${timeLeft.isIncoming ? 'bg-amber-500' : 'bg-red-500'}`}></span>
            </span>
            <h2 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
              {section.title || 'Flash Sale'}
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-semibold">
            {timeLeft.isIncoming ? 'Sale starts in:' : 'Special discounted prices for a limited time!'}
          </p>
        </div>

        {!timeLeft.isInfinite ? (
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 font-extrabold w-11 py-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
              <span className="text-xs font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[7px] text-gray-400 font-normal">HRS</span>
            </div>
            <span className="font-extrabold text-gray-400">:</span>
            <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 font-extrabold w-11 py-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
              <span className="text-xs font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[7px] text-gray-400 font-normal">MIN</span>
            </div>
            <span className="font-extrabold text-gray-400">:</span>
            <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 font-extrabold w-11 py-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
              <span className="text-xs font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[7px] text-gray-400 font-normal">SEC</span>
            </div>

            <Link href={viewAllLink} className="ml-4 text-xs font-bold text-[#e94560] hover:underline uppercase tracking-wider">
              {viewAllText}
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4 self-start sm:self-center">
            <span className="text-xs font-extrabold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-1 rounded-full uppercase tracking-wider">
              Special Discount Active
            </span>
            <Link href={viewAllLink} className="text-xs font-bold text-[#e94560] hover:underline uppercase tracking-wider">
              {viewAllText}
            </Link>
          </div>
        )}
      </div>

      <ProductGrid 
        products={displayProducts} 
        currencySymbol={currencySymbol} 
        settings={settings} 
      />
    </div>
  );
}

interface HeroSlide {
  id: string;
  image_url: string;
  video_url?: string;
  video_autoplay?: boolean;
  video_muted?: boolean;
  tagline?: string;
  title?: string;
  subtitle?: string;
  button_text?: string;
  button_link?: string;
  button_secondary_text?: string;
  button_secondary_link?: string;
  mobile_tagline?: string;
  mobile_title?: string;
  mobile_subtitle?: string;
  mobile_button_text?: string;
  mobile_button_link?: string;
  mobile_button_secondary_text?: string;
  mobile_button_secondary_link?: string;
  tablet_tagline?: string;
  tablet_title?: string;
  tablet_subtitle?: string;
  tablet_button_text?: string;
  tablet_button_link?: string;
  tablet_button_secondary_text?: string;
  tablet_button_secondary_link?: string;
}

interface HeroBannerSectionProps {
  section: HomepageSection;
  settings: StoreSettings;
}

function HeroBannerSection({ section, settings }: HeroBannerSectionProps) {
  const formatCssDimension = (val: any, defaultVal: string): string => {
    if (val === undefined || val === null || val === '') return defaultVal;
    const valStr = val.toString().trim();
    if (/^\d+$/.test(valStr)) {
      return `${valStr}px`;
    }
    return valStr;
  };

  const heightDesktop = formatCssDimension(section.settings?.height_desktop, '450px');
  const heightTablet = formatCssDimension(section.settings?.height_tablet, '350px');
  const heightMobile = formatCssDimension(section.settings?.height_mobile, '250px');
  const opacity = section.settings?.overlay_opacity ?? 0.3;
  const overlayColor = section.settings?.overlay_color ?? '#000000';
  
  const settingsTimestamp = settings?.updatedAt ? new Date(settings.updatedAt).getTime() : '';
  const bannerUrl = settings?.bannerUrl && settingsTimestamp ? `${settings.bannerUrl}?v=${settingsTimestamp}` : (settings?.bannerUrl || '');

  // Carousel options
  const isAutoplay = section.settings?.autoplay ?? true;
  const autoplaySpeed = section.settings?.autoplay_speed ?? 5000;

  // Extract slides list with backward compatibility
  const slides: HeroSlide[] = React.useMemo(() => {
    const contentData = section.content_data || {};
    if (contentData.slides && contentData.slides.length > 0) {
      return contentData.slides;
    }
    // Backward compat: migrate old single-banner format
    return [{
      id: 'default',
      image_url: contentData.image_url || bannerUrl || '',
      video_url: contentData.video_url,
      video_autoplay: contentData.video_autoplay,
      video_muted: contentData.video_muted,
      tagline: contentData.tagline || settings.tagline,
      title: section.title || '',
      subtitle: contentData.subtitle || '',
      button_text: contentData.button_text,
      button_link: contentData.button_link || '/shop',
      button_secondary_text: contentData.button_secondary_text,
      button_secondary_link: contentData.button_secondary_link,
      mobile_tagline: contentData.mobile_tagline || contentData.tagline || settings.tagline,
      mobile_title: contentData.mobile_title || section.title || '',
      mobile_subtitle: contentData.mobile_subtitle || contentData.subtitle || '',
      mobile_button_text: contentData.mobile_button_text || contentData.button_text,
      mobile_button_link: contentData.mobile_button_link || contentData.button_link || '/shop',
      mobile_button_secondary_text: contentData.mobile_button_secondary_text || contentData.button_secondary_text,
      mobile_button_secondary_link: contentData.mobile_button_secondary_link || contentData.button_secondary_link,
      tablet_tagline: contentData.tablet_tagline || contentData.tagline || settings.tagline,
      tablet_title: contentData.tablet_title || section.title || '',
      tablet_subtitle: contentData.tablet_subtitle || contentData.subtitle || '',
      tablet_button_text: contentData.tablet_button_text || contentData.button_text,
      tablet_button_link: contentData.tablet_button_link || contentData.button_link || '/shop',
      tablet_button_secondary_text: contentData.tablet_button_secondary_text || contentData.button_secondary_text,
      tablet_button_secondary_link: contentData.tablet_button_secondary_link || contentData.button_secondary_link,
    }];
  }, [section, settings, bannerUrl]);

  const autoplayPlugin = React.useRef(
    Autoplay({ delay: autoplaySpeed, stopOnInteraction: false })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: slides.length > 1, align: 'center', skipSnaps: false },
    slides.length > 1 && isAutoplay ? [autoplayPlugin.current] : []
  );

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loadedMedia, setLoadedMedia] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActiveIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi]);

  // Handle updates to speed/autoplay
  React.useEffect(() => {
    if (!emblaApi) return;
    const autoplay = emblaApi.plugins().autoplay;
    if (!autoplay) return;

    if (isAutoplay && slides.length > 1) {
      autoplay.play();
    } else {
      autoplay.stop();
    }
  }, [emblaApi, isAutoplay, slides.length]);

  const carouselKey = `${section.id}_${slides.length}_${isAutoplay}_${autoplaySpeed}`;

  // Global settings
  const showBackdrop = section.settings?.show_backdrop_container ?? false;
  const backdropClass = showBackdrop 
    ? 'backdrop-blur-md bg-black/35 border border-white/10 p-5 md:p-8 rounded-2xl shadow-xl' 
    : 'bg-transparent border-none p-0';

  // Desktop alignments
  const contentPosDesktopX = section.settings?.content_position_desktop_x || section.settings?.content_position_desktop || 'center';
  let containerJustifyDesktop = 'md:justify-center';
  if (contentPosDesktopX === 'left') containerJustifyDesktop = 'md:justify-start';
  if (contentPosDesktopX === 'right') containerJustifyDesktop = 'md:justify-end';

  const contentPosDesktopY = section.settings?.content_position_desktop_y || 'middle';
  let containerAlignDesktop = 'md:items-center';
  if (contentPosDesktopY === 'top') containerAlignDesktop = 'md:items-start';
  if (contentPosDesktopY === 'bottom') containerAlignDesktop = 'md:items-end';

  // Mobile alignments
  const contentPosMobileX = section.settings?.content_position_mobile_x || 'center';
  let containerJustifyMobile = 'justify-center';
  if (contentPosMobileX === 'left') containerJustifyMobile = 'justify-start';
  if (contentPosMobileX === 'right') containerJustifyMobile = 'justify-end';

  const contentPosMobileY = section.settings?.content_position_mobile_y || 'middle';
  let containerAlignMobile = 'items-center';
  if (contentPosMobileY === 'top') containerAlignMobile = 'items-start';
  if (contentPosMobileY === 'bottom') containerAlignMobile = 'items-end';

  // Tablet alignments
  const contentPosTabletX = section.settings?.content_position_tablet_x || 'center';
  let containerJustifyTablet = 'justify-center';
  if (contentPosTabletX === 'left') containerJustifyTablet = 'justify-start';
  if (contentPosTabletX === 'right') containerJustifyTablet = 'justify-end';

  const contentPosTabletY = section.settings?.content_position_tablet_y || 'middle';
  let containerAlignTablet = 'items-center';
  if (contentPosTabletY === 'top') containerAlignTablet = 'items-start';
  if (contentPosTabletY === 'bottom') containerAlignTablet = 'items-end';

  // Desktop text align
  const textAlignDesktop = section.settings?.text_align_desktop || 'center';
  let textColAlignDesktop = 'md:text-center md:items-center';
  if (textAlignDesktop === 'left') textColAlignDesktop = 'md:text-left md:items-start';
  if (textAlignDesktop === 'right') textColAlignDesktop = 'md:text-right md:items-end';

  // Tablet text align
  const textAlignTablet = section.settings?.text_align_tablet || 'center';
  let textColAlignTablet = 'text-center items-center';
  if (textAlignTablet === 'left') textColAlignTablet = 'text-left items-start';
  if (textAlignTablet === 'right') textColAlignTablet = 'text-right items-end';

  // Mobile text align
  const textAlignMobile = section.settings?.text_align_mobile || 'center';
  let textColAlignMobile = 'text-center items-center';
  if (textAlignMobile === 'left') textColAlignMobile = 'text-left items-start';
  if (textAlignMobile === 'right') textColAlignMobile = 'text-right items-end';

  // Heading size classes
  const headingSizeDesktop = section.settings?.heading_size_desktop || '5xl';
  const headingSizeTablet = section.settings?.heading_size_tablet || '3xl';
  const headingSizeMobile = section.settings?.heading_size_mobile || '2xl';

  let headingDesktopClass = 'md:text-5xl';
  if (headingSizeDesktop === '2xl') headingDesktopClass = 'md:text-2xl';
  if (headingSizeDesktop === '3xl') headingDesktopClass = 'md:text-3xl';
  if (headingSizeDesktop === '4xl') headingDesktopClass = 'md:text-4xl';
  if (headingSizeDesktop === '6xl') headingDesktopClass = 'md:text-6xl';

  let headingTabletClass = 'text-3xl';
  if (headingSizeTablet === 'lg') headingTabletClass = 'text-lg';
  if (headingSizeTablet === 'xl') headingTabletClass = 'text-xl';
  if (headingSizeTablet === '2xl') headingTabletClass = 'text-2xl';
  if (headingSizeTablet === '4xl') headingTabletClass = 'text-4xl';
  if (headingSizeTablet === '5xl') headingTabletClass = 'text-5xl';

  let headingMobileClass = 'text-2xl';
  if (headingSizeMobile === 'lg') headingMobileClass = 'text-lg';
  if (headingSizeMobile === 'xl') headingMobileClass = 'text-xl';
  if (headingSizeMobile === '3xl') headingMobileClass = 'text-3xl';

  // Image focal points and zoom
  const imageScaleDesktop = section.settings?.image_scale_desktop ?? 100;
  const imageFocalXDesktop = section.settings?.image_focal_x_desktop ?? 50;
  const imageFocalYDesktop = section.settings?.image_focal_y_desktop ?? 50;

  const imageScaleTablet = section.settings?.image_scale_tablet ?? 100;
  const imageFocalXTablet = section.settings?.image_focal_x_tablet ?? 50;
  const imageFocalYTablet = section.settings?.image_focal_y_tablet ?? 50;

  const imageScaleMobile = section.settings?.image_scale_mobile ?? 100;
  const imageFocalXMobile = section.settings?.image_focal_x_mobile ?? 50;
  const imageFocalYMobile = section.settings?.image_focal_y_mobile ?? 50;

  const contentWidthDesktop = formatCssDimension(section.settings?.content_width_desktop, '576px');
  const contentWidthTablet = formatCssDimension(section.settings?.content_width_tablet, '600px');
  const contentWidthMobile = formatCssDimension(section.settings?.content_width_mobile, '100%');

  const taglineColor = section.settings?.tagline_color || '#ffffff';
  const headingColor = section.settings?.heading_color || '#ffffff';
  const subtitleColor = section.settings?.subtitle_color || '#e0e0e0';

  const primaryButtonBg = section.settings?.btn_bg_color || '#e94560';
  const primaryButtonTextColor = section.settings?.btn_text_color || '#ffffff';
  const secondaryButtonBg = section.settings?.sec_btn_bg_color || 'transparent';
  const secondaryButtonTextColor = section.settings?.sec_btn_text_color || '#ffffff';

  const bannerClassName = `hero-banner-${section.id}`;

  return (
    <div 
      key={carouselKey}
      className={`${bannerClassName} relative w-full bg-[#1a1a2e] overflow-hidden group`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .${bannerClassName} {
          height: ${heightMobile} !important;
        }
        @media (min-width: 768px) {
          .${bannerClassName} {
            height: ${heightTablet} !important;
          }
        }
        @media (min-width: 1024px) {
          .${bannerClassName} {
            height: ${heightDesktop} !important;
          }
        }
      `}} />
      {/* Embla Viewport wrapper */}
      <div className="overflow-hidden h-full w-full" ref={emblaRef}>
        <div className="flex h-full w-full">
          {slides.map((slide, idx) => {
            const isSlideActive = idx === activeIndex;
            const hasVideo = !!slide.video_url;
            const slideImage = slide.image_url || bannerUrl || '';
            const autoplay = slide.video_autoplay !== false;
            const muted = slide.video_muted !== false;
            // CSS-safe class name from slide id
            const slideClass = `hbs-${slide.id.replace(/[^a-z0-9]/gi, '_')}`;

            // Graceful fallbacks for Tablet view
            const tabletTagline = slide.tablet_tagline || slide.tagline;
            const tabletTitle = slide.tablet_title || slide.title;
            const tabletSubtitle = slide.tablet_subtitle || slide.subtitle;
            const tabletButtonText = slide.tablet_button_text || slide.button_text;
            const tabletButtonLink = slide.tablet_button_link || slide.button_link;
            const tabletButtonSecondaryText = slide.tablet_button_secondary_text || slide.button_secondary_text;
            const tabletButtonSecondaryLink = slide.tablet_button_secondary_link || slide.button_secondary_link;

            // Graceful fallbacks for Mobile view
            const mobileTagline = slide.mobile_tagline || slide.tagline;
            const mobileTitle = slide.mobile_title || slide.title;
            const mobileSubtitle = slide.mobile_subtitle || slide.subtitle;
            const mobileButtonText = slide.mobile_button_text || slide.button_text;
            const mobileButtonLink = slide.mobile_button_link || slide.button_link;
            const mobileButtonSecondaryText = slide.mobile_button_secondary_text || slide.button_secondary_text;
            const mobileButtonSecondaryLink = slide.mobile_button_secondary_link || slide.button_secondary_link;

            return (
              <div key={slide.id} className="relative flex-grow-0 flex-shrink-0 w-full h-full overflow-hidden select-none">
                {/* Per-slide responsive focal-point CSS — one image used across all breakpoints */}
                <style dangerouslySetInnerHTML={{ __html: `
                  .${slideClass} {
                    object-position: ${imageFocalXDesktop}% ${imageFocalYDesktop}%;
                    transform: scale(${imageScaleDesktop / 100});
                    transform-origin: ${imageFocalXDesktop}% ${imageFocalYDesktop}%;
                    transition: transform 0.3s ease, object-position 0.3s ease, opacity 0.7s ease;
                  }
                  @media (max-width: 1023px) {
                    .${slideClass} {
                      object-position: ${imageFocalXTablet}% ${imageFocalYTablet}%;
                      transform: scale(${imageScaleTablet / 100});
                      transform-origin: ${imageFocalXTablet}% ${imageFocalYTablet}%;
                    }
                  }
                  @media (max-width: 767px) {
                    .${slideClass} {
                      object-position: ${imageFocalXMobile}% ${imageFocalYMobile}%;
                      transform: scale(${imageScaleMobile / 100});
                      transform-origin: ${imageFocalXMobile}% ${imageFocalYMobile}%;
                    }
                  }
                `}} />

                {/* ── Single background image (shared across mobile/tablet/desktop) ── */}
                {slideImage && (
                  <img
                    src={slideImage}
                    alt={slide.title || section.title || settings.storeName}
                    className={`${slideClass} w-full h-full object-cover select-none pointer-events-none absolute inset-0 z-0 ${
                      hasVideo && loadedMedia[slide.id] ? 'opacity-0' : 'opacity-100'
                    }`}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                )}

                {/* ── Single video overlay (shared across all breakpoints) ── */}
                {hasVideo && (() => {
                  const videoInfo = parseVideoUrl(slide.video_url, autoplay, muted);
                  const handleLoaded = () => setLoadedMedia(prev => ({ ...prev, [slide.id]: true }));
                  return (
                    <div className={`absolute inset-0 transition-opacity duration-700 z-[5] ${
                      loadedMedia[slide.id] ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                      {(videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') ? (
                        <iframe
                          src={videoInfo.embedUrl}
                          onLoad={handleLoaded}
                          className={`${slideClass} w-full h-full border-0 absolute inset-0 ${autoplay ? 'pointer-events-none' : 'pointer-events-auto'}`}
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={slide.video_url}
                          onLoadedData={handleLoaded}
                          onCanPlay={handleLoaded}
                          onPlaying={handleLoaded}
                          className={`${slideClass} w-full h-full object-cover ${autoplay ? 'pointer-events-none' : 'pointer-events-auto'}`}
                          autoPlay={autoplay}
                          muted={muted}
                          loop={autoplay}
                          playsInline
                          preload={idx === 0 ? 'auto' : 'none'}
                          ref={el => {
                            if (el) {
                              if (isSlideActive && autoplay) el.play().catch(() => {});
                              else el.pause();
                            }
                          }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Dark overlay backdrop */}
                <div 
                  className="absolute inset-0 transition-colors duration-300" 
                  style={{ backgroundColor: overlayColor, opacity }} 
                />

                {/* Desktop Content Container */}
                <div className={`absolute inset-0 hidden lg:flex p-16 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent ${containerJustifyDesktop} ${containerAlignDesktop}`}>
                  <div 
                    style={{ width: contentWidthDesktop }}
                    className={`flex flex-col max-w-full transition-all duration-300 ${textColAlignDesktop} ${backdropClass}`}
                  >
                    {slide.tagline && (
                      <p 
                        style={{ color: taglineColor }}
                        className="text-xs font-extrabold uppercase tracking-widest mb-2"
                      >
                        {slide.tagline}
                      </p>
                    )}
                    
                    {slide.title && (
                      <h1 
                        style={{ color: headingColor }}
                        className={`font-black tracking-tight font-serif leading-tight ${headingDesktopClass}`}
                      >
                        {slide.title}
                      </h1>
                    )}
                    
                    {slide.subtitle && (
                      <p 
                        style={{ color: subtitleColor }}
                        className="text-xs sm:text-sm mt-3 font-medium opacity-90 leading-relaxed"
                      >
                        {slide.subtitle}
                      </p>
                    )}
                    
                    {/* CTA Buttons */}
                    {(slide.button_text || slide.button_secondary_text) && (
                      <div className="mt-6 flex flex-wrap gap-3 items-center">
                        {slide.button_text && (
                          <Link 
                            href={slide.button_link || '/shop'}
                            style={{ backgroundColor: primaryButtonBg, color: primaryButtonTextColor }}
                            className="px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            {slide.button_text}
                          </Link>
                        )}
                        {slide.button_secondary_text && (
                          <Link 
                            href={slide.button_secondary_link || '/'}
                            style={{ 
                              backgroundColor: secondaryButtonBg, 
                              color: secondaryButtonTextColor,
                              borderColor: secondaryButtonBg === 'transparent' ? secondaryButtonTextColor : 'transparent'
                            }}
                            className="px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl border transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            {slide.button_secondary_text}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tablet Content Container */}
                <div className={`absolute inset-0 hidden md:flex lg:hidden p-12 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent ${containerJustifyTablet} ${containerAlignTablet}`}>
                  <div 
                    style={{ width: contentWidthTablet }}
                    className={`flex flex-col max-w-full transition-all duration-300 ${textColAlignTablet} ${backdropClass}`}
                  >
                    {tabletTagline && (
                      <p 
                        style={{ color: taglineColor }}
                        className="text-xs font-extrabold uppercase tracking-widest mb-2"
                      >
                        {tabletTagline}
                      </p>
                    )}
                    
                    {tabletTitle && (
                      <h1 
                        style={{ color: headingColor }}
                        className={`font-black tracking-tight font-serif leading-tight ${headingTabletClass}`}
                      >
                        {tabletTitle}
                      </h1>
                    )}
                    
                    {tabletSubtitle && (
                      <p 
                        style={{ color: subtitleColor }}
                        className="text-xs sm:text-sm mt-3 font-medium opacity-90 leading-relaxed"
                      >
                        {tabletSubtitle}
                      </p>
                    )}
                    
                    {/* CTA Buttons */}
                    {(tabletButtonText || tabletButtonSecondaryText) && (
                      <div className="mt-6 flex flex-wrap gap-3 items-center">
                        {tabletButtonText && (
                          <Link 
                            href={tabletButtonLink || '/shop'}
                            style={{ backgroundColor: primaryButtonBg, color: primaryButtonTextColor }}
                            className="px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            {tabletButtonText}
                          </Link>
                        )}
                        {tabletButtonSecondaryText && (
                          <Link 
                            href={tabletButtonSecondaryLink || '/'}
                            style={{ 
                              backgroundColor: secondaryButtonBg, 
                              color: secondaryButtonTextColor,
                              borderColor: secondaryButtonBg === 'transparent' ? secondaryButtonTextColor : 'transparent'
                            }}
                            className="px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl border transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            {tabletButtonSecondaryText}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Content Container */}
                <div className={`absolute inset-0 flex md:hidden p-6 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent ${containerJustifyMobile} ${containerAlignMobile}`}>
                  <div 
                    style={{ width: contentWidthMobile }}
                    className={`flex flex-col max-w-full transition-all duration-350 ${textColAlignMobile} ${backdropClass}`}
                  >
                    {mobileTagline && (
                      <p 
                        style={{ color: taglineColor }}
                        className="text-xs font-extrabold uppercase tracking-widest mb-2"
                      >
                        {mobileTagline}
                      </p>
                    )}
                    
                    {mobileTitle && (
                      <h1 
                        style={{ color: headingColor }}
                        className={`font-black tracking-tight font-serif leading-tight ${headingMobileClass}`}
                      >
                        {mobileTitle}
                      </h1>
                    )}
                    
                    {mobileSubtitle && (
                      <p 
                        style={{ color: subtitleColor }}
                        className="text-xs sm:text-sm mt-3 font-medium opacity-90 leading-relaxed"
                      >
                        {mobileSubtitle}
                      </p>
                    )}
                    
                    {/* CTA Buttons */}
                    {(mobileButtonText || mobileButtonSecondaryText) && (
                      <div className="mt-6 flex flex-wrap gap-3 items-center">
                        {mobileButtonText && (
                          <Link 
                            href={mobileButtonLink || '/shop'}
                            style={{ backgroundColor: primaryButtonBg, color: primaryButtonTextColor }}
                            className="px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            {mobileButtonText}
                          </Link>
                        )}
                        {mobileButtonSecondaryText && (
                          <Link 
                            href={mobileButtonSecondaryLink || '/'}
                            style={{ 
                              backgroundColor: secondaryButtonBg, 
                              color: secondaryButtonTextColor,
                              borderColor: secondaryButtonBg === 'transparent' ? secondaryButtonTextColor : 'transparent'
                            }}
                            className="px-6 py-2.5 text-xs font-extrabold uppercase rounded-xl border transition-all shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            {mobileButtonSecondaryText}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nav dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi && emblaApi.scrollTo(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'w-5 bg-[#e94560]' : 'w-1.5 bg-white/40 hover:bg-white/60'
              } cursor-pointer`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Desktop Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => emblaApi && emblaApi.scrollPrev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90 cursor-pointer hidden md:flex"
            aria-label="Previous slide"
          >
            ❮
          </button>
          <button
            onClick={() => emblaApi && emblaApi.scrollNext()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90 cursor-pointer hidden md:flex"
            aria-label="Next slide"
          >
            ❯
          </button>
        </>
      )}
    </div>
  );
}

export default function StoreFront({
  initialProducts,
  categories,
  settings,
  reviews = [],
  sections = [],
  isPreview = false,
  activeSectionId = null,
  socialProofCount = 0,
}: StoreFrontProps) {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  useScrollRestoration();

  // Live settings: SSR value shown immediately, overridden by fresh DB fetch on mount
  const { settings: liveSettings } = useSettings(settings);
  const activeSettings = isPreview ? settings : (liveSettings ?? settings);

  // parsedFeeds removed to reuse SocialFeedRibbon component

  const activeSections = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.filter(s => s.active || (isPreview && s.id === activeSectionId));
    }
    // Fallback default sections
    return [
      { id: 'def-hero', section_type: 'hero_banner', title: 'Hero Slider', settings: {}, content_data: {}, sort_order: 1, active: true },
      { id: 'def-cats', section_type: 'category_list', title: 'Shop By Category', settings: {}, content_data: {}, sort_order: 2, active: true },
      { id: 'def-grid', section_type: 'product_grid', title: 'Featured Collection', settings: { limit: 8, columns_desktop: 4, columns_mobile: 2, source: 'all' }, content_data: {}, sort_order: 3, active: true },
      { id: 'def-trust', section_type: 'trust_badges', title: 'Our Guarantees', settings: {}, content_data: {}, sort_order: 4, active: true },
      { id: 'def-revs', section_type: 'recent_reviews', title: 'Customer Feedback', settings: { limit: 3 }, content_data: {}, sort_order: 5, active: true }
    ] as HomepageSection[];
  }, [sections]);

  // Per-section Load More limits
  const [loadMoreLimits, setLoadMoreLimits] = useState<Record<string, number>>({});

  const handleLoadMore = (sectionId: string, baseLimit: number) => {
    setLoadMoreLimits(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || baseLimit) + 8
    }));
  };

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return initialProducts.filter(product => {
      const matchesCategory = !selectedCategoryId || product.categoryId === selectedCategoryId;
      if (!q) return matchesCategory;

      const matchesSearch = 
        product.name.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.shortDescription && product.shortDescription.toLowerCase().includes(q)) ||
        (product.sku && product.sku.toLowerCase().includes(q)) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (product.category?.name && product.category.name.toLowerCase().includes(q)) ||
        (product.variants && product.variants.some(v => 
          v.active && (
            (v.color && v.color.toLowerCase().includes(q)) ||
            (v.size && v.size.toLowerCase().includes(q)) ||
            (v.material && v.material.toLowerCase().includes(q)) ||
            (v.sku && v.sku.toLowerCase().includes(q)) ||
            (v.customValue && v.customValue.toLowerCase().includes(q))
          )
        ));

      return matchesCategory && matchesSearch;
    });
  }, [initialProducts, selectedCategoryId, searchQuery]);

  // Dynamic Icon selector for trust badges
  const renderBadgeIcon = (iconName: string) => {
    const props = { className: "h-6 w-6 text-[#e94560]" };
    switch (iconName) {
      case 'Truck': return <Truck {...props} />;
      case 'Shield': return <Shield {...props} />;
      case 'RefreshCw': return <RefreshCw {...props} />;
      case 'Phone': return <Phone {...props} />;
      case 'HelpCircle': return <HelpCircle {...props} />;
      case 'Award': return <Award {...props} />;
      case 'Star': return <Star {...props} />;
      case 'Lock': return <Lock {...props} />;
      case 'Clock': return <Clock {...props} />;
      case 'Gift': return <Gift {...props} />;
      case 'Headphones': return <Headphones {...props} />;
      default: return <Truck {...props} />;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColorClass = (name: string) => {
    const colors = [
      'bg-[#FF8B3D]',
      'bg-[#10b981]',
      'bg-[#3b82f6]',
      'bg-[#8b5cf6]',
      'bg-[#e94560]',
      'bg-[#06b6d4]',
      'bg-[#f59e0b]'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const renderHeroBanner = (section: HomepageSection) => {
    return <HeroBannerSection section={section} settings={activeSettings} />;
  };

  const renderCategoryList = (section: HomepageSection) => {
    return (
      <div key={section.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        {section.title && (
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 text-center md:text-left">
            {section.title}
          </h3>
        )}
        {activeSettings.enableCategoryFilter && (
          <CategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        )}
      </div>
    );
  };

  const renderProductGrid = (section: HomepageSection) => {
    const baseLimit = section.settings?.limit ?? 8;
    const source = section.settings?.source ?? 'all';
    const sortMethod = section.settings?.sortMethod || (source === 'featured' ? 'featured' : 'all');
    const manualProductIds: string[] = section.settings?.manualProductIds || [];
    const effectiveLimit = loadMoreLimits[section.id] || baseLimit;
    const bottomEnableViewAll = section.settings?.bottomEnableViewAll === true;
    const bottomEnableLoadMore = section.settings?.bottomEnableLoadMore === true;
    
    // Filter display products dynamically based on source + sortMethod
    const displayProducts = (() => {
      let prodList = filteredProducts;

      // Manual pick — use explicit product IDs in given order
      if (sortMethod === 'manual' && manualProductIds.length > 0) {
        return manualProductIds
          .map(id => filteredProducts.find(p => p.id === id))
          .filter((p): p is Product => !!p);
      }

      // Featured filter
      if (sortMethod === 'featured' || source === 'featured') {
        prodList = prodList.filter(p => p.isFeatured);
      } else if (sortMethod === 'category' && source !== 'all' && source !== 'featured') {
        prodList = prodList.filter(p => p.categoryId === source || p.category?.slug === source);
      } else if (selectedCategoryId) {
        prodList = prodList.filter(p => p.categoryId === selectedCategoryId);
      } else if (source !== 'all' && source !== 'featured') {
        prodList = prodList.filter(p => p.categoryId === source || p.category?.slug === source);
      }

      // Sort by recency
      if (sortMethod === 'recent') {
        prodList = [...prodList].sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      }

      return prodList.slice(0, effectiveLimit);
    })();

    const viewAllLink = (() => {
      if (section.settings?.viewAllUrl) {
        return section.settings.viewAllUrl;
      }
      const linkSource = sortMethod === 'manual' ? null : source;
      if (linkSource && linkSource !== 'all' && linkSource !== 'featured') {
        const cat = categories.find(c => c.id === linkSource || c.slug === linkSource);
        if (cat) {
          return `/shop?category=${cat.slug}`;
        }
      }
      return '/shop';
    })();

    const allProductsCount = (() => {
      if (sortMethod === 'manual') return manualProductIds.length;
      let count = filteredProducts;
      if (sortMethod === 'featured' || source === 'featured') count = count.filter(p => p.isFeatured);
      else if (sortMethod === 'category' && source !== 'all' && source !== 'featured') count = count.filter(p => p.categoryId === source || p.category?.slug === source);
      else if (source !== 'all' && source !== 'featured') count = count.filter(p => p.categoryId === source || p.category?.slug === source);
      return count.length;
    })();

    const hasMore = displayProducts.length < allProductsCount && displayProducts.length >= effectiveLimit;

    return (
      <div key={section.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {section.title && !selectedCategoryId && (
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-6">
            <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
              {section.title}
            </h2>
            <Link href={viewAllLink} className="text-xs font-bold text-[#e94560] hover:underline">
              {section.settings?.viewAllText || 'View All'}
            </Link>
          </div>
        )}
        <ProductGrid 
          products={displayProducts} 
          currencySymbol={activeSettings.currencySymbol} 
          settings={activeSettings} 
        />
        {(bottomEnableLoadMore || bottomEnableViewAll) && (
          <div className="w-full flex items-center justify-center gap-3 mt-6 md:mt-8 px-4">
            {bottomEnableLoadMore && hasMore && (
              <button
                type="button"
                onClick={() => handleLoadMore(section.id, baseLimit)}
                className="px-5 py-2.5 text-xs md:text-sm font-semibold tracking-wide uppercase rounded-full transition-all duration-200 shadow-sm active:scale-95 hover:brightness-90 cursor-pointer"
                style={{
                  backgroundColor: section.settings?.bottomLoadMoreBgColor || '#f1f5f9',
                  color: section.settings?.bottomLoadMoreTextColor || '#1e293b',
                }}
              >
                {section.settings?.bottomLoadMoreText || 'Load More'}
              </button>
            )}
            {bottomEnableViewAll && (
              <Link
                href={viewAllLink}
                className="px-5 py-2.5 text-xs md:text-sm font-semibold tracking-wide uppercase rounded-full transition-all duration-200 shadow-sm active:scale-95 hover:brightness-90"
                style={{
                  backgroundColor: section.settings?.bottomViewAllBgColor || '#FFD147',
                  color: section.settings?.bottomViewAllTextColor || '#0f172a',
                }}
              >
                {section.settings?.bottomViewAllText || 'View All'}
              </Link>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTrustBadges = (section: HomepageSection) => {
    const badge1Active = activeSettings.trustBadge1Enabled && (activeSettings.trustBadge1Title || activeSettings.trustBadge1Desc);
    const badge2Active = activeSettings.trustBadge2Enabled && (activeSettings.trustBadge2Title || activeSettings.trustBadge2Desc);
    const badge3Active = activeSettings.trustBadge3Enabled && (activeSettings.trustBadge3Title || activeSettings.trustBadge3Desc);
    const badge4Active = activeSettings.trustBadge4Enabled && (activeSettings.trustBadge4Title || activeSettings.trustBadge4Desc);
    
    const activeCount = [badge1Active, badge2Active, badge3Active, badge4Active].filter(Boolean).length;
    if (activeCount === 0) return null;

    let gridColsClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    let maxContainerClass = "";
    if (activeCount === 1) {
      gridColsClass = "grid-cols-1";
      maxContainerClass = "max-w-md mx-auto";
    } else if (activeCount === 2) {
      gridColsClass = "grid-cols-1 sm:grid-cols-2";
      maxContainerClass = "max-w-2xl mx-auto";
    } else if (activeCount === 3) {
      gridColsClass = "grid-cols-1 sm:grid-cols-3 lg:grid-cols-3";
      maxContainerClass = "max-w-5xl mx-auto";
    }

    return (
      <div key={section.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800">
        <div className={`grid gap-6 ${gridColsClass} ${maxContainerClass}`}>
          {badge1Active && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl">
                {renderBadgeIcon(settings.trustBadge1Icon || 'Truck')}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{settings.trustBadge1Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">{settings.trustBadge1Desc}</p>
              </div>
            </div>
          )}
          {badge2Active && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl">
                {renderBadgeIcon(settings.trustBadge2Icon || 'Shield')}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{settings.trustBadge2Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">{settings.trustBadge2Desc}</p>
              </div>
            </div>
          )}
          {badge3Active && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-250 dark:border-gray-800 shadow-sm">
              <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl">
                {renderBadgeIcon(settings.trustBadge3Icon || 'RefreshCw')}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{settings.trustBadge3Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">{settings.trustBadge3Desc}</p>
              </div>
            </div>
          )}
          {badge4Active && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-250 dark:border-gray-800 shadow-sm">
              <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl">
                {renderBadgeIcon(settings.trustBadge4Icon || 'Phone')}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{settings.trustBadge4Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">{settings.trustBadge4Desc}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRecentReviews = (section: HomepageSection) => {
    if (!reviews || reviews.length === 0) return null;

    const approvedReviews = reviews.filter(r => r.approved !== false);
    const totalReviewsCount = approvedReviews.length + socialProofCount;
    const averageStars = totalReviewsCount > 0 
      ? Math.round(((approvedReviews.reduce((sum, r) => sum + r.rating, 0) + socialProofCount * 5) / totalReviewsCount) * 10) / 10
      : 5.0;

    const displayReviews = reviews.slice(0, 3);

    return (
      <div key={section.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800">
        <div className="text-center space-y-2.5 mb-10">
          <h2 className="text-xl font-black uppercase tracking-wider text-gray-900 dark:text-white">
            {section.title || 'CUSTOMER REVIEWS'}
          </h2>
          <div className="flex flex-col items-center justify-center gap-1.5">
            <StarRating rating={averageStars} showText={false} starSize={16} />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {averageStars.toFixed(1)} out of 5 based on {totalReviewsCount} {totalReviewsCount === 1 ? 'rating' : 'ratings'}
            </span>
            {socialProofCount > 0 && (
              <span className="text-[10px] font-medium text-gray-400">(Includes Verified + Proof Wall)</span>
            )}
          </div>
        </div>

        <div className="max-w-lg mx-auto space-y-4">
          {displayReviews.map((review) => (
            <div
              key={review.id}
              className="flex gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-[#16162a] shadow-sm text-gray-900 dark:text-white"
            >
              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-sm ${getAvatarColorClass(review.customerName)}`}>
                {getInitials(review.customerName)}
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <StarRating rating={review.rating} showText={false} starSize={11} />
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 shrink-0" suppressHydrationWarning>
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-xs text-gray-950 dark:text-white truncate">
                    {review.customerName}
                  </span>
                  <span className="text-[8px] font-bold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded-full shrink-0">
                    ✓ Verified Buyer
                  </span>
                </div>
                {review.comment && (
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
          {displayReviews.length === 0 && (
            <div className="flex items-center justify-center p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-850 bg-white/50 dark:bg-[#16162a]/50 text-gray-400 dark:text-gray-600 text-[11px] font-semibold">
              No reviews yet
            </div>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-semibold tracking-wide shadow-sm bg-[#e94560] text-white hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            View All Reviews
          </Link>
        </div>
      </div>
    );
  };

  const renderPromoBanner = (section: HomepageSection) => {
    const bg = section.settings?.bg_color || '#e94560';
    const text = section.settings?.text_color || '#ffffff';
    const link = section.content_data?.link || '/shop';

    return (
      <div 
        key={section.id} 
        style={{ backgroundColor: bg, color: text }}
        className="w-full py-12 px-6 text-center space-y-4"
      >
        <h2 className="text-2xl font-black uppercase tracking-wider">{section.title || 'Special Promotion!'}</h2>
        {section.content_data?.text && (
          <p className="text-sm max-w-xl mx-auto opacity-95 leading-relaxed">{section.content_data.text}</p>
        )}
        <div className="pt-2">
          <Link
            href={link}
            className="px-6 py-2.5 bg-white text-gray-950 hover:bg-gray-100 text-xs font-bold uppercase rounded-xl transition-all shadow-md active:scale-95 inline-block cursor-pointer"
          >
            {section.content_data?.button_text || 'Shop Offer'}
          </Link>
        </div>
      </div>
    );
  };

  const renderBrandsLogos = (section: HomepageSection) => {
    const logos = section.content_data?.logos || [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=120&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=120&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=120&auto=format&fit=crop&q=60'
    ];

    return (
      <div key={section.id} className="w-full py-8 bg-gray-50 dark:bg-white/5 border-y border-gray-150 dark:border-gray-800/80 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 text-center mb-4">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {section.title || 'Our Premium Partners'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-12 flex-wrap opacity-65 grayscale hover:opacity-100 transition-opacity">
          {logos.map((logoUrl: string, idx: number) => (
            <div key={idx} className="relative w-24 h-12">
              <Image
                src={logoUrl}
                alt="Brand logo Partner"
                fill
                sizes="96px"
                className="object-contain animate-fade-in"
                
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCategoryGrid = (section: HomepageSection) => {
    const items = section.content_data?.items || [];
    
    // Premium placeholder categories matching reference
    const defaultItems = [
      { title: 'New Arrivals', link: '/shop', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80' },
      { title: 'Trending Now', link: '/shop', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80' },
      { title: 'Premium Collection', link: '/shop', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80' },
      { title: 'Accessories', link: '/shop', imageUrl: 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?w=800&auto=format&fit=crop&q=80' }
    ];

    const displayItems = items.length > 0 
      ? items.filter((item: any) => item && item.imageUrl) 
      : defaultItems;

    // Use responsive columns based on length to maintain grid nicely
    let gridCols = "grid-cols-2 md:grid-cols-4";
    if (displayItems.length === 1) gridCols = "grid-cols-1 md:grid-cols-1 max-w-md mx-auto";
    else if (displayItems.length === 2) gridCols = "grid-cols-2 md:grid-cols-2 max-w-2xl mx-auto";
    else if (displayItems.length === 3) gridCols = "grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto";
    else if (displayItems.length > 4) gridCols = "grid-cols-2 md:grid-cols-4 lg:grid-cols-5";

    const aspectRatio = section.settings?.aspect_ratio || 'recommended';
    const aspectClass = aspectRatio === '1by1' 
      ? 'aspect-square' 
      : aspectRatio === 'auto' 
      ? 'h-64 md:h-80' 
      : 'aspect-[3/4]';

    return (
      <div key={section.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {section.title && (
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-6">
            <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
              {section.title}
            </h2>
          </div>
        )}
        <div className={`grid gap-4 ${gridCols}`}>
          {displayItems.map((item: any, idx: number) => (
            <Link 
              key={idx} 
              href={item.link || '/shop'}
              className={`group relative block overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer bg-gray-100 dark:bg-gray-900 ${aspectClass}`}
            >
              <Image
                src={item.imageUrl}
                alt={item.title || 'Category'}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
              
              {/* Capsule label floating bottom-left */}
              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-white text-[#1a1a2e] px-4 py-2 rounded-full text-xs font-black tracking-wide shadow-md transform transition-all group-hover:translate-x-1 duration-300">
                {item.title || 'Explore'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderSocialFeed = (section: HomepageSection) => {
    if (activeSettings.social_feeds_enabled === false) return null;
    if (activeSettings.social_feeds_homepage_enabled === false) return null;
    
    return (
      <div key={section.id}>
        <SocialFeedRibbon
          settings={activeSettings}
          title={section.title}
          subtitle={section.content_data?.subtitle}
          desc={section.content_data?.desc}
          limit={section.settings?.limit}
          items={section.content_data?.items}
          isHomepage={true}
        />
      </div>
    );
  };

  const renderTickerSection = (section: HomepageSection) => {
    if (!activeSettings.enableTicker || !activeSettings.tickerText) return null;
    return (
      <div key={section.id} className="w-full overflow-hidden bg-white dark:bg-white/5 border-y border-gray-200 dark:border-gray-800 py-3.5 select-none">
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
              {activeSettings.tickerText!.split('\n').filter(Boolean).map((item, itemIdx) => (
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
  };

  // If there is an active search query, bypass the section customization view
  if (searchQuery) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-h-screen">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Search Results for: <span className="text-[#e94560]">"{searchQuery}"</span> ({filteredProducts.length} items)
        </h2>
        <ProductGrid products={filteredProducts} currencySymbol={activeSettings.currencySymbol} settings={activeSettings} />
      </div>
    );
  }

  return (
    <div className="pb-12 min-h-screen bg-gray-50 dark:bg-[#0f0f1b] text-gray-900 dark:text-gray-100 transition-colors duration-200 space-y-6">
      {activeSections.map((section) => {
        let content = null;
        switch (section.section_type) {
          case 'hero_banner':
            content = renderHeroBanner(section);
            break;
          case 'category_list':
            content = renderCategoryList(section);
            break;
          case 'product_grid':
            content = renderProductGrid(section);
            break;
          case 'category_grid':
            content = renderCategoryGrid(section);
            break;
          case 'trust_badges':
            content = renderTrustBadges(section);
            break;
          case 'recent_reviews':
            content = renderRecentReviews(section);
            break;
          case 'promo_banner':
            content = renderPromoBanner(section);
            break;
          case 'brands_logos':
            content = renderBrandsLogos(section);
            break;
          case 'social_feed':
            content = renderSocialFeed(section);
            break;
          case 'ticker':
            content = renderTickerSection(section);
            break;
          case 'flash_sale':
            content = (
              <FlashSaleSection
                section={section}
                products={filteredProducts}
                currencySymbol={activeSettings.currencySymbol}
                settings={activeSettings}
              />
            );
            break;
          default:
            content = null;
        }

        if (!content) return null;

        if (isPreview) {
          const isSectionInactive = !section.active;
          return (
            <div
              key={section.id}
              id={section.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({ type: 'select_section', sectionId: section.id }, '*');
              }}
              className={`relative cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2 group/preview-section ${
                isSectionInactive ? 'opacity-60 border-2 border-dashed border-[#e94560]/45' : ''
              }`}
            >
              {/* Tooltip for section name */}
              <div className="absolute top-2 left-2 z-[60] bg-[#e94560] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md uppercase opacity-0 group-hover/preview-section:opacity-100 transition-opacity duration-200 pointer-events-none">
                {section.title || section.section_type.replace('_', ' ')} {isSectionInactive && '(Hidden)'}
              </div>
              {isSectionInactive && (
                <div className="absolute top-2 right-2 z-[60] bg-gray-900/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider pointer-events-none">
                  Hidden / Inactive Section
                </div>
              )}
              {content}
            </div>
          );
        }

        return (
          <div key={section.id} id={section.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'direct' | null;
  embedUrl?: string;
  directUrl?: string;
}

function parseVideoUrl(url: string | undefined, autoplay: boolean, muted: boolean): ParsedVideo {
  if (!url) return { type: null };

  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const params = new URLSearchParams();
    params.set('enablejsapi', '1');
    if (autoplay) {
      params.set('autoplay', '1');
      params.set('loop', '1');
      params.set('playlist', videoId);
      params.set('controls', '0');
    } else {
      params.set('autoplay', '0');
      params.set('controls', '1');
    }
    if (muted) {
      params.set('mute', '1');
    } else {
      params.set('mute', '0');
    }
    params.set('playsinline', '1');
    
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`
    };
  }

  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    const params = new URLSearchParams();
    if (autoplay) {
      params.set('autoplay', '1');
      params.set('loop', '1');
      params.set('background', '1');
    } else {
      params.set('autoplay', '0');
    }
    if (muted) {
      params.set('muted', '1');
    } else {
      params.set('muted', '0');
    }
    params.set('playsinline', '1');
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}?${params.toString()}`
    };
  }

  return {
    type: 'direct',
    directUrl: url
  };
}
