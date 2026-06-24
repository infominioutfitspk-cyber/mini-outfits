export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt?: string;
  sortOrder: number;
  isPrimary: boolean;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  color?: string;
  size?: string;
  material?: string;
  customOption?: string;
  customValue?: string;
  colorHex?: string;          // hex color for solid swatch
  price?: number;
  comparePrice?: number;
  stock: number;
  sku?: string;
  imageUrl?: string;          // image linked to this variant
  showImageSwatch?: boolean;
  active: boolean;
  sortOrder: number;
  inventoryThreshold?: number;
}

export interface ProductModifier {
  id: string;
  productId: string;
  name: string;
  price: number;
  active: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku?: string;
  categoryId?: string;
  category?: Category;
  stock: number;
  hasVariants: boolean;
  isService: boolean;
  isFeatured: boolean;
  active: boolean;
  enableSwatches: boolean;
  showSwatchesOnArchive: boolean;
  customBadgeId?: string;
  badgeEnabled?: boolean;
  customBadge?: Badge;
  tags: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  modifiers: ProductModifier[];
  rating?: number;
  reviewsCount?: number;
  sizeGuideId?: string;
  sizeGuide?: SizeGuide;
  frequentlyBoughtTogetherIds?: string[];
  flashSaleEnabled?: boolean;
  flashSaleStartDate?: string | null;
  flashSaleEndDate?: string;
  flashSaleDiscountType?: 'percentage' | 'fixed';
  flashSaleDiscountValue?: number;
  meta_sync_status?: 'pending' | 'synced' | 'error';
  meta_sync_error?: string | null;
  meta_last_synced_at?: string | null;
  deletedAt?: string | null;
  inventoryThreshold?: number;
  productCategories?: ProductCategoryRelation[];
  variationOrder?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  whatsappNumber: string;
  currency: string;
  currencySymbol: string;
  logoUrl?: string;
  logoWidth: number;
  bannerUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  address?: string;
  showStock: boolean;
  showComparePrice: boolean;
  enableSearch: boolean;
  enableCategoryFilter: boolean;
  whatsappGreeting: string;
  whatsappFooter: string;
  metaTitle?: string;
  metaDescription?: string;
  footerText?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialWhatsapp?: string;
  socialYoutube?: string;
  enableFakeViews: boolean;
  minViews: number;
  maxViews: number;
  enableTrustBadges: boolean;
  deliveryEstimateText: string;
  freeShippingText: string;
  promoCodeText: string;
  enableSafeCheckout: boolean;
  safeCheckoutText: string;
  safeCheckoutMethods: string[];
  enableTicker: boolean;
  tickerText: string;
  enableVariantSwatches: boolean;
  swatchShape: 'circle' | 'square';
  swatchSize: 'sm' | 'md' | 'lg'; // Deprecated but kept
  archiveSwatchSize?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  productSwatchSize?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  archiveSwatchAlign?: 'left' | 'center' | 'right';
  swatchLimit: number;
  defaultVariantIndex: number;
  imageHoverStyle?: 'second_image' | 'zoom' | 'none';
  imageAspectRatio?: string;
  titleLineLimit?: '1' | '2' | 'none';
  productPageLayout?: string[];

  // Header options
  headerSticky?: boolean;
  headerStickyDesktop?: boolean;
  headerStickyMobile?: boolean;
  headerShowTopBar?: boolean;
  headerTopBarPhone?: string;
  headerTopBarEmail?: string;
  headerShowNewsletter?: boolean;
  headerNewsletterText?: string;

  headerTopBarBg?: string;
  headerTopBarTextColor?: string;
  headerBg?: string;
  headerTextColor?: string;
  headerBorderColor?: string;

  headerDesktopLogoAlign?: 'left' | 'center' | 'right';
  headerDesktopSearchAlign?: 'left' | 'right' | 'hidden';
  headerDesktopWishlistAlign?: 'left' | 'right' | 'hidden';
  headerDesktopCartAlign?: 'left' | 'right' | 'hidden';
  headerDesktopThemeAlign?: 'left' | 'right' | 'hidden';

