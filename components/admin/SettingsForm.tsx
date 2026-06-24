'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Upload, Trash2, Image as ImageIcon, Loader2, Plus, CreditCard, Truck, Edit2, Check, X, Shield, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Settings, Layout, Navigation, Package, Zap, MessageCircle, Globe, ShoppingBag, HelpCircle, Mail } from 'lucide-react';
import { StoreSettings, ShippingMethod, PaymentMethod, Category, Product, NavigationItem, Coupon } from '@/lib/types';
import { updateSettings } from '@/lib/services/settings';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/services/coupons';
import * as CentralIcons from '@/components/common/Icons';
import { uploadImage } from '@/lib/uploadImage';
import { getCategories } from '@/lib/services/categories';
import { getAllProductsAdmin } from '@/lib/services/products';
import { useAdminTab } from '@/lib/hooks/useAdminTab';
import {
  getShippingMethods,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  reorderShippingMethods
} from '@/lib/services/shipping';
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods
} from '@/lib/services/paymentMethods';
import { toast } from 'sonner';
import { cleanWhatsAppPhone } from '@/lib/utils/whatsapp';

import GeneralTab from './settings/GeneralTab';
import HeaderTab from './settings/HeaderTab';
import NavigationTab from './settings/NavigationTab';
import ProductsTab from './settings/ProductsTab';
import TrustTab from './settings/TrustTab';
import WhatsappTab from './settings/WhatsappTab';
import PoliciesTab from './settings/PoliciesTab';
import FooterTab from './settings/FooterTab';
import ShippingTab from './settings/ShippingTab';
import PremiumTab from './settings/PremiumTab';

import CouponsTab from './settings/CouponsTab';
import PixelsTab from './settings/PixelsTab';
import AITab from './settings/AITab';
import EmailTab from './settings/EmailTab';
import MetaSyncTab from './settings/MetaSyncTab';

interface SettingsFormProps {
  initialSettings: StoreSettings;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();