  headerMobileLogoAlign?: 'left' | 'center' | 'right';
  headerMobileMenuAlign?: 'left' | 'right' | 'hidden';
  headerMobileSearchAlign?: 'left' | 'right' | 'hidden';
  headerMobileCartAlign?: 'left' | 'right' | 'hidden';
  headerMobileWishlistAlign?: 'left' | 'right' | 'hidden';

  // Navigation options
  navigationMenu?: NavigationItem[];
  headerDesktopMenuAlign?: 'left' | 'center' | 'right' | 'hidden';

  faqContent?: string;
  returnPolicyContent?: string;
  privacyPolicyContent?: string;
  showFaqInNav?: boolean;
  showReturnsInNav?: boolean;
  showPrivacyInNav?: boolean;
  showFaqInFooter?: boolean;
  showReturnsInFooter?: boolean;
  showPrivacyInFooter?: boolean;

  trustBadge1Title?: string;
  trustBadge1Desc?: string;
  trustBadge1Icon?: string;
  trustBadge1Enabled: boolean;

  trustBadge2Title?: string;
  trustBadge2Desc?: string;
  trustBadge2Icon?: string;
  trustBadge2Enabled: boolean;

  trustBadge3Title?: string;
  trustBadge3Desc?: string;
  trustBadge3Icon?: string;
  trustBadge3Enabled: boolean;

  trustBadge4Title?: string;
  trustBadge4Desc?: string;
  trustBadge4Icon?: string;
  trustBadge4Enabled: boolean;

  socialTiktok?: string;
  socialSnapchat?: string;
  socialTwitter?: string;

  footerCol1Title?: string;
  footerCol2Title?: string;
  footerCol2Text?: string;
  footerCol3Title?: string;
  footerCol4Title?: string;
  footerCol4Text?: string;
  footerBottomText?: string;
  footerShowPayments?: boolean;
  footerShowMenu?: boolean;
  footerShowNewsletter?: boolean;
  footerShowSocial?: boolean;

  floatingContactsEnabled: boolean;
  floatingContactsPosition: 'left' | 'right';
  floatingContactsBottomMobile: number;
  floatingContactsBottomDesktop: number;
  floatingContactsSideMobile: number;
  floatingContactsSideDesktop: number;
  floatingContactsScale: number;
  floatingWhatsappPreset?: string;
  floatingWhatsappNumber?: string;
  floatingWhatsappEnabled: boolean;
  floatingInstagramEnabled: boolean;
  floatingTiktokEnabled: boolean;
  floatingSnapchatEnabled: boolean;
  floatingTwitterEnabled: boolean;

  // Customizer & Premium Theme Settings
  exit_intent_enabled?: boolean;
  exit_intent_title?: string;
  exit_intent_text?: string;
  exit_intent_coupon?: string;
  spin_wheel_enabled?: boolean;
  spin_wheel_segments?: string[];
  cart_timer_minutes?: number;
  free_shipping_threshold?: number;
  volume_discount_threshold?: number;
  volume_discount_percentage?: number;
  recent_buyers?: { name: string; city: string }[] | string; // JSONB can be string or array
  recently_viewed_limit?: number;
  recent_buyers_enabled?: boolean;
  cookie_consent_enabled?: boolean;
  free_shipping_bar_enabled?: boolean;
  volume_discounts_enabled?: boolean;
  frequently_bought_together_enabled?: boolean;
  stock_urgency_enabled?: boolean;
  flash_sale_enabled?: boolean;
  flash_sale_start_date?: string;
  flash_sale_end_date?: string;
  globalFlashSaleDiscountType?: 'percentage' | 'fixed';
  globalFlashSaleDiscountValue?: number;
  social_feeds_enabled?: boolean;
  cart_timer_enabled?: boolean;
  size_guide_enabled?: boolean;

  // Product Card Customizations
  card_style?: 'style1' | 'showcase_1' | 'showcase_2' | 'showcase_3' | 'showcase_4' | 'showcase_5' | 'showcase_6' | 'showcase_7' | 'showcase_8' | 'showcase_9' | 'showcase_10';
  card_variant?: 'v1';
  card_show_stars?: boolean;
  card_show_quickview?: boolean;
  card_show_wishlist?: boolean;
  card_show_quickcart?: boolean;
  card_show_description?: boolean;
  card_show_swatches?: boolean;
  card_show_sizes?: boolean;
  card_show_materials?: boolean;
  card_show_custom?: boolean;
  card_show_custom_2?: boolean;
  card_show_type_color?: boolean;
  card_show_type_size?: boolean;
  card_show_type_material?: boolean;
  card_show_type_custom?: boolean;
  card_alignment?: 'left' | 'center' | 'right';
  card_elements_order?: string[];
  card_mobile_columns?: number;

  recent_buyers_names?: string;
  recent_buyers_cities?: string;
  recent_buyers_source?: 'simulated' | 'real';
  recent_buyers_product_pool?: 'any' | 'featured' | 'sale' | 'recent' | 'custom';
  recent_buyers_custom_products?: string[] | string;
  recent_buyers_initial_delay?: number;
  recent_buyers_interval?: number;
  recent_buyers_display_duration?: number;
  recent_buyers_show_on_checkout?: boolean;
  exit_intent_image_url?: string;
  exit_intent_delay_mobile?: number;
  cookie_consent_text?: string;
  cookie_consent_button_text?: string;

  social_feeds_homepage_enabled?: boolean;
  social_feeds_product_enabled?: boolean;
  social_feeds_title?: string;
  social_feeds_subtitle?: string;
  social_feeds_desc?: string;
  social_feeds_items?: any;
  cart_timer_message?: string;
  coupon_codes_enabled?: boolean;
  theme_preset?: string;
  theme_config?: ThemeConfig;

  // Pixels & Tracking
  meta_pixel_id?: string;
  meta_sync_enabled?: boolean;
  ga4_measurement_id?: string;
  gtm_container_id?: string;
  tiktok_pixel_id?: string;
  twitter_pixel_id?: string;
  snapchat_pixel_id?: string;
  pinterest_tag_id?: string;

  // Social & SEO
  twitter_handle?: string;
  meta_title_suffix?: string;

  // AI settings
  ai_enabled?: boolean;
  content_provider?: string;
  content_model?: string;
  content_keys?: string;
  vision_provider?: string;
  vision_model?: string;
  vision_keys?: string;
  ai_tone?: string;
  ai_language?: string;
  ai_custom_instructions?: string;
  auto_content_seo?: boolean;
  auto_media_ai?: boolean;
  target_audiences?: string;
  product_types?: string;
  category_default_template?: string;
  product_default_template?: string;
  category_description_prompt?: string;
  category_description_limit?: number;
  product_description_prompt?: string;
  product_description_limit?: number;
  product_short_prompt?: string;
  product_short_limit?: number;

  // SMTP/Email Fallback Columns
  storeUrl?: string;
  smtp_email?: string;
  smtp_app_password?: string;
  smtp_from_name?: string;
  admin_notification_email?: string;
  email_notifications?: any;
  low_stock_threshold?: number;

  // Abandoned Cart Email Settings
  abandonedCartEmailEnabled?: boolean;
  abandonedCartAdminNotify?: boolean;
  abandonedCartEmailSubject?: string;
  abandonedCartEmailTemplate?: string;

  popularSearches?: string;
  updatedAt: string;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    textHeading?: string;
    textAccent?: string;
    price?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  typography: {
    fontSizeBase: number;
  };
  buttons: {
    borderRadius: number;
    primaryBg: string;
    primaryText: string;
    primaryHover: string;
  };
  cards: {
    borderRadius: number;
  };
}

export interface RecentBuyer {
  name: string;
  city: string;
}