  // Settings Form States
  const [storeName, setStoreName] = useState(initialSettings.storeName);
  const [storeUrl, setStoreUrl] = useState(initialSettings.storeUrl || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings.whatsappNumber);
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [currencySymbol, setCurrencySymbol] = useState(initialSettings.currencySymbol);
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || '');
  const [logoWidth, setLogoWidth] = useState(initialSettings.logoWidth ?? 120);
  const [bannerUrl, setBannerUrl] = useState(initialSettings.bannerUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(initialSettings.faviconUrl || '');
  const [tagline, setTagline] = useState(initialSettings.tagline || '');
  const [address, setAddress] = useState(initialSettings.address || '');

  const [showStock, setShowStock] = useState(initialSettings.showStock);
  const [showComparePrice, setShowComparePrice] = useState(initialSettings.showComparePrice);
  const [enableSearch, setEnableSearch] = useState(initialSettings.enableSearch);
  const [enableCategoryFilter, setEnableCategoryFilter] = useState(initialSettings.enableCategoryFilter);
  const [popularSearches, setPopularSearches] = useState(initialSettings.popularSearches ?? 'Co-ord Sets, Sonic, Graphic Tee, T-shirt, Kids');

  const [whatsappGreeting, setWhatsappGreeting] = useState(initialSettings.whatsappGreeting);
  const [whatsappFooter, setWhatsappFooter] = useState(initialSettings.whatsappFooter);

  // Footer & Social States
  const [footerText, setFooterText] = useState(initialSettings.footerText || '');
  const [socialFacebook, setSocialFacebook] = useState(initialSettings.socialFacebook || '');
  const [socialInstagram, setSocialInstagram] = useState(initialSettings.socialInstagram || '');
  const [socialWhatsapp, setSocialWhatsapp] = useState(initialSettings.socialWhatsapp || '');
  const [socialYoutube, setSocialYoutube] = useState(initialSettings.socialYoutube || '');

  // Fake Views & Trust States
  const [enableFakeViews, setEnableFakeViews] = useState(initialSettings.enableFakeViews ?? true);
  const [minViews, setMinViews] = useState(initialSettings.minViews ?? 10);
  const [maxViews, setMaxViews] = useState(initialSettings.maxViews ?? 50);
  const [enableTrustBadges, setEnableTrustBadges] = useState(initialSettings.enableTrustBadges ?? true);
  const [deliveryEstimateText, setDeliveryEstimateText] = useState(initialSettings.deliveryEstimateText ?? 'Estimate delivery times: 3-5 days International.');
  const [freeShippingText, setFreeShippingText] = useState(initialSettings.freeShippingText ?? 'Free shipping & returns: On all orders over $150.');
  const [promoCodeText, setPromoCodeText] = useState(initialSettings.promoCodeText ?? 'Use code "WELCOME15" for discount 15% on your first order.');
  const [enableSafeCheckout, setEnableSafeCheckout] = useState(initialSettings.enableSafeCheckout ?? true);
  const [safeCheckoutText, setSafeCheckoutText] = useState(initialSettings.safeCheckoutText ?? 'Guarantee Safe Checkout:');
  const [safeCheckoutMethods, setSafeCheckoutMethods] = useState<string[]>(initialSettings.safeCheckoutMethods ?? ['visa', 'mastercard', 'paypal', 'amex', 'klarna', 'cirrus', 'westernunion']);
  const [enableTicker, setEnableTicker] = useState(initialSettings.enableTicker ?? false);
  const [tickerText, setTickerText] = useState(initialSettings.tickerText ?? 'Free returns within 30 days\nUnlimited delivery for only $175');
  const [enableVariantSwatches, setEnableVariantSwatches] = useState(initialSettings.enableVariantSwatches ?? true);
  const [swatchShape, setSwatchShape] = useState<'circle' | 'square'>(initialSettings.swatchShape ?? 'circle');
  const [swatchSize, setSwatchSize] = useState<'sm' | 'md' | 'lg'>(initialSettings.swatchSize ?? 'md');
  const [swatchLimit, setSwatchLimit] = useState<number>(initialSettings.swatchLimit ?? 8);
  const [defaultVariantIndex, setDefaultVariantIndex] = useState<number>(initialSettings.defaultVariantIndex ?? 1);
  const [imageHoverStyle, setImageHoverStyle] = useState<'second_image' | 'zoom' | 'none'>(initialSettings.imageHoverStyle ?? 'second_image');
  const [imageAspectRatio, setImageAspectRatio] = useState(initialSettings.imageAspectRatio ?? '1:1');
  const [titleLineLimit, setTitleLineLimit] = useState<'1' | '2' | 'none'>(initialSettings.titleLineLimit ?? '2');
  const [archiveSwatchSize, setArchiveSwatchSize] = useState<'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'>(initialSettings.archiveSwatchSize ?? 'md');
  const [productSwatchSize, setProductSwatchSize] = useState<'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'>(initialSettings.productSwatchSize ?? 'md');
  const [archiveSwatchAlign, setArchiveSwatchAlign] = useState<'left' | 'center' | 'right'>(initialSettings.archiveSwatchAlign ?? 'left');
  const [cardShowDescription, setCardShowDescription] = useState(initialSettings.card_show_description ?? true);
  const [cardShowSwatches, setCardShowSwatches] = useState(initialSettings.card_show_swatches ?? true);
  const [cardShowSizes, setCardShowSizes] = useState(initialSettings.card_show_sizes ?? true);
  const [cardShowMaterials, setCardShowMaterials] = useState(initialSettings.card_show_materials ?? true);
  const [cardShowCustom, setCardShowCustom] = useState(initialSettings.card_show_custom ?? true);
  const [cardShowCustom2, setCardShowCustom2] = useState(initialSettings.card_show_custom_2 ?? true);
  const [cardShowTypeColor, setCardShowTypeColor] = useState(initialSettings.card_show_type_color ?? true);
  const [cardShowTypeSize, setCardShowTypeSize] = useState(initialSettings.card_show_type_size ?? true);
  const [cardShowTypeMaterial, setCardShowTypeMaterial] = useState(initialSettings.card_show_type_material ?? true);
  const [cardShowTypeCustom, setCardShowTypeCustom] = useState(initialSettings.card_show_type_custom ?? true);
  const [cardMobileColumns, setCardMobileColumns] = useState<number>(initialSettings.card_mobile_columns ?? 2);
  const [faqContent, setFaqContent] = useState(initialSettings.faqContent || '');
  const [returnPolicyContent, setReturnPolicyContent] = useState(initialSettings.returnPolicyContent || '');
  const [privacyPolicyContent, setPrivacyPolicyContent] = useState(initialSettings.privacyPolicyContent || '');
  const [showFaqInNav, setShowFaqInNav] = useState(initialSettings.showFaqInNav ?? true);
  const [showReturnsInNav, setShowReturnsInNav] = useState(initialSettings.showReturnsInNav ?? true);
  const [showPrivacyInNav, setShowPrivacyInNav] = useState(initialSettings.showPrivacyInNav ?? true);
  const [showFaqInFooter, setShowFaqInFooter] = useState(initialSettings.showFaqInFooter ?? true);
  const [showReturnsInFooter, setShowReturnsInFooter] = useState(initialSettings.showReturnsInFooter ?? true);
  const [showPrivacyInFooter, setShowPrivacyInFooter] = useState(initialSettings.showPrivacyInFooter ?? true);

  const [trustBadge1Title, setTrustBadge1Title] = useState(initialSettings.trustBadge1Title || 'Free Delivery');
  const [trustBadge1Desc, setTrustBadge1Desc] = useState(initialSettings.trustBadge1Desc || 'On all orders above Rs. 2,000');
  const [trustBadge1Icon, setTrustBadge1Icon] = useState(initialSettings.trustBadge1Icon || 'Truck');

  const [trustBadge2Title, setTrustBadge2Title] = useState(initialSettings.trustBadge2Title || 'Secure Payments');
  const [trustBadge2Desc, setTrustBadge2Desc] = useState(initialSettings.trustBadge2Desc || '100% protected checkout payments');
  const [trustBadge2Icon, setTrustBadge2Icon] = useState(initialSettings.trustBadge2Icon || 'Shield');

  const [trustBadge3Title, setTrustBadge3Title] = useState(initialSettings.trustBadge3Title || 'Easy Exchange');
  const [trustBadge3Desc, setTrustBadge3Desc] = useState(initialSettings.trustBadge3Desc || 'No questions asked return policy');
  const [trustBadge3Icon, setTrustBadge3Icon] = useState(initialSettings.trustBadge3Icon || 'RefreshCw');

  const [trustBadge4Title, setTrustBadge4Title] = useState(initialSettings.trustBadge4Title || '24/7 Support');
  const [trustBadge4Desc, setTrustBadge4Desc] = useState(initialSettings.trustBadge4Desc || 'Call/WhatsApp anytime for assistance');
  const [trustBadge4Icon, setTrustBadge4Icon] = useState(initialSettings.trustBadge4Icon || 'Phone');

  // Badge individual toggle switches
  const [trustBadge1Enabled, setTrustBadge1Enabled] = useState(initialSettings.trustBadge1Enabled ?? true);
  const [trustBadge2Enabled, setTrustBadge2Enabled] = useState(initialSettings.trustBadge2Enabled ?? true);
  const [trustBadge3Enabled, setTrustBadge3Enabled] = useState(initialSettings.trustBadge3Enabled ?? true);
  const [trustBadge4Enabled, setTrustBadge4Enabled] = useState(initialSettings.trustBadge4Enabled ?? true);

  // New social media platforms
  const [socialTiktok, setSocialTiktok] = useState(initialSettings.socialTiktok || '');
  const [socialSnapchat, setSocialSnapchat] = useState(initialSettings.socialSnapchat || '');
  const [socialTwitter, setSocialTwitter] = useState(initialSettings.socialTwitter || '');

  // Editable Shopify Footer columns
  const [footerCol1Title, setFooterCol1Title] = useState(initialSettings.footerCol1Title || 'About Our Store');
  const [footerCol2Title, setFooterCol2Title] = useState(initialSettings.footerCol2Title || 'Customer Support');
  const [footerCol2Text, setFooterCol2Text] = useState(initialSettings.footerCol2Text || 'Call/WhatsApp: 0328-4114551\nEmail: Totvoguepk@gmail.com\nTimings: 10 AM - 10 PM');
  const [footerCol3Title, setFooterCol3Title] = useState(initialSettings.footerCol3Title || 'Quick Links');
  const [footerCol4Title, setFooterCol4Title] = useState(initialSettings.footerCol4Title || 'Newsletter');
  const [footerCol4Text, setFooterCol4Text] = useState(initialSettings.footerCol4Text || 'Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.');
  const [footerBottomText, setFooterBottomText] = useState(initialSettings.footerBottomText || '');
  const [footerShowPayments, setFooterShowPayments] = useState(initialSettings.footerShowPayments ?? true);
  const [footerShowMenu, setFooterShowMenu] = useState(initialSettings.footerShowMenu ?? true);
  const [footerShowNewsletter, setFooterShowNewsletter] = useState(initialSettings.footerShowNewsletter ?? true);
  const [footerShowSocial, setFooterShowSocial] = useState(initialSettings.footerShowSocial ?? true);

  // Header settings states
  const [headerSticky, setHeaderSticky] = useState(initialSettings.headerSticky ?? true);
  const [headerStickyDesktop, setHeaderStickyDesktop] = useState(initialSettings.headerStickyDesktop ?? true);
  const [headerStickyMobile, setHeaderStickyMobile] = useState(initialSettings.headerStickyMobile ?? true);
  const [headerShowTopBar, setHeaderShowTopBar] = useState(initialSettings.headerShowTopBar ?? true);
  const [headerTopBarPhone, setHeaderTopBarPhone] = useState(initialSettings.headerTopBarPhone ?? '0328-4114551');
  const [headerTopBarEmail, setHeaderTopBarEmail] = useState(initialSettings.headerTopBarEmail ?? 'Totvoguepk@gmail.com');
  const [headerShowNewsletter, setHeaderShowNewsletter] = useState(initialSettings.headerShowNewsletter ?? true);
  const [floatingSnapchatEnabled, setFloatingSnapchatEnabled] = useState(initialSettings.floatingSnapchatEnabled ?? false);
  const [floatingTwitterEnabled, setFloatingTwitterEnabled] = useState(initialSettings.floatingTwitterEnabled ?? false);

  // Missing States for Floating Contacts and Header layout options
  const [floatingContactsEnabled, setFloatingContactsEnabled] = useState<boolean>(initialSettings.floatingContactsEnabled ?? true);
  const [floatingContactsPosition, setFloatingContactsPosition] = useState<'left' | 'right'>(initialSettings.floatingContactsPosition ?? 'right');
  const [floatingContactsScale, setFloatingContactsScale] = useState<number>(initialSettings.floatingContactsScale ?? 1.0);
  const [floatingContactsBottomMobile, setFloatingContactsBottomMobile] = useState<number>(initialSettings.floatingContactsBottomMobile ?? 80);
  const [floatingContactsBottomDesktop, setFloatingContactsBottomDesktop] = useState<number>(initialSettings.floatingContactsBottomDesktop ?? 20);
  const [floatingContactsSideMobile, setFloatingContactsSideMobile] = useState<number>(initialSettings.floatingContactsSideMobile ?? 20);
  const [floatingContactsSideDesktop, setFloatingContactsSideDesktop] = useState<number>(initialSettings.floatingContactsSideDesktop ?? 20);
  const [floatingWhatsappEnabled, setFloatingWhatsappEnabled] = useState<boolean>(initialSettings.floatingWhatsappEnabled ?? true);
  const [floatingInstagramEnabled, setFloatingInstagramEnabled] = useState<boolean>(initialSettings.floatingInstagramEnabled ?? false);
  const [floatingTiktokEnabled, setFloatingTiktokEnabled] = useState<boolean>(initialSettings.floatingTiktokEnabled ?? false);
  const [floatingWhatsappPreset, setFloatingWhatsappPreset] = useState<string>(initialSettings.floatingWhatsappPreset ?? '');
  const [floatingWhatsappNumber, setFloatingWhatsappNumber] = useState<string>(initialSettings.floatingWhatsappNumber ?? '');

  const [headerNewsletterText, setHeaderNewsletterText] = useState<string>(initialSettings.headerNewsletterText ?? '');
  const [headerDesktopLogoAlign, setHeaderDesktopLogoAlign] = useState<'left' | 'center' | 'right'>(initialSettings.headerDesktopLogoAlign ?? 'left');
  const [headerDesktopSearchAlign, setHeaderDesktopSearchAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerDesktopSearchAlign ?? 'left');
  const [headerDesktopWishlistAlign, setHeaderDesktopWishlistAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerDesktopWishlistAlign ?? 'right');
  const [headerDesktopCartAlign, setHeaderDesktopCartAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerDesktopCartAlign ?? 'right');
  const [headerDesktopThemeAlign, setHeaderDesktopThemeAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerDesktopThemeAlign ?? 'right');
  const [headerMobileMenuAlign, setHeaderMobileMenuAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerMobileMenuAlign ?? 'left');
  const [headerMobileLogoAlign, setHeaderMobileLogoAlign] = useState<'left' | 'center' | 'right'>(initialSettings.headerMobileLogoAlign ?? 'center');
  const [headerMobileSearchAlign, setHeaderMobileSearchAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerMobileSearchAlign ?? 'right');
  const [headerMobileCartAlign, setHeaderMobileCartAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerMobileCartAlign ?? 'right');
  const [headerMobileWishlistAlign, setHeaderMobileWishlistAlign] = useState<'left' | 'right' | 'hidden'>(initialSettings.headerMobileWishlistAlign ?? 'hidden');

  const [headerTopBarBg, setHeaderTopBarBg] = useState<string>(initialSettings.headerTopBarBg ?? '#1a1a2e');
  const [headerTopBarTextColor, setHeaderTopBarTextColor] = useState<string>(initialSettings.headerTopBarTextColor ?? '#ffffff');
  const [headerBg, setHeaderBg] = useState<string>(initialSettings.headerBg ?? '#ffffff');
  const [headerTextColor, setHeaderTextColor] = useState<string>(initialSettings.headerTextColor ?? '#1a1a1a');
  const [headerBorderColor, setHeaderBorderColor] = useState<string>(initialSettings.headerBorderColor ?? '#e5e7eb');
  const [headerDesktopMenuAlign, setHeaderDesktopMenuAlign] = useState<'left' | 'center' | 'right' | 'hidden'>(initialSettings.headerDesktopMenuAlign ?? 'left');

  const [navigationMenu, setNavigationMenu] = useState<NavigationItem[]>(initialSettings.navigationMenu ?? []);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [menuItemParentId, setMenuItemParentId] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Premium Features States
  const [exitIntentEnabled, setExitIntentEnabled] = useState(initialSettings.exit_intent_enabled ?? false);
  const [exitIntentTitle, setExitIntentTitle] = useState(initialSettings.exit_intent_title ?? 'Wait! Get a Special Discount');
  const [exitIntentText, setExitIntentText] = useState(initialSettings.exit_intent_text ?? 'Submit your WhatsApp number to unlock a secret coupon code.');
  const [exitIntentCoupon, setExitIntentCoupon] = useState(initialSettings.exit_intent_coupon ?? 'WELCOME10');
  const [spinWheelEnabled, setSpinWheelEnabled] = useState(initialSettings.spin_wheel_enabled ?? false);
  const [spinWheelSegments, setSpinWheelSegments] = useState<string[]>(
    Array.isArray(initialSettings.spin_wheel_segments)
      ? initialSettings.spin_wheel_segments
      : typeof initialSettings.spin_wheel_segments === 'string'
        ? JSON.parse(initialSettings.spin_wheel_segments)
        : ['Try Again', '5% Off', 'Free Shipping', '10% Off', 'Free Delivery', 'WELCOME15']
  );
  const [cartTimerMinutes, setCartTimerMinutes] = useState(initialSettings.cart_timer_minutes ?? 10);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(initialSettings.free_shipping_threshold ?? 2000);
  const [volumeDiscountThreshold, setVolumeDiscountThreshold] = useState(initialSettings.volume_discount_threshold ?? 3);
  const [volumeDiscountPercentage, setVolumeDiscountPercentage] = useState(initialSettings.volume_discount_percentage ?? 10);
  const [recentBuyersStr, setRecentBuyersStr] = useState(
    typeof initialSettings.recent_buyers === 'string'
      ? initialSettings.recent_buyers
      : JSON.stringify(initialSettings.recent_buyers ?? [])
  );
  const [recentlyViewedLimit, setRecentlyViewedLimit] = useState(initialSettings.recently_viewed_limit ?? 4);

  // Individual enable/disable switches for Premium features
  const [recentBuyersEnabled, setRecentBuyersEnabled] = useState(initialSettings.recent_buyers_enabled ?? true);
  const [cookieConsentEnabled, setCookieConsentEnabled] = useState(initialSettings.cookie_consent_enabled ?? true);
  const [freeShippingBarEnabled, setFreeShippingBarEnabled] = useState(initialSettings.free_shipping_bar_enabled ?? true);
  const [volumeDiscountsEnabled, setVolumeDiscountsEnabled] = useState(initialSettings.volume_discounts_enabled ?? true);
  const [frequentlyBoughtTogetherEnabled, setFrequentlyBoughtTogetherEnabled] = useState(initialSettings.frequently_bought_together_enabled ?? true);
  const [stockUrgencyEnabled, setStockUrgencyEnabled] = useState(initialSettings.stock_urgency_enabled ?? true);
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(initialSettings.flash_sale_enabled ?? true);
  const [flashSaleStartDate, setFlashSaleStartDate] = useState(initialSettings.flash_sale_start_date || '');
  const [flashSaleEndDate, setFlashSaleEndDate] = useState(initialSettings.flash_sale_end_date || '');
  const [globalFlashSaleDiscountType, setGlobalFlashSaleDiscountType] = useState(initialSettings.globalFlashSaleDiscountType || 'percentage');
  const [globalFlashSaleDiscountValue, setGlobalFlashSaleDiscountValue] = useState(initialSettings.globalFlashSaleDiscountValue || 0);
  const [socialFeedsEnabled, setSocialFeedsEnabled] = useState(initialSettings.social_feeds_enabled ?? true);
  const [cartTimerEnabled, setCartTimerEnabled] = useState(initialSettings.cart_timer_enabled ?? true);
  const [sizeGuideEnabled, setSizeGuideEnabled] = useState(initialSettings.size_guide_enabled ?? true);

  // Advanced settings fields
  const [socialFeedsHomepageEnabled, setSocialFeedsHomepageEnabled] = useState(initialSettings.social_feeds_homepage_enabled ?? true);
  const [socialFeedsProductEnabled, setSocialFeedsProductEnabled] = useState(initialSettings.social_feeds_product_enabled ?? true);
  const [socialFeedsTitle, setSocialFeedsTitle] = useState(initialSettings.social_feeds_title ?? 'Follow Us On Instagram');
  const [socialFeedsSubtitle, setSocialFeedsSubtitle] = useState(initialSettings.social_feeds_subtitle ?? '@Zaynahs.pk');
  const [socialFeedsDesc, setSocialFeedsDesc] = useState(initialSettings.social_feeds_desc ?? 'Tag us in your post to get featured on our page');
  const [socialFeedsItems, setSocialFeedsItems] = useState<any[]>(
    Array.isArray(initialSettings.social_feeds_items)
      ? initialSettings.social_feeds_items
      : typeof initialSettings.social_feeds_items === 'string'
        ? JSON.parse(initialSettings.social_feeds_items)
        : []
  );
  const [cartTimerMessage, setCartTimerMessage] = useState(initialSettings.cart_timer_message ?? 'Items in your cart are reserved for {timer} minutes.');
  const [couponCodesEnabled, setCouponCodesEnabled] = useState(initialSettings.coupon_codes_enabled ?? true);

  // Pixels & Tracking States
  const [metaPixelId, setMetaPixelId] = useState(initialSettings.meta_pixel_id || '');
  const [metaSyncEnabled, setMetaSyncEnabled] = useState(initialSettings.meta_sync_enabled ?? false);
  const [ga4MeasurementId, setGa4MeasurementId] = useState(initialSettings.ga4_measurement_id || '');
  const [gtmContainerId, setGtmContainerId] = useState(initialSettings.gtm_container_id || '');
  const [tiktokPixelId, setTiktokPixelId] = useState(initialSettings.tiktok_pixel_id || '');
  const [twitterPixelId, setTwitterPixelId] = useState(initialSettings.twitter_pixel_id || '');
  const [snapchatPixelId, setSnapchatPixelId] = useState(initialSettings.snapchat_pixel_id || '');
  const [pinterestTagId, setPinterestTagId] = useState(initialSettings.pinterest_tag_id || '');

  // SEO & Social States
  const [twitterHandle, setTwitterHandle] = useState(initialSettings.twitter_handle || '');
  const [metaTitleSuffix, setMetaTitleSuffix] = useState(initialSettings.meta_title_suffix || '');
  const [metaTitle, setMetaTitle] = useState(initialSettings.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(initialSettings.metaDescription || '');

  // AI settings States
  const [aiEnabled, setAiEnabled] = useState(initialSettings.ai_enabled ?? false);
  const [contentProvider, setContentProvider] = useState(initialSettings.content_provider || 'groq');
  const [contentModel, setContentModel] = useState(initialSettings.content_model || 'llama-3.3-70b-versatile');
  const [contentKeys, setContentKeys] = useState(initialSettings.content_keys || '');
  const [visionProvider, setVisionProvider] = useState(initialSettings.vision_provider || 'gemini');
  const [visionModel, setVisionModel] = useState(initialSettings.vision_model || 'gemini-2.0-flash');
  const [visionKeys, setVisionKeys] = useState(initialSettings.vision_keys || '');
  const [aiTone, setAiTone] = useState(initialSettings.ai_tone || 'Professional');
  const [aiLanguage, setAiLanguage] = useState(initialSettings.ai_language || 'English');
  const [aiCustomInstructions, setAiCustomInstructions] = useState(initialSettings.ai_custom_instructions || '');
  const [autoContentSeo, setAutoContentSeo] = useState(initialSettings.auto_content_seo ?? true);
  const [autoMediaAi, setAutoMediaAi] = useState(initialSettings.auto_media_ai ?? true);
  const [targetAudiences, setTargetAudiences] = useState(initialSettings.target_audiences || 'Kids');
  const [productTypes, setProductTypes] = useState(initialSettings.product_types || 'Clothes, Shoes');
  const [categoryDefaultTemplate, setCategoryDefaultTemplate] = useState(initialSettings.category_default_template || '');
  const [productDefaultTemplate, setProductDefaultTemplate] = useState(initialSettings.product_default_template || '');
  const [categoryDescriptionPrompt, setCategoryDescriptionPrompt] = useState(initialSettings.category_description_prompt || '');
  const [categoryDescriptionLimit, setCategoryDescriptionLimit] = useState(initialSettings.category_description_limit ?? 150);
  const [productDescriptionPrompt, setProductDescriptionPrompt] = useState(initialSettings.product_description_prompt || '');
  const [productDescriptionLimit, setProductDescriptionLimit] = useState(initialSettings.product_description_limit ?? 250);
  const [productShortPrompt, setProductShortPrompt] = useState(initialSettings.product_short_prompt || '');
  const [productShortLimit, setProductShortLimit] = useState(initialSettings.product_short_limit ?? 100);

  // SMTP/Email Settings States
  const [smtpEmail, setSmtpEmail] = useState(initialSettings.smtp_email || '');
  const [smtpAppPassword, setSmtpAppPassword] = useState(initialSettings.smtp_app_password || '');
  const [smtpFromName, setSmtpFromName] = useState(initialSettings.smtp_from_name || '');
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(initialSettings.admin_notification_email || '');
  const [lowStockThreshold, setLowStockThreshold] = useState(initialSettings.low_stock_threshold ?? 5);

  // Abandoned Cart Settings States
  const [abandonedCartEmailEnabled, setAbandonedCartEmailEnabled] = useState(initialSettings.abandonedCartEmailEnabled ?? false);
  const [abandonedCartAdminNotify, setAbandonedCartAdminNotify] = useState(initialSettings.abandonedCartAdminNotify ?? false);
  const [abandonedCartEmailSubject, setAbandonedCartEmailSubject] = useState(initialSettings.abandonedCartEmailSubject || 'You left items in your cart!');
  const [abandonedCartEmailTemplate, setAbandonedCartEmailTemplate] = useState(initialSettings.abandonedCartEmailTemplate || 'Hi {{name}},\n\nYou left some items in your cart. Complete your purchase here:\n{{checkout_url}}');

  const defaultEmailNotifications = {
    welcome: true,
    password_reset: true,
    password_changed: true,
    order_placed: true,
    order_confirmed: true,
    order_shipped: true,
    order_delivered: true,
    order_cancelled: true,
    order_refunded: true,
    review_request: true,
    admin_new_order: true,
    admin_low_stock: true,
    admin_new_customer: true,
    admin_new_review: true,
    admin_contact_form: true
  };
  const [emailNotifications, setEmailNotifications] = useState<Record<string, boolean>>(() => {
    const raw = initialSettings.email_notifications;
    if (!raw) return defaultEmailNotifications;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { ...defaultEmailNotifications, ...parsed };
    } catch {
      return defaultEmailNotifications;
    }
  });

  // Coupons Manager States
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState<number>(0);
  const [couponMinCartAmount, setCouponMinCartAmount] = useState<number>(0);
  const [couponActive, setCouponActive] = useState(true);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Social feed temp items
  const [tempFeedUsername, setTempFeedUsername] = useState('');
  const [tempFeedLink, setTempFeedLink] = useState('');
  const [tempFeedImageUrl, setTempFeedImageUrl] = useState('');
  const [tempFeedCaption, setTempFeedCaption] = useState('');
  const [tempFeedVideoUrl, setTempFeedVideoUrl] = useState('');
  const [tempFeedVideoAutoplay, setTempFeedVideoAutoplay] = useState(false);
  const [uploadingFeedImage, setUploadingFeedImage] = useState(false);

  // Advanced Recent Buyers & Popups states
  const [recentBuyersNames, setRecentBuyersNames] = useState(initialSettings.recent_buyers_names || '');
  const [recentBuyersCities, setRecentBuyersCities] = useState(initialSettings.recent_buyers_cities || '');
  const [recentBuyersSource, setRecentBuyersSource] = useState<'simulated' | 'real'>(initialSettings.recent_buyers_source || 'simulated');
  const [recentBuyersProductPool, setRecentBuyersProductPool] = useState<'any' | 'featured' | 'sale' | 'recent' | 'custom'>(initialSettings.recent_buyers_product_pool || 'any');
  const [recentBuyersCustomProducts, setRecentBuyersCustomProducts] = useState<string[]>(
    Array.isArray(initialSettings.recent_buyers_custom_products)
      ? initialSettings.recent_buyers_custom_products
      : typeof initialSettings.recent_buyers_custom_products === 'string'
        ? JSON.parse(initialSettings.recent_buyers_custom_products || '[]')
        : []
  );
  const [recentBuyersInitialDelay, setRecentBuyersInitialDelay] = useState(initialSettings.recent_buyers_initial_delay ?? 15);
  const [recentBuyersInterval, setRecentBuyersInterval] = useState(initialSettings.recent_buyers_interval ?? 35);
  const [recentBuyersDisplayDuration, setRecentBuyersDisplayDuration] = useState(initialSettings.recent_buyers_display_duration ?? 6);
  const [recentBuyersShowOnCheckout, setRecentBuyersShowOnCheckout] = useState(initialSettings.recent_buyers_show_on_checkout ?? false);
  const [exitIntentImageUrl, setExitIntentImageUrl] = useState(initialSettings.exit_intent_image_url || '');
  const [exitIntentDelayMobile, setExitIntentDelayMobile] = useState(initialSettings.exit_intent_delay_mobile ?? 25);
  const [cookieConsentText, setCookieConsentText] = useState(initialSettings.cookie_consent_text || '');
  const [cookieConsentButtonText, setCookieConsentButtonText] = useState(initialSettings.cookie_consent_button_text || '');

  // Menu modal form state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItemState, setEditingMenuItemState] = useState<{ pIndex: number; childId: string | null; cIndex: number | null; id: string } | null>(null);
  const [menuItemLabel, setMenuItemLabel] = useState('');
  const [menuItemUrl, setMenuItemUrl] = useState('');
  const [menuItemLinkType, setMenuItemLinkType] = useState<'custom' | 'category' | 'product' | 'system'>('custom');
  const [menuItemCategoryId, setMenuItemCategoryId] = useState('');
  const [menuItemProductId, setMenuItemProductId] = useState('');
  const [menuItemSystemPage, setMenuItemSystemPage] = useState<'home' | 'shop' | 'cart' | 'wishlist'>('home');

  // Shipping & Payment lists states
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // New shipping form
  const [newShipName, setNewShipName] = useState('');
  const [newShipCost, setNewShipCost] = useState('');
  const [newShipDays, setNewShipDays] = useState('');

  // New payment form
  const [newPayName, setNewPayName] = useState('');
  const [newPayCode, setNewPayCode] = useState('cod');
  const [newPayInstructions, setNewPayInstructions] = useState('');

  // Inline editing row states
  const [editingShipId, setEditingShipId] = useState<string | null>(null);
  const [editShipName, setEditShipName] = useState('');
  const [editShipCost, setEditShipCost] = useState('');
  const [editShipDays, setEditShipDays] = useState('');

  const [editingPayId, setEditingPayId] = useState<string | null>(null);
  const [editPayName, setEditPayName] = useState('');
  const [editPayCode, setEditPayCode] = useState('');
  const [editPayInstructions, setEditPayInstructions] = useState('');

  useEffect(() => {
    async function loadLists() {
      try {
        const [shipList, payList, catList, prodList, couponList] = await Promise.all([
          getShippingMethods(),
          getPaymentMethods(),
          getCategories(),
          getAllProductsAdmin(),
          getCoupons()
        ]);
        setShippingMethods(shipList);
        setPaymentMethods(payList);
        setCategoriesList(catList || []);
        setProductsList(prodList || []);
        setCoupons(couponList || []);
      } catch (err) {
        console.error('Failed to load settings lists:', err);
        toast.error('Failed to load shipping, payment, categories, products, or coupons lists');
      } finally {
        setLoadingLists(false);
        setLoadingCoupons(false);
      }
    }
    loadLists();
  }, []);

  const handleAddShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipName.trim()) return toast.error('Shipping Name is required');
    const costVal = parseFloat(newShipCost) || 0;

    try {
      const newMethod = await createShippingMethod({
        name: newShipName.trim(),
        cost: costVal,
        estimatedDays: newShipDays.trim() || undefined,
        active: true
      });
      setShippingMethods(prev => [...prev, newMethod]);
      setNewShipName('');
      setNewShipCost('');
      setNewShipDays('');
      toast.success('Shipping method added successfully!');
    } catch (err) {
      toast.error('Failed to add shipping method');
    }
  };

  const handleToggleShippingActive = async (id: string, currentActive: boolean) => {
    try {
      const updated = await updateShippingMethod(id, { active: !currentActive });
      setShippingMethods(prev => prev.map(item => item.id === id ? updated : item));
      toast.success(`Shipping method ${!currentActive ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update shipping method status');
    }
  };

  const handleDeleteShipping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipping method?')) return;
    try {
      await deleteShippingMethod(id);
      setShippingMethods(prev => prev.filter(item => item.id !== id));
      toast.success('Shipping method deleted');
    } catch (err) {
      toast.error('Failed to delete shipping method');
    }
  };

  const startEditShipping = (method: ShippingMethod) => {
    setEditingShipId(method.id);
    setEditShipName(method.name);
    setEditShipCost(method.cost.toString());
    setEditShipDays(method.estimatedDays || '');
  };

  const handleSaveShippingEdit = async (id: string) => {
    if (!editShipName.trim()) return toast.error('Shipping Name is required');
    const costVal = parseFloat(editShipCost) || 0;
    try {
      const updated = await updateShippingMethod(id, {
        name: editShipName.trim(),
        cost: costVal,
        estimatedDays: editShipDays.trim() || undefined
      });
      setShippingMethods(prev => prev.map(item => item.id === id ? updated : item));
      setEditingShipId(null);
      toast.success('Shipping method updated successfully!');
    } catch (err) {
      toast.error('Failed to update shipping method');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayName.trim()) return toast.error('Payment Method Name is required');
    if (!newPayCode.trim()) return toast.error('Badge Code is required');

    try {
      const newMethod = await createPaymentMethod({
        name: newPayName.trim(),
        code: newPayCode.trim(),
        instructions: newPayInstructions.trim() || undefined,
        active: true
      });
      setPaymentMethods(prev => [...prev, newMethod]);
      setNewPayName('');
      setNewPayCode('cod');
      setNewPayInstructions('');
      toast.success('Payment method added successfully!');
    } catch (err) {
      toast.error('Failed to add payment method');
    }
  };

  const handleTogglePaymentActive = async (id: string, currentActive: boolean) => {
    try {
      const updated = await updatePaymentMethod(id, { active: !currentActive });
      setPaymentMethods(prev => prev.map(item => item.id === id ? updated : item));
      toast.success(`Payment method ${!currentActive ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update payment method status');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      await deletePaymentMethod(id);
      setPaymentMethods(prev => prev.filter(item => item.id !== id));
      toast.success('Payment method deleted');
    } catch (err) {
      toast.error('Failed to delete payment method');
    }
  };

  const startEditPayment = (method: PaymentMethod) => {
    setEditingPayId(method.id);
    setEditPayName(method.name);
    setEditPayCode(method.code);
    setEditPayInstructions(method.instructions || '');
  };

  const handleSavePaymentEdit = async (id: string) => {
    if (!editPayName.trim()) return toast.error('Payment Name is required');
    if (!editPayCode.trim()) return toast.error('Badge Code is required');
    try {
      const updated = await updatePaymentMethod(id, {
        name: editPayName.trim(),
        code: editPayCode.trim(),
        instructions: editPayInstructions.trim() || null as any
      });
      setPaymentMethods(prev => prev.map(item => item.id === id ? updated : item));
      setEditingPayId(null);
      toast.success('Payment method updated successfully!');
    } catch (err) {
      toast.error('Failed to update payment method');
    }
  };

  const handleReorderShipping = async (orderedIds: string[]) => {
    try {
      setShippingMethods(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        return orderedIds.map((id, i) => ({ ...map.get(id)!, sortOrder: i }));
      });
      await reorderShippingMethods(orderedIds);
      toast.success('Shipping methods reordered');
    } catch (err) {
      toast.error('Failed to reorder shipping methods');
    }
  };

  const handleReorderPayment = async (orderedIds: string[]) => {
    try {
      setPaymentMethods(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        return orderedIds.map((id, i) => ({ ...map.get(id)!, sortOrder: i }));
      });
      await reorderPaymentMethods(orderedIds);
      toast.success('Payment methods reordered');
    } catch (err) {
      toast.error('Failed to reorder payment methods');
    }
  };

  // Uploading states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingExitIntent, setUploadingExitIntent] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'banner' | 'exit_intent') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'logo') setUploadingLogo(true);
      if (type === 'favicon') setUploadingFavicon(true);
      if (type === 'banner') setUploadingBanner(true);
      if (type === 'exit_intent') setUploadingExitIntent(true);

      const url = await uploadImage(file, 'product-images');

      if (type === 'logo') setLogoUrl(url);
      if (type === 'favicon') setFaviconUrl(url);
      if (type === 'banner') setBannerUrl(url);
      if (type === 'exit_intent') setExitIntentImageUrl(url);

      toast.success(`${type.toUpperCase().replace('_', ' ')} uploaded and optimized successfully!`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : `Failed to upload ${type}`;
      toast.error(msg);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      if (type === 'favicon') setUploadingFavicon(false);
      if (type === 'banner') setUploadingBanner(false);
      if (type === 'exit_intent') setUploadingExitIntent(false);
    }
  };

  const handleRemoveImage = (type: 'logo' | 'favicon' | 'banner' | 'exit_intent') => {
    if (type === 'logo') setLogoUrl('');
    if (type === 'favicon') setFaviconUrl('');
    if (type === 'banner') setBannerUrl('');
    if (type === 'exit_intent') setExitIntentImageUrl('');
    toast.success(`${type.toUpperCase().replace('_', ' ')} reference removed`);
  };

  // Coupon Handlers
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return toast.error('Coupon Code is required');
    if (couponValue <= 0) return toast.error('Coupon Value must be greater than 0');

    try {
      if (editingCouponId) {
        const updated = await updateCoupon(editingCouponId, {
          code: couponCode,
          discountType: couponDiscountType,
          value: couponValue,
          minCartAmount: couponMinCartAmount,
          active: couponActive
        });
        setCoupons(prev => prev.map(c => c.id === editingCouponId ? updated : c));
        toast.success('Coupon updated successfully!');
      } else {
        const created = await createCoupon({
          code: couponCode,
          discountType: couponDiscountType,
          value: couponValue,
          minCartAmount: couponMinCartAmount,
          active: couponActive
        });
        setCoupons(prev => [created, ...prev]);
        toast.success('Coupon created successfully!');
      }
      setCouponCode('');
      setCouponDiscountType('percentage');
      setCouponValue(0);
      setCouponMinCartAmount(0);
      setCouponActive(true);
      setEditingCouponId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon');
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCouponCode(coupon.code);
    setCouponDiscountType(coupon.discountType);
    setCouponValue(coupon.value);
    setCouponMinCartAmount(coupon.minCartAmount || 0);
    setCouponActive(coupon.active);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('Coupon deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete coupon');
    }
  };

  // Social Feed Handlers
  const handleUploadSocialFeedImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFeedImage(true);
      const url = await uploadImage(file, 'product-images');
      setTempFeedImageUrl(url);
      toast.success('Social post image uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingFeedImage(false);
    }
  };

  const handleAddSocialFeedItem = () => {
    if (!tempFeedImageUrl) return toast.error('Image is required');
    if (!tempFeedUsername.trim()) return toast.error('Username is required');
    if (!tempFeedLink.trim()) return toast.error('Link is required');

    const newItem = {
      id: Date.now().toString(),
      imageUrl: tempFeedImageUrl,
      username: tempFeedUsername.trim(),
      link: tempFeedLink.trim(),
      caption: tempFeedCaption.trim(),
      videoUrl: tempFeedVideoUrl.trim() || undefined,
      videoAutoplay: tempFeedVideoAutoplay
    };

    setSocialFeedsItems(prev => [...prev, newItem]);
    setTempFeedImageUrl('');
    setTempFeedUsername('');
    setTempFeedLink('');
    setTempFeedCaption('');
    setTempFeedVideoUrl('');
    setTempFeedVideoAutoplay(false);
    toast.success('Social post item added!');
  };

  const handleDeleteSocialFeedItem = (id: string) => {
    setSocialFeedsItems(prev => prev.filter((item: any) => (item.id || item.imageUrl) !== id));
    toast.success('Social post item removed!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error('Store Name is required');
    if (!whatsappNumber.trim()) return toast.error('WhatsApp Number is required');

    // Rule W2 Check: Clean WhatsApp number
    const cleanPhone = cleanWhatsAppPhone(whatsappNumber);

    try {
      const payload: Partial<StoreSettings> = {
        storeName: storeName.trim(),
        storeUrl: storeUrl.trim(),
        whatsappNumber: cleanPhone,
        currency: currency.trim(),
        currencySymbol: currencySymbol.trim(),
        logoUrl: logoUrl.trim() || undefined,
        logoWidth: Number(logoWidth),
        bannerUrl: bannerUrl.trim() || undefined,
        faviconUrl: faviconUrl.trim() || undefined,
        tagline: tagline.trim() || undefined,
        address: address.trim() || undefined,
        showStock,
        showComparePrice,
        enableSearch,
        enableCategoryFilter,
        whatsappGreeting: whatsappGreeting.trim(),
        whatsappFooter: whatsappFooter.trim(),
        popularSearches: popularSearches.trim(),
        footerText: footerText.trim() || undefined,
        socialFacebook: socialFacebook.trim() || undefined,
        socialInstagram: socialInstagram.trim() || undefined,
        socialWhatsapp: cleanWhatsAppPhone(socialWhatsapp) || undefined,
        socialYoutube: socialYoutube.trim() || undefined,
        enableFakeViews,
        minViews: Number(minViews),
        maxViews: Number(maxViews),
        enableTrustBadges,
        deliveryEstimateText: deliveryEstimateText.trim(),
        freeShippingText: freeShippingText.trim(),
        promoCodeText: promoCodeText.trim(),
        enableSafeCheckout: enableTrustBadges,
        safeCheckoutText: safeCheckoutText.trim(),
        safeCheckoutMethods,
        enableTicker,
        tickerText: tickerText.trim(),
        enableVariantSwatches,
        swatchShape,
        swatchSize,
        swatchLimit: Number(swatchLimit) || 8,
        defaultVariantIndex: Number(defaultVariantIndex) || 1,
        imageHoverStyle,
        imageAspectRatio,
        titleLineLimit,
        archiveSwatchSize,
        productSwatchSize,
        archiveSwatchAlign,
        card_show_description: cardShowDescription,
        card_show_swatches: cardShowSwatches,
        card_show_sizes: cardShowSizes,
        card_show_materials: cardShowMaterials,
        card_show_custom: cardShowCustom,
        card_show_custom_2: cardShowCustom2,
        card_show_type_color: cardShowTypeColor,
        card_show_type_size: cardShowTypeSize,
        card_show_type_material: cardShowTypeMaterial,
        card_show_type_custom: cardShowTypeCustom,
        card_mobile_columns: cardMobileColumns,
        headerSticky,
        headerStickyDesktop,
        headerStickyMobile,
        headerShowTopBar,
        headerTopBarPhone,
        headerTopBarEmail,
        headerShowNewsletter,
        headerNewsletterText,
        headerTopBarBg,
        headerTopBarTextColor,
        headerBg,
        headerTextColor,
        headerBorderColor,
        headerDesktopLogoAlign,
        headerDesktopSearchAlign,
        headerDesktopWishlistAlign,
        headerDesktopCartAlign,
        headerDesktopThemeAlign,
        headerMobileLogoAlign,
        headerMobileMenuAlign,
        headerMobileSearchAlign,
        headerMobileCartAlign,
        headerMobileWishlistAlign,
        navigationMenu,
        headerDesktopMenuAlign,
        faqContent: faqContent.trim(),
        returnPolicyContent: returnPolicyContent.trim(),
        privacyPolicyContent: privacyPolicyContent.trim(),
        showFaqInNav,
        showReturnsInNav,
        showPrivacyInNav,
        showFaqInFooter,
        showReturnsInFooter,
        showPrivacyInFooter,
        trustBadge1Title: trustBadge1Title.trim(),
        trustBadge1Desc: trustBadge1Desc.trim(),
        trustBadge1Icon: trustBadge1Icon.trim(),
        trustBadge2Title: trustBadge2Title.trim(),
        trustBadge2Desc: trustBadge2Desc.trim(),
        trustBadge2Icon: trustBadge2Icon.trim(),
        trustBadge3Title: trustBadge3Title.trim(),
        trustBadge3Desc: trustBadge3Desc.trim(),
        trustBadge3Icon: trustBadge3Icon.trim(),
        trustBadge4Title: trustBadge4Title.trim(),
        trustBadge4Desc: trustBadge4Desc.trim(),
        trustBadge4Icon: trustBadge4Icon.trim(),

        trustBadge1Enabled,
        trustBadge2Enabled,
        trustBadge3Enabled,
        trustBadge4Enabled,

        socialTiktok: socialTiktok.trim(),
        socialSnapchat: socialSnapchat.trim(),
        socialTwitter: socialTwitter.trim(),

        footerCol1Title: footerCol1Title.trim(),
        footerCol2Title: footerCol2Title.trim(),
        footerCol2Text: footerCol2Text.trim(),
        footerCol3Title: footerCol3Title.trim(),
        footerCol4Title: footerCol4Title.trim(),
        footerCol4Text: footerCol4Text.trim(),
        footerBottomText: footerBottomText.trim(),
        footerShowPayments,
        footerShowMenu,
        footerShowNewsletter,
        footerShowSocial,
        floatingContactsEnabled,
        floatingContactsPosition,
        floatingContactsBottomMobile: Number(floatingContactsBottomMobile),
        floatingContactsBottomDesktop: Number(floatingContactsBottomDesktop),
        floatingContactsSideMobile: Number(floatingContactsSideMobile),
        floatingContactsSideDesktop: Number(floatingContactsSideDesktop),
        floatingContactsScale: Number(floatingContactsScale),
        floatingWhatsappPreset: floatingWhatsappPreset.trim(),
        floatingWhatsappNumber: floatingWhatsappNumber.trim() ? cleanWhatsAppPhone(floatingWhatsappNumber.trim()) : '',
        floatingWhatsappEnabled,
        floatingInstagramEnabled,
        floatingTiktokEnabled,
        floatingSnapchatEnabled,
        floatingTwitterEnabled,

        exit_intent_enabled: exitIntentEnabled,
        exit_intent_title: exitIntentTitle.trim(),
        exit_intent_text: exitIntentText.trim(),
        exit_intent_coupon: exitIntentCoupon.trim().toUpperCase(),
        spin_wheel_enabled: spinWheelEnabled,
        spin_wheel_segments: spinWheelSegments,
        cart_timer_minutes: Number(cartTimerMinutes),
        free_shipping_threshold: Number(freeShippingThreshold),
        volume_discount_threshold: Number(volumeDiscountThreshold),
        volume_discount_percentage: Number(volumeDiscountPercentage),
        recent_buyers: recentBuyersStr.trim(),
        recently_viewed_limit: Number(recentlyViewedLimit),
        recent_buyers_enabled: recentBuyersEnabled,
        cookie_consent_enabled: cookieConsentEnabled,
        free_shipping_bar_enabled: freeShippingBarEnabled,
        volume_discounts_enabled: volumeDiscountsEnabled,
        frequently_bought_together_enabled: frequentlyBoughtTogetherEnabled,
        stock_urgency_enabled: stockUrgencyEnabled,
        flash_sale_enabled: flashSaleEnabled,
        flash_sale_start_date: flashSaleStartDate || undefined,
        flash_sale_end_date: flashSaleEndDate || undefined,
        globalFlashSaleDiscountType: globalFlashSaleDiscountType,
        globalFlashSaleDiscountValue: globalFlashSaleDiscountValue,
        social_feeds_enabled: socialFeedsEnabled,
        cart_timer_enabled: cartTimerEnabled,
        size_guide_enabled: sizeGuideEnabled,
        recent_buyers_names: recentBuyersNames.trim(),
        recent_buyers_cities: recentBuyersCities.trim(),
        recent_buyers_source: recentBuyersSource,
        recent_buyers_product_pool: recentBuyersProductPool,
        recent_buyers_custom_products: recentBuyersCustomProducts,
        recent_buyers_initial_delay: Number(recentBuyersInitialDelay),
        recent_buyers_interval: Number(recentBuyersInterval),
        recent_buyers_display_duration: Number(recentBuyersDisplayDuration),
        recent_buyers_show_on_checkout: recentBuyersShowOnCheckout,
        exit_intent_image_url: exitIntentImageUrl.trim(),
        exit_intent_delay_mobile: Number(exitIntentDelayMobile),
        cookie_consent_text: cookieConsentText.trim(),
        cookie_consent_button_text: cookieConsentButtonText.trim(),
        social_feeds_homepage_enabled: socialFeedsHomepageEnabled,
        social_feeds_product_enabled: socialFeedsProductEnabled,
        social_feeds_title: socialFeedsTitle.trim(),
        social_feeds_subtitle: socialFeedsSubtitle.trim(),
        social_feeds_desc: socialFeedsDesc.trim(),
        social_feeds_items: socialFeedsItems,
        cart_timer_message: cartTimerMessage.trim(),
        coupon_codes_enabled: couponCodesEnabled,

        // Pixels & Tracking
        meta_pixel_id: metaPixelId.trim(),
        meta_sync_enabled: metaSyncEnabled,
        ga4_measurement_id: ga4MeasurementId.trim(),
        gtm_container_id: gtmContainerId.trim(),
        tiktok_pixel_id: tiktokPixelId.trim(),
        twitter_pixel_id: twitterPixelId.trim(),
        snapchat_pixel_id: snapchatPixelId.trim(),
        pinterest_tag_id: pinterestTagId.trim(),

        // Social & SEO
        twitter_handle: twitterHandle.trim(),
        meta_title_suffix: metaTitleSuffix.trim(),
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),

        // AI settings
        ai_enabled: aiEnabled,
        content_provider: contentProvider.trim(),
        content_model: contentModel.trim(),
        content_keys: contentKeys.trim(),
        vision_provider: visionProvider.trim(),
        vision_model: visionModel.trim(),
        vision_keys: visionKeys.trim(),
        ai_tone: aiTone.trim(),
        ai_language: aiLanguage.trim(),
        ai_custom_instructions: aiCustomInstructions.trim(),
        auto_content_seo: autoContentSeo,
        auto_media_ai: autoMediaAi,
        // Note: target_audiences, product_types
        // are managed exclusively via /admin/seo/settings → ai_settings table directly.
        category_default_template: categoryDefaultTemplate.trim(),
        product_default_template: productDefaultTemplate.trim(),
        category_description_prompt: categoryDescriptionPrompt.trim(),
        category_description_limit: Number(categoryDescriptionLimit) || 150,
        product_description_prompt: productDescriptionPrompt.trim(),
        product_description_limit: Number(productDescriptionLimit) || 250,
        product_short_prompt: productShortPrompt.trim(),
        product_short_limit: Number(productShortLimit) || 100,

        // SMTP/Email Fallback Columns
        smtp_email: smtpEmail.trim(),
        smtp_app_password: smtpAppPassword.trim(),
        smtp_from_name: smtpFromName.trim(),
        admin_notification_email: adminNotificationEmail.trim(),
        email_notifications: emailNotifications,
        low_stock_threshold: Number(lowStockThreshold) || 5,

        abandonedCartEmailEnabled: abandonedCartEmailEnabled,
        abandonedCartAdminNotify: abandonedCartAdminNotify,
        abandonedCartEmailSubject: abandonedCartEmailSubject.trim(),
        abandonedCartEmailTemplate: abandonedCartEmailTemplate.trim()
      };

      await updateSettings(payload);
      toast.success('Settings updated successfully!');
      router.refresh();
    } catch (err: any) {
      console.error('Settings update error:', err);
      toast.error(err?.message || 'Failed to update settings');
    }
  };

  const renderSettingsBadgeIcon = (iconName: string) => {
    const IconComponent = (CentralIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-5 w-5 text-[#e94560]" />;
  };

  // ============================================================
  // Navigation Menu Helper Functions
  // ============================================================

  // Helper to recursively find a node, its parent, and its siblings in the tree
  const findNodeAndParent = (
    nodes: NavigationItem[],
    targetId: string,
    parent: NavigationItem | null = null
  ): {
    node: NavigationItem | null;
    parent: NavigationItem | null;
    siblings: NavigationItem[];
    index: number;
  } => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === targetId) {
        return { node: nodes[i], parent, siblings: nodes, index: i };
      }
      if (nodes[i].children && nodes[i].children!.length > 0) {
        const result = findNodeAndParent(nodes[i].children!, targetId, nodes[i]);
        if (result.node) return result;
      }
    }
    return { node: null, parent: null, siblings: [], index: -1 };
  };

  // Helper to deep clone the menu tree to avoid direct mutation
  const deepCloneMenu = (menu: NavigationItem[]): NavigationItem[] => {
    return menu.map(item => ({
      ...item,
      children: item.children ? deepCloneMenu(item.children) : []
    }));
  };

  const moveMenuItemUp = (id: string) => {
    const updatedMenu = deepCloneMenu(navigationMenu);
    const { index, siblings } = findNodeAndParent(updatedMenu, id);
    if (index > 0 && siblings.length > 0) {
      const temp = siblings[index];
      siblings[index] = siblings[index - 1];
      siblings[index - 1] = temp;
      setNavigationMenu(updatedMenu);
    }
  };

  const moveMenuItemDown = (id: string) => {
    const updatedMenu = deepCloneMenu(navigationMenu);
    const { index, siblings } = findNodeAndParent(updatedMenu, id);
    if (index !== -1 && index < siblings.length - 1) {
      const temp = siblings[index];
      siblings[index] = siblings[index + 1];
      siblings[index + 1] = temp;
      setNavigationMenu(updatedMenu);
    }
  };

  const indentMenuItem = (id: string) => {
    const updatedMenu = deepCloneMenu(navigationMenu);
    const { index, siblings } = findNodeAndParent(updatedMenu, id);
    if (index > 0) {
      const targetItem = siblings[index];
      const prevSibling = siblings[index - 1];
      if (!prevSibling.children) {
        prevSibling.children = [];
      }
      prevSibling.children.push(targetItem);
      siblings.splice(index, 1);
      setNavigationMenu(updatedMenu);
    }
  };

  const outdentMenuItem = (id: string) => {
    const updatedMenu = deepCloneMenu(navigationMenu);
    const { node, parent, siblings, index } = findNodeAndParent(updatedMenu, id);
    if (parent) {
      const parentInfo = findNodeAndParent(updatedMenu, parent.id);
      if (parentInfo.siblings) {
        siblings.splice(index, 1);
        parentInfo.siblings.splice(parentInfo.index + 1, 0, node!);
        setNavigationMenu(updatedMenu);
      }
    }
  };

  const deleteMenuItem = (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item and all its sub-menu items?')) return;
    const updatedMenu = deepCloneMenu(navigationMenu);
    const { siblings, index } = findNodeAndParent(updatedMenu, id);
    if (index !== -1) {
      siblings.splice(index, 1);
      setNavigationMenu(updatedMenu);
    }
  };

  const openAddMenuModal = (parentId: string | null = null) => {
    setEditingMenuItemId(null);
    setMenuItemParentId(parentId);
    setMenuItemLabel('');
    setMenuItemUrl('');
    setMenuItemLinkType('custom');
    setMenuItemCategoryId('');
    setMenuItemProductId('');
    setMenuItemSystemPage('home');
    setIsMenuModalOpen(true);
  };

  const openEditMenuModal = (item: NavigationItem, depth: number, id: string) => {
    setEditingMenuItemId(id);
    setMenuItemParentId(null);
    setMenuItemLabel(item.label);
    setMenuItemUrl(item.url);

    if (item.url === '/') {
      setMenuItemLinkType('system');
      setMenuItemSystemPage('home');
    } else if (item.url === '/shop') {
      setMenuItemLinkType('system');
      setMenuItemSystemPage('shop');
    } else if (item.url === '/cart') {
      setMenuItemLinkType('system');
      setMenuItemSystemPage('cart');
    } else if (item.url === '/wishlist') {
      setMenuItemLinkType('system');
      setMenuItemSystemPage('wishlist');
    } else if (item.url.startsWith('/shop?category=')) {
      setMenuItemLinkType('category');
      const slug = item.url.replace('/shop?category=', '');
      const cat = categoriesList.find(c => c.slug === slug);
      setMenuItemCategoryId(cat?.id || '');
    } else if (item.url.startsWith('/product/')) {
      setMenuItemLinkType('product');
      const slug = item.url.replace('/product/', '');
      const prod = productsList.find(p => p.slug === slug);
      setMenuItemProductId(prod?.id || '');
    } else {
      setMenuItemLinkType('custom');
    }
    setIsMenuModalOpen(true);
  };

  const handleSaveMenuItem = () => {
    if (!menuItemLabel.trim()) {
      toast.error('Menu Label is required');
      return;
    }

    let finalUrl = menuItemUrl.trim();
    if (menuItemLinkType === 'system') {
      if (menuItemSystemPage === 'home') finalUrl = '/';
      else if (menuItemSystemPage === 'shop') finalUrl = '/shop';
      else if (menuItemSystemPage === 'cart') finalUrl = '/cart';
      else if (menuItemSystemPage === 'wishlist') finalUrl = '/wishlist';
    } else if (menuItemLinkType === 'category') {
      const cat = categoriesList.find(c => c.id === menuItemCategoryId);
      if (!cat) {
        toast.error('Please select a category');
        return;
      }
      finalUrl = `/shop?category=${cat.slug}`;
    } else if (menuItemLinkType === 'product') {
      const prod = productsList.find(p => p.id === menuItemProductId);
      if (!prod) {
        toast.error('Please select a product');
        return;
      }
      finalUrl = `/product/${prod.slug}`;
    }

    if (!finalUrl) {
      toast.error('URL/Link is required');
      return;
    }

    const updatedMenu = deepCloneMenu(navigationMenu);

    if (editingMenuItemId) {
      const { node } = findNodeAndParent(updatedMenu, editingMenuItemId);
      if (node) {
        node.label = menuItemLabel.trim();
        node.url = finalUrl;
      }
    } else {
      const newItem: NavigationItem = {
        id: Math.random().toString(36).substr(2, 9),
        label: menuItemLabel.trim(),
        url: finalUrl,
        children: []
      };
      if (menuItemParentId) {
        const { node } = findNodeAndParent(updatedMenu, menuItemParentId);
        if (node) {
          if (!node.children) node.children = [];
          node.children.push(newItem);
        }
      } else {
        updatedMenu.push(newItem);
      }
    }

    setNavigationMenu(updatedMenu);
    setIsMenuModalOpen(false);
    setEditingMenuItemId(null);
    setMenuItemParentId(null);
    toast.success('Menu item saved to local settings (click Save Settings to persist)');
  };

  const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'header', label: 'Header', icon: Layout },
    { id: 'navigation', label: 'Navigation', icon: Navigation },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'trust', label: 'Trust & Badges', icon: Zap },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'policies', label: 'Policies & FAQ', icon: HelpCircle },
    { id: 'footer', label: 'Footer & Social', icon: Globe },
    { id: 'shipping', label: 'Shipping & Pay', icon: ShoppingBag },
    { id: 'premium', label: 'Premium Features', icon: Zap },
    { id: 'coupons', label: 'Coupons', icon: CreditCard },
    { id: 'pixels', label: 'Pixels & SEO', icon: Globe },
    { id: 'ai_settings', label: 'AI Settings', icon: Zap },
    { id: 'email', label: 'Email & SMTP', icon: Mail },
    { id: 'meta_sync', label: 'Meta Sync', icon: Globe },
  ] as const;
  type TabId = typeof TABS[number]['id'];
  const [activeTab, setActiveTab] = useAdminTab<TabId>('general');

  // Redirect deprecated size_guides tab to general
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'size_guides') {
        router.replace('/admin/settings', { scroll: false });
      }
    }
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl pb-16">

      {/* ====== TAB BAR - hidden on mobile (use sidebar instead) ====== */}
      <div className="hidden md:block bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl p-2 shadow-sm">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-wrap sm:flex-nowrap">
          {TABS.filter(tab => tab.id !== 'meta_sync' || metaSyncEnabled).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${activeTab === id
                  ? 'bg-[#1a1a2e] dark:bg-[#e94560] text-white shadow-md scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ====== TAB: GENERAL ====== */}
      {activeTab === 'general' && (
        <GeneralTab
          storeName={storeName}
          setStoreName={setStoreName}
          storeUrl={storeUrl}
          setStoreUrl={setStoreUrl}
          whatsappNumber={whatsappNumber}
          setWhatsappNumber={setWhatsappNumber}
          currency={currency}
          setCurrency={setCurrency}
          currencySymbol={currencySymbol}
          setCurrencySymbol={setCurrencySymbol}
          tagline={tagline}
          setTagline={setTagline}
          address={address}
          setAddress={setAddress}
          showStock={showStock}
          setShowStock={setShowStock}
          showComparePrice={showComparePrice}
          setShowComparePrice={setShowComparePrice}
          enableSearch={enableSearch}
          setEnableSearch={setEnableSearch}
          enableCategoryFilter={enableCategoryFilter}
          setEnableCategoryFilter={setEnableCategoryFilter}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          logoWidth={logoWidth}
          setLogoWidth={setLogoWidth}
          faviconUrl={faviconUrl}
          setFaviconUrl={setFaviconUrl}
          handleRemoveImage={handleRemoveImage}
        />
      )}

      {/* ====== TAB: HEADER ====== */}
      {activeTab === 'header' && (
        <HeaderTab
          popularSearches={popularSearches}
          setPopularSearches={setPopularSearches}
          headerSticky={headerSticky}
          setHeaderSticky={setHeaderSticky}
          headerStickyDesktop={headerStickyDesktop}
          setHeaderStickyDesktop={setHeaderStickyDesktop}
          headerStickyMobile={headerStickyMobile}
          setHeaderStickyMobile={setHeaderStickyMobile}
          headerShowTopBar={headerShowTopBar}
          setHeaderShowTopBar={setHeaderShowTopBar}
          headerShowNewsletter={headerShowNewsletter}
          setHeaderShowNewsletter={setHeaderShowNewsletter}
          headerTopBarPhone={headerTopBarPhone}
          setHeaderTopBarPhone={setHeaderTopBarPhone}
          headerTopBarEmail={headerTopBarEmail}
          setHeaderTopBarEmail={setHeaderTopBarEmail}
          headerNewsletterText={headerNewsletterText}
          setHeaderNewsletterText={setHeaderNewsletterText}
          headerDesktopLogoAlign={headerDesktopLogoAlign}
          setHeaderDesktopLogoAlign={setHeaderDesktopLogoAlign}
          headerDesktopSearchAlign={headerDesktopSearchAlign}
          setHeaderDesktopSearchAlign={setHeaderDesktopSearchAlign}
          headerDesktopWishlistAlign={headerDesktopWishlistAlign}
          setHeaderDesktopWishlistAlign={setHeaderDesktopWishlistAlign}
          headerDesktopCartAlign={headerDesktopCartAlign}
          setHeaderDesktopCartAlign={setHeaderDesktopCartAlign}
          headerDesktopThemeAlign={headerDesktopThemeAlign}
          setHeaderDesktopThemeAlign={setHeaderDesktopThemeAlign}
          headerMobileMenuAlign={headerMobileMenuAlign}
          setHeaderMobileMenuAlign={setHeaderMobileMenuAlign}
          headerMobileLogoAlign={headerMobileLogoAlign}
          setHeaderMobileLogoAlign={setHeaderMobileLogoAlign}
          headerMobileSearchAlign={headerMobileSearchAlign}
          setHeaderMobileSearchAlign={setHeaderMobileSearchAlign}
          headerMobileCartAlign={headerMobileCartAlign}
          setHeaderMobileCartAlign={setHeaderMobileCartAlign}
          headerMobileWishlistAlign={headerMobileWishlistAlign}
          setHeaderMobileWishlistAlign={setHeaderMobileWishlistAlign}
          headerTopBarBg={headerTopBarBg}
          setHeaderTopBarBg={setHeaderTopBarBg}
          headerTopBarTextColor={headerTopBarTextColor}
          setHeaderTopBarTextColor={setHeaderTopBarTextColor}
          headerBg={headerBg}
          setHeaderBg={setHeaderBg}
          headerTextColor={headerTextColor}
          setHeaderTextColor={setHeaderTextColor}
          headerBorderColor={headerBorderColor}
          setHeaderBorderColor={setHeaderBorderColor}
        />
      )}

      {/* ====== TAB: NAVIGATION ====== */}
      {activeTab === 'navigation' && (
        <NavigationTab
          headerDesktopMenuAlign={headerDesktopMenuAlign}
          setHeaderDesktopMenuAlign={setHeaderDesktopMenuAlign}
          navigationMenu={navigationMenu}
          openAddMenuModal={openAddMenuModal}
          moveMenuItemUp={moveMenuItemUp}
          moveMenuItemDown={moveMenuItemDown}
          indentMenuItem={indentMenuItem}
          outdentMenuItem={outdentMenuItem}
          openEditMenuModal={openEditMenuModal}
          deleteMenuItem={deleteMenuItem}
          isMenuModalOpen={isMenuModalOpen}
          setIsMenuModalOpen={setIsMenuModalOpen}
          menuItemLabel={menuItemLabel}
          setMenuItemLabel={setMenuItemLabel}
          menuItemLinkType={menuItemLinkType}
          setMenuItemLinkType={setMenuItemLinkType}
          menuItemUrl={menuItemUrl}
          setMenuItemUrl={setMenuItemUrl}
          menuItemCategoryId={menuItemCategoryId}
          setMenuItemCategoryId={setMenuItemCategoryId}
          menuItemProductId={menuItemProductId}
          setMenuItemProductId={setMenuItemProductId}
          menuItemSystemPage={menuItemSystemPage}
          setMenuItemSystemPage={setMenuItemSystemPage}
          categoriesList={categoriesList}
          productsList={productsList}
          handleSaveMenuItem={handleSaveMenuItem}
          editingMenuItemId={editingMenuItemId}
        />
      )}

      {/* ====== TAB: PRODUCTS ====== */}
      {activeTab === 'products' && (
        <ProductsTab
          enableVariantSwatches={enableVariantSwatches}
          setEnableVariantSwatches={setEnableVariantSwatches}
          swatchShape={swatchShape}
          setSwatchShape={setSwatchShape}
          swatchLimit={swatchLimit}
          setSwatchLimit={setSwatchLimit}
          defaultVariantIndex={defaultVariantIndex}
          setDefaultVariantIndex={setDefaultVariantIndex}
          imageHoverStyle={imageHoverStyle}
          setImageHoverStyle={setImageHoverStyle}
          imageAspectRatio={imageAspectRatio}
          setImageAspectRatio={setImageAspectRatio}
          titleLineLimit={titleLineLimit}
          setTitleLineLimit={setTitleLineLimit}
          archiveSwatchSize={archiveSwatchSize}
          setArchiveSwatchSize={setArchiveSwatchSize}
          productSwatchSize={productSwatchSize}
          setProductSwatchSize={setProductSwatchSize}
          archiveSwatchAlign={archiveSwatchAlign}
          setArchiveSwatchAlign={setArchiveSwatchAlign}
          cardShowDescription={cardShowDescription}
          setCardShowDescription={setCardShowDescription}
          cardShowSwatches={cardShowSwatches}
          setCardShowSwatches={setCardShowSwatches}
          cardShowSizes={cardShowSizes}
          setCardShowSizes={setCardShowSizes}
          cardShowMaterials={cardShowMaterials}
          setCardShowMaterials={setCardShowMaterials}
          cardShowCustom={cardShowCustom}
          setCardShowCustom={setCardShowCustom}
          cardShowCustom2={cardShowCustom2}
          setCardShowCustom2={setCardShowCustom2}
          cardShowTypeColor={cardShowTypeColor}
          setCardShowTypeColor={setCardShowTypeColor}
          cardShowTypeSize={cardShowTypeSize}
          setCardShowTypeSize={setCardShowTypeSize}
          cardShowTypeMaterial={cardShowTypeMaterial}
          setCardShowTypeMaterial={setCardShowTypeMaterial}
          cardShowTypeCustom={cardShowTypeCustom}
          setCardShowTypeCustom={setCardShowTypeCustom}
          cardMobileColumns={cardMobileColumns}
          setCardMobileColumns={setCardMobileColumns}
        />
      )}

      {/* ====== TAB: TRUST & BADGES ====== */}
      {activeTab === 'trust' && (
        <TrustTab
          enableFakeViews={enableFakeViews}
          setEnableFakeViews={setEnableFakeViews}
          minViews={minViews}
          setMinViews={setMinViews}
          maxViews={maxViews}
          setMaxViews={setMaxViews}
          enableTrustBadges={enableTrustBadges}
          setEnableTrustBadges={setEnableTrustBadges}
          deliveryEstimateText={deliveryEstimateText}
          setDeliveryEstimateText={setDeliveryEstimateText}
          freeShippingText={freeShippingText}
          setFreeShippingText={setFreeShippingText}
          promoCodeText={promoCodeText}
          setPromoCodeText={setPromoCodeText}
          safeCheckoutText={safeCheckoutText}
          setSafeCheckoutText={setSafeCheckoutText}
          safeCheckoutMethods={safeCheckoutMethods}
          setSafeCheckoutMethods={setSafeCheckoutMethods}
          trustBadge1Title={trustBadge1Title}
          setTrustBadge1Title={setTrustBadge1Title}
          trustBadge1Desc={trustBadge1Desc}
          setTrustBadge1Desc={setTrustBadge1Desc}
          trustBadge1Icon={trustBadge1Icon}
          setTrustBadge1Icon={setTrustBadge1Icon}
          trustBadge1Enabled={trustBadge1Enabled}
          setTrustBadge1Enabled={setTrustBadge1Enabled}
          trustBadge2Title={trustBadge2Title}
          setTrustBadge2Title={setTrustBadge2Title}
          trustBadge2Desc={trustBadge2Desc}
          setTrustBadge2Desc={setTrustBadge2Desc}
          trustBadge2Icon={trustBadge2Icon}
          setTrustBadge2Icon={setTrustBadge2Icon}
          trustBadge2Enabled={trustBadge2Enabled}
          setTrustBadge2Enabled={setTrustBadge2Enabled}
          trustBadge3Title={trustBadge3Title}
          setTrustBadge3Title={setTrustBadge3Title}
          trustBadge3Desc={trustBadge3Desc}
          setTrustBadge3Desc={setTrustBadge3Desc}
          trustBadge3Icon={trustBadge3Icon}
          setTrustBadge3Icon={setTrustBadge3Icon}
          trustBadge3Enabled={trustBadge3Enabled}
          setTrustBadge3Enabled={setTrustBadge3Enabled}
          trustBadge4Title={trustBadge4Title}
          setTrustBadge4Title={setTrustBadge4Title}
          trustBadge4Desc={trustBadge4Desc}
          setTrustBadge4Desc={setTrustBadge4Desc}
          trustBadge4Icon={trustBadge4Icon}
          setTrustBadge4Icon={setTrustBadge4Icon}
          trustBadge4Enabled={trustBadge4Enabled}
          setTrustBadge4Enabled={setTrustBadge4Enabled}
        />
      )}

      {/* ====== TAB: WHATSAPP ====== */}
      {activeTab === 'whatsapp' && (
        <WhatsappTab
          whatsappGreeting={whatsappGreeting}
          setWhatsappGreeting={setWhatsappGreeting}
          whatsappFooter={whatsappFooter}
          setWhatsappFooter={setWhatsappFooter}
        />
      )}

      {/* ====== TAB: POLICIES ====== */}
      {activeTab === 'policies' && (
        <PoliciesTab
          faqContent={faqContent}
          setFaqContent={setFaqContent}
          returnPolicyContent={returnPolicyContent}
          setReturnPolicyContent={setReturnPolicyContent}
          privacyPolicyContent={privacyPolicyContent}
          setPrivacyPolicyContent={setPrivacyPolicyContent}
          showFaqInNav={showFaqInNav}
          setShowFaqInNav={setShowFaqInNav}
          showReturnsInNav={showReturnsInNav}
          setShowReturnsInNav={setShowReturnsInNav}
          showPrivacyInNav={showPrivacyInNav}
          setShowPrivacyInNav={setShowPrivacyInNav}
          showFaqInFooter={showFaqInFooter}
          setShowFaqInFooter={setShowFaqInFooter}
          showReturnsInFooter={showReturnsInFooter}
          setShowReturnsInFooter={setShowReturnsInFooter}
          showPrivacyInFooter={showPrivacyInFooter}
          setShowPrivacyInFooter={setShowPrivacyInFooter}
        />
      )}

      {/* ====== TAB: FOOTER ====== */}
      {activeTab === 'footer' && (
        <FooterTab
          footerCol1Title={footerCol1Title}
          setFooterCol1Title={setFooterCol1Title}
          footerText={footerText}
          setFooterText={setFooterText}
          footerCol2Title={footerCol2Title}
          setFooterCol2Title={setFooterCol2Title}
          footerCol2Text={footerCol2Text}
          setFooterCol2Text={setFooterCol2Text}
          footerCol3Title={footerCol3Title}
          setFooterCol3Title={setFooterCol3Title}
          footerCol4Title={footerCol4Title}
          setFooterCol4Title={setFooterCol4Title}
          footerCol4Text={footerCol4Text}
          setFooterCol4Text={setFooterCol4Text}
          footerBottomText={footerBottomText}
          setFooterBottomText={setFooterBottomText}
          storeName={storeName}
          footerShowPayments={footerShowPayments}
          setFooterShowPayments={setFooterShowPayments}
          footerShowMenu={footerShowMenu}
          setFooterShowMenu={setFooterShowMenu}
          footerShowNewsletter={footerShowNewsletter}
          setFooterShowNewsletter={setFooterShowNewsletter}
          footerShowSocial={footerShowSocial}
          setFooterShowSocial={setFooterShowSocial}
          socialFacebook={socialFacebook}
          setSocialFacebook={setSocialFacebook}
          socialInstagram={socialInstagram}
          setSocialInstagram={setSocialInstagram}
          socialYoutube={socialYoutube}
          setSocialYoutube={setSocialYoutube}
          socialWhatsapp={socialWhatsapp}
          setSocialWhatsapp={setSocialWhatsapp}
          socialTiktok={socialTiktok}
          setSocialTiktok={setSocialTiktok}
          socialSnapchat={socialSnapchat}
          setSocialSnapchat={setSocialSnapchat}
          socialTwitter={socialTwitter}
          setSocialTwitter={setSocialTwitter}
          floatingContactsEnabled={floatingContactsEnabled}
          setFloatingContactsEnabled={setFloatingContactsEnabled}
          floatingWhatsappEnabled={floatingWhatsappEnabled}
          setFloatingWhatsappEnabled={setFloatingWhatsappEnabled}
          floatingInstagramEnabled={floatingInstagramEnabled}
          setFloatingInstagramEnabled={setFloatingInstagramEnabled}
          floatingTiktokEnabled={floatingTiktokEnabled}
          setFloatingTiktokEnabled={setFloatingTiktokEnabled}
          floatingSnapchatEnabled={floatingSnapchatEnabled}
          setFloatingSnapchatEnabled={setFloatingSnapchatEnabled}
          floatingTwitterEnabled={floatingTwitterEnabled}
          setFloatingTwitterEnabled={setFloatingTwitterEnabled}
          floatingContactsPosition={floatingContactsPosition}
          setFloatingContactsPosition={setFloatingContactsPosition}
          floatingContactsScale={floatingContactsScale}
          setFloatingContactsScale={setFloatingContactsScale}
          floatingContactsBottomMobile={floatingContactsBottomMobile}
          setFloatingContactsBottomMobile={setFloatingContactsBottomMobile}
          floatingContactsBottomDesktop={floatingContactsBottomDesktop}
          setFloatingContactsBottomDesktop={setFloatingContactsBottomDesktop}
          floatingContactsSideMobile={floatingContactsSideMobile}
          setFloatingContactsSideMobile={setFloatingContactsSideMobile}
          floatingContactsSideDesktop={floatingContactsSideDesktop}
          setFloatingContactsSideDesktop={setFloatingContactsSideDesktop}
          floatingWhatsappPreset={floatingWhatsappPreset}
          setFloatingWhatsappPreset={setFloatingWhatsappPreset}
          floatingWhatsappNumber={floatingWhatsappNumber}
          setFloatingWhatsappNumber={setFloatingWhatsappNumber}
        />
      )}

      {/* ====== TAB: SHIPPING ====== */}
      {activeTab === 'shipping' && (
        <ShippingTab
          shippingMethods={shippingMethods}
          paymentMethods={paymentMethods}
          loadingLists={loadingLists}
          newShipName={newShipName}
          setNewShipName={setNewShipName}
          newShipCost={newShipCost}
          setNewShipCost={setNewShipCost}
          newShipDays={newShipDays}
          setNewShipDays={setNewShipDays}
          editingShipId={editingShipId}
          setEditingShipId={setEditingShipId}
          editShipName={editShipName}
          setEditShipName={setEditShipName}
          editShipCost={editShipCost}
          setEditShipCost={setEditShipCost}
          editShipDays={editShipDays}
          setEditShipDays={setEditShipDays}
          newPayName={newPayName}
          setNewPayName={setNewPayName}
          newPayCode={newPayCode}
          setNewPayCode={setNewPayCode}
          newPayInstructions={newPayInstructions}
          setNewPayInstructions={setNewPayInstructions}
          editingPayId={editingPayId}
          setEditingPayId={setEditingPayId}
          editPayName={editPayName}
          setEditPayName={setEditPayName}
          editPayCode={editPayCode}
          setEditPayCode={setEditPayCode}
          editPayInstructions={editPayInstructions}
          setEditPayInstructions={setEditPayInstructions}
          handleAddShipping={handleAddShipping}
          handleToggleShippingActive={handleToggleShippingActive}
          startEditShipping={startEditShipping}
          handleSaveShippingEdit={handleSaveShippingEdit}
          handleDeleteShipping={handleDeleteShipping}
          handleAddPayment={handleAddPayment}
          handleTogglePaymentActive={handleTogglePaymentActive}
          startEditPayment={startEditPayment}
          handleSavePaymentEdit={handleSavePaymentEdit}
          handleDeletePayment={handleDeletePayment}
          onReorderShipping={handleReorderShipping}
          onReorderPayment={handleReorderPayment}
        />
      )}

      {/* ====== TAB: PREMIUM ====== */}
      {activeTab === 'premium' && (
        <PremiumTab
          initialSettings={initialSettings}
          recentBuyersEnabled={recentBuyersEnabled}
          setRecentBuyersEnabled={setRecentBuyersEnabled}
          cookieConsentEnabled={cookieConsentEnabled}
          setCookieConsentEnabled={setCookieConsentEnabled}
          freeShippingBarEnabled={freeShippingBarEnabled}
          setFreeShippingBarEnabled={setFreeShippingBarEnabled}
          volumeDiscountsEnabled={volumeDiscountsEnabled}
          setVolumeDiscountsEnabled={setVolumeDiscountsEnabled}
          frequentlyBoughtTogetherEnabled={frequentlyBoughtTogetherEnabled}
          setFrequentlyBoughtTogetherEnabled={setFrequentlyBoughtTogetherEnabled}
          stockUrgencyEnabled={stockUrgencyEnabled}
          setStockUrgencyEnabled={setStockUrgencyEnabled}
          flashSaleEnabled={flashSaleEnabled}
          setFlashSaleEnabled={setFlashSaleEnabled}
          flashSaleStartDate={flashSaleStartDate}
          setFlashSaleStartDate={setFlashSaleStartDate}
          flashSaleEndDate={flashSaleEndDate}
          setFlashSaleEndDate={setFlashSaleEndDate}
          globalFlashSaleDiscountType={globalFlashSaleDiscountType}
          setGlobalFlashSaleDiscountType={setGlobalFlashSaleDiscountType}
          globalFlashSaleDiscountValue={globalFlashSaleDiscountValue}
          setGlobalFlashSaleDiscountValue={setGlobalFlashSaleDiscountValue}
          socialFeedsEnabled={socialFeedsEnabled}
          setSocialFeedsEnabled={setSocialFeedsEnabled}
          cartTimerEnabled={cartTimerEnabled}
          setCartTimerEnabled={setCartTimerEnabled}
          sizeGuideEnabled={sizeGuideEnabled}
          setSizeGuideEnabled={setSizeGuideEnabled}
          couponCodesEnabled={couponCodesEnabled}
          setCouponCodesEnabled={setCouponCodesEnabled}
          enableFakeViews={enableFakeViews}
          setEnableFakeViews={setEnableFakeViews}
          minViews={minViews}
          setMinViews={setMinViews}
          maxViews={maxViews}
          setMaxViews={setMaxViews}
          exitIntentEnabled={exitIntentEnabled}
          setExitIntentEnabled={setExitIntentEnabled}
          exitIntentTitle={exitIntentTitle}
          setExitIntentTitle={setExitIntentTitle}
          exitIntentText={exitIntentText}
          setExitIntentText={setExitIntentText}
          exitIntentCoupon={exitIntentCoupon}
          setExitIntentCoupon={setExitIntentCoupon}
          exitIntentImageUrl={exitIntentImageUrl}
          setExitIntentImageUrl={setExitIntentImageUrl}
          exitIntentDelayMobile={exitIntentDelayMobile}
          setExitIntentDelayMobile={setExitIntentDelayMobile}
          cookieConsentText={cookieConsentText}
          setCookieConsentText={setCookieConsentText}
          cookieConsentButtonText={cookieConsentButtonText}
          setCookieConsentButtonText={setCookieConsentButtonText}
          spinWheelEnabled={spinWheelEnabled}
          setSpinWheelEnabled={setSpinWheelEnabled}
          spinWheelSegments={spinWheelSegments}
          setSpinWheelSegments={setSpinWheelSegments}
          cartTimerMinutes={cartTimerMinutes}
          setCartTimerMinutes={setCartTimerMinutes}
          cartTimerMessage={cartTimerMessage}
          setCartTimerMessage={setCartTimerMessage}
          freeShippingThreshold={freeShippingThreshold}
          setFreeShippingThreshold={setFreeShippingThreshold}
          recentlyViewedLimit={recentlyViewedLimit}
          setRecentlyViewedLimit={setRecentlyViewedLimit}
          volumeDiscountThreshold={volumeDiscountThreshold}
          setVolumeDiscountThreshold={setVolumeDiscountThreshold}
          volumeDiscountPercentage={volumeDiscountPercentage}
          setVolumeDiscountPercentage={setVolumeDiscountPercentage}
          recentBuyersSource={recentBuyersSource}
          setRecentBuyersSource={setRecentBuyersSource}
          recentBuyersNames={recentBuyersNames}
          setRecentBuyersNames={setRecentBuyersNames}
          recentBuyersCities={recentBuyersCities}
          setRecentBuyersCities={setRecentBuyersCities}
          recentBuyersProductPool={recentBuyersProductPool}
          setRecentBuyersProductPool={setRecentBuyersProductPool}
          recentBuyersCustomProducts={recentBuyersCustomProducts}
          setRecentBuyersCustomProducts={setRecentBuyersCustomProducts}
          productsList={productsList}
          recentBuyersInitialDelay={recentBuyersInitialDelay}
          setRecentBuyersInitialDelay={setRecentBuyersInitialDelay}
          recentBuyersInterval={recentBuyersInterval}
          setRecentBuyersInterval={setRecentBuyersInterval}
          recentBuyersDisplayDuration={recentBuyersDisplayDuration}
          setRecentBuyersDisplayDuration={setRecentBuyersDisplayDuration}
          recentBuyersShowOnCheckout={recentBuyersShowOnCheckout}
          setRecentBuyersShowOnCheckout={setRecentBuyersShowOnCheckout}
          headerShowNewsletter={headerShowNewsletter}
          setHeaderShowNewsletter={setHeaderShowNewsletter}
          headerNewsletterText={headerNewsletterText}
          setHeaderNewsletterText={setHeaderNewsletterText}
          headerShowTopBar={headerShowTopBar}
          setHeaderShowTopBar={setHeaderShowTopBar}
          headerTopBarPhone={headerTopBarPhone}
          setHeaderTopBarPhone={setHeaderTopBarPhone}
          headerTopBarEmail={headerTopBarEmail}
          setHeaderTopBarEmail={setHeaderTopBarEmail}
          enableTicker={enableTicker}
          setEnableTicker={setEnableTicker}
          tickerText={tickerText}
          setTickerText={setTickerText}
          handleRemoveImage={handleRemoveImage}
        />
      )}

      {/* ====== TAB: COUPONS ====== */}
      {activeTab === 'coupons' && (
        <CouponsTab
          editingCouponId={editingCouponId}
          setEditingCouponId={setEditingCouponId}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          couponDiscountType={couponDiscountType}
          setCouponDiscountType={setCouponDiscountType}
          couponValue={couponValue}
          setCouponValue={setCouponValue}
          couponMinCartAmount={couponMinCartAmount}
          setCouponMinCartAmount={setCouponMinCartAmount}
          couponActive={couponActive}
          setCouponActive={setCouponActive}
          currencySymbol={currencySymbol}
          loadingCoupons={loadingCoupons}
          coupons={coupons}
          handleSaveCoupon={handleSaveCoupon}
          handleEditCoupon={handleEditCoupon}
          handleDeleteCoupon={handleDeleteCoupon}
        />
      )}

      {/* ====== TAB: PIXELS & SEO ====== */}
      {activeTab === 'pixels' && (
        <PixelsTab
          metaPixelId={metaPixelId}
          setMetaPixelId={setMetaPixelId}
          metaSyncEnabled={metaSyncEnabled}
          setMetaSyncEnabled={setMetaSyncEnabled}
          ga4MeasurementId={ga4MeasurementId}
          setGa4MeasurementId={setGa4MeasurementId}
          gtmContainerId={gtmContainerId}
          setGtmContainerId={setGtmContainerId}
          tiktokPixelId={tiktokPixelId}
          setTiktokPixelId={setTiktokPixelId}
          twitterPixelId={twitterPixelId}
          setTwitterPixelId={setTwitterPixelId}
          snapchatPixelId={snapchatPixelId}
          setSnapchatPixelId={setSnapchatPixelId}
          pinterestTagId={pinterestTagId}
          setPinterestTagId={setPinterestTagId}
          twitterHandle={twitterHandle}
          setTwitterHandle={setTwitterHandle}
          metaTitleSuffix={metaTitleSuffix}
          setMetaTitleSuffix={setMetaTitleSuffix}
          metaTitle={metaTitle}
          setMetaTitle={setMetaTitle}
          metaDescription={metaDescription}
          setMetaDescription={setMetaDescription}
        />
      )}

      {/* ====== TAB: AI SETTINGS ====== */}
      {activeTab === 'ai_settings' && (
        <AITab
          aiEnabled={aiEnabled}
          setAiEnabled={setAiEnabled}
          contentProvider={contentProvider}
          setContentProvider={setContentProvider}
          contentModel={contentModel}
          setContentModel={setContentModel}
          contentKeys={contentKeys}
          setContentKeys={setContentKeys}
          visionProvider={visionProvider}
          setVisionProvider={setVisionProvider}
          visionModel={visionModel}
          setVisionModel={setVisionModel}
          visionKeys={visionKeys}
          setVisionKeys={setVisionKeys}
          aiTone={aiTone}
          setAiTone={setAiTone}
          aiLanguage={aiLanguage}
          setAiLanguage={setAiLanguage}
          aiCustomInstructions={aiCustomInstructions}
          setAiCustomInstructions={setAiCustomInstructions}
          autoContentSeo={autoContentSeo}
          setAutoContentSeo={setAutoContentSeo}
          autoMediaAi={autoMediaAi}
          setAutoMediaAi={setAutoMediaAi}
          targetAudiences={targetAudiences}
          setTargetAudiences={setTargetAudiences}
          productTypes={productTypes}
          setProductTypes={setProductTypes}
          categoryDefaultTemplate={categoryDefaultTemplate}
          setCategoryDefaultTemplate={setCategoryDefaultTemplate}
          productDefaultTemplate={productDefaultTemplate}
          setProductDefaultTemplate={setProductDefaultTemplate}
          categoryDescriptionPrompt={categoryDescriptionPrompt}
          setCategoryDescriptionPrompt={setCategoryDescriptionPrompt}
          categoryDescriptionLimit={categoryDescriptionLimit}
          setCategoryDescriptionLimit={setCategoryDescriptionLimit}
          productDescriptionPrompt={productDescriptionPrompt}
          setProductDescriptionPrompt={setProductDescriptionPrompt}
          productDescriptionLimit={productDescriptionLimit}
          setProductDescriptionLimit={setProductDescriptionLimit}
          productShortPrompt={productShortPrompt}
          setProductShortPrompt={setProductShortPrompt}
          productShortLimit={productShortLimit}
          setProductShortLimit={setProductShortLimit}
        />
      )}

      {/* ====== TAB: EMAIL & SMTP ====== */}
      {activeTab === 'email' && (
        <EmailTab
          smtpEmail={smtpEmail}
          setSmtpEmail={setSmtpEmail}
          smtpAppPassword={smtpAppPassword}
          setSmtpAppPassword={setSmtpAppPassword}
          smtpFromName={smtpFromName}
          setSmtpFromName={setSmtpFromName}
          adminNotificationEmail={adminNotificationEmail}
          setAdminNotificationEmail={setAdminNotificationEmail}
          lowStockThreshold={lowStockThreshold}
          setLowStockThreshold={setLowStockThreshold}
          emailNotifications={emailNotifications}
          setEmailNotifications={setEmailNotifications}

          abandonedCartEmailEnabled={abandonedCartEmailEnabled}
          setAbandonedCartEmailEnabled={setAbandonedCartEmailEnabled}
          abandonedCartAdminNotify={abandonedCartAdminNotify}
          setAbandonedCartAdminNotify={setAbandonedCartAdminNotify}
          abandonedCartEmailSubject={abandonedCartEmailSubject}
          setAbandonedCartEmailSubject={setAbandonedCartEmailSubject}
          abandonedCartEmailTemplate={abandonedCartEmailTemplate}
          setAbandonedCartEmailTemplate={setAbandonedCartEmailTemplate}
        />
      )}
      {/* ====== TAB: META SYNC MAPPINGS ====== */}
      {activeTab === 'meta_sync' && metaSyncEnabled && (
        <MetaSyncTab />
      )}
      {/* ====== ALWAYS VISIBLE SAVE BUTTON ====== */}
      {activeTab !== 'meta_sync' && (
        <div className="flex items-center justify-between gap-4 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 shadow-sm sticky bottom-4 z-30">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold hidden sm:block">
            Changes apply to: <span className="text-[#e94560] font-bold capitalize">{activeTab}</span> settings
          </span>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] hover:bg-[#e94560] dark:hover:bg-[#e94560]/90 active:scale-95 text-white px-8 py-3.5 text-sm font-bold shadow-md transition-all cursor-pointer ml-auto"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      )}
    </form>
  );
}