export interface SizeGuide {
  id: string;
  name: string;
  chart_data: Array<Record<string, string>>;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface HomepageSection {
  id: string;
  section_type: 'hero_banner' | 'product_grid' | 'category_list' | 'promo_banner' | 'trust_badges' | 'recent_reviews' | 'brands_logos' | 'category_grid' | 'social_feed' | 'ticker' | 'flash_sale';
  title?: string;
  settings: Record<string, any>;
  content_data: Record<string, any>;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppSubscriber {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  source_type?: string;
  created_at?: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  source: string;
  subscribed: boolean;
  created_at?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  children?: NavigationItem[];
}

export interface CartItem {
  id: string;                          // unique cart item id
  product: Product;
  selectedVariant?: ProductVariant;
  selectedModifiers: ProductModifier[];
  quantity: number;
  unitPrice: number;                   // final price (variant price or product price)
  total: number;                       // unitPrice * quantity + modifiers
}

export interface StatusLogItem {
  id: string;
  type: 'creation' | 'status_change' | 'staff_note';
  message: string;
  status?: string;
  notes?: string;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  emailType: string;
  category: 'customer' | 'admin';
  label: string;
  description?: string;
  enabled: boolean;
  subject: string;
  customHtml?: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  status: 'pending' | 'placed' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
  notes?: string;
  staffNotes?: string;
  statusLogs?: StatusLogItem[];
  reviewEmailPending?: boolean;
  deliveredAt?: string;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  cancelReason?: string;
  refundAmount?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  rating: number;
  comment?: string;
  approved: boolean;
  hidden?: boolean;
  isManual?: boolean;
  screenshotUrl?: string;
  deletedAt?: string | null;
  createdAt: string;
}

export interface SocialProof {
  id: string;
  imageUrl: string;
  caption?: string;
  sourceType: 'whatsapp' | 'instagram' | 'facebook' | 'manual';
  active: boolean;
  sortOrder: number;
  createdAt: string;
  deletedAt?: string | null;
  productIds?: string[];
  linkedProducts?: { id: string; name: string; slug?: string; image?: string }[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  estimatedDays?: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  active: boolean;
  instructions?: string;
  sortOrder: number;
  createdAt: string;
}

export interface VariantPresetValue {
  label: string;
  hex?: string;
  imageUrl?: string;
}

export interface VariantPreset {
  id: string;
  name: string;
  attribute: 'color' | 'size' | 'material' | 'custom';
  values: VariantPresetValue[];
  createdAt: string;
  deletedAt?: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minCartAmount?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetaCategoryMapping {
  id: string;
  storeCategoryId: string;
  metaCategory: string;
  createdAt?: string;
  category?: Category;
}

export interface ExportedImage {
  sortOrder: number;
  isPrimary: boolean;
  alt?: string;
  title?: string;
  description?: string;
  caption?: string;
  dataUrl: string;
  mimeType: string;
  originalUrl: string;
  fileName?: string;
  fileSize?: number;
}

export interface ExportedVariant {
  color?: string;
  size?: string;
  material?: string;
  customOption?: string;
  customValue?: string;
  colorHex?: string;
  price?: number;
  comparePrice?: number;
  stock: number;
  sku?: string;
  imageUrl?: string;
  imageDataUrl?: string;
  imageMimeType?: string;
  showImageSwatch?: boolean;
  active: boolean;
  sortOrder: number;
}

export interface ExportedModifier {
  name: string;
  price: number;
  active: boolean;
  sortOrder: number;
}

export interface ExportedProduct {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku?: string;
  stock: number;
  hasVariants: boolean;
  isService: boolean;
  isFeatured: boolean;
  active: boolean;
  enableSwatches: boolean;
  showSwatchesOnArchive: boolean;
  tags: string[];
  categoryName?: string;
  categorySlug?: string;
  images: ExportedImage[];
  variants: ExportedVariant[];
  modifiers: ExportedModifier[];
}

export interface ExportBundle {
  version: '1.0';
  exportedAt: string;
  storeName: string;
  products: ExportedProduct[];
}

export interface ImportResult {
  success: boolean;
  productName: string;
  status: 'skipped' | 'overwritten' | 'imported' | 'error';
  error?: string;
}

export interface ProductCategoryRelation {
  productId: string;
  categoryId: string;
  isFeatured: boolean;
  isVisible: boolean;
  category?: Category;
}
