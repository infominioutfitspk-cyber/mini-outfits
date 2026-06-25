-- ============================================================
-- ZAYNAHS E-STORE — SUPER MASTER SCHEMA
-- Version: 2.1.0
-- Updated: 2026-06-25
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  active_sort_preference TEXT DEFAULT 'manual',
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories (LOWER(slug));

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#e94560',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(10,2),          -- original price (for sale display)
  cost NUMERIC(10,2) DEFAULT 0,         -- purchase cost (admin only)
  sku TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  stock INTEGER DEFAULT 0,              -- total stock (sum of variants or direct)
  has_variants BOOLEAN DEFAULT false,   -- true if variants exist
  is_featured BOOLEAN DEFAULT false,
  is_service BOOLEAN DEFAULT false,     -- no stock tracking
  enable_swatches BOOLEAN DEFAULT true,
  show_swatches_on_archive BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  custom_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  badge_enabled BOOLEAN DEFAULT true,
  size_guide_id UUID REFERENCES size_guides(id) ON DELETE SET NULL,
  frequently_bought_together_ids UUID[] DEFAULT '{}'::uuid[],
  flash_sale_enabled BOOLEAN DEFAULT false,
  flash_sale_start_date TIMESTAMPTZ,
  flash_sale_end_date TIMESTAMPTZ,
  flash_sale_discount_type TEXT DEFAULT 'fixed',
  flash_sale_discount_value NUMERIC(10,2) DEFAULT 0,
  meta_sync_status TEXT DEFAULT 'pending',
  meta_sync_error TEXT,
  meta_last_synced_at TIMESTAMPTZ,
  inventory_threshold INTEGER DEFAULT 0,
  variation_order TEXT[] DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Variant attributes (any combination)
  color TEXT,
  size TEXT,
  material TEXT,
  custom_option TEXT,              -- custom label like "flavor", "style" etc
  custom_value TEXT,               -- value for custom option
  color_hex TEXT,                  -- solid color swatch hex
  -- Variant specific data
  price NUMERIC(10,2),             -- override product price if set
  compare_price NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  sku TEXT,
  image_url TEXT,                  -- variant specific image
  show_image_swatch BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  inventory_threshold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants (product_id);

-- ============================================================
-- PRODUCT MODIFIERS (Add-ons)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- e.g. "Gift Wrap", "Custom Print"
  price NUMERIC(10,2) DEFAULT 0,   -- additional charge
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modifiers_product ON product_modifiers (product_id);

-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  approved BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,
  is_manual BOOLEAN DEFAULT false,
  screenshot_url TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews (approved);
CREATE INDEX IF NOT EXISTS idx_reviews_hidden ON reviews (hidden);

-- ============================================================
-- SOCIAL PROOF (Global Reviews Hub)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_proof (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  source_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source_type IN ('whatsapp', 'instagram', 'facebook', 'manual')),
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_proof_active ON social_proof (active);
CREATE INDEX IF NOT EXISTS idx_social_proof_sort ON social_proof (sort_order);

ALTER TABLE social_proof ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active social proof" ON social_proof FOR SELECT USING (active = true AND deleted_at IS NULL);
CREATE POLICY "Admin all social proof" ON social_proof FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SOCIAL PROOF PRODUCTS (Junction Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_proof_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_proof_id UUID NOT NULL REFERENCES social_proof(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(social_proof_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_spp_social_proof ON social_proof_products (social_proof_id);
CREATE INDEX IF NOT EXISTS idx_spp_product ON social_proof_products (product_id);

ALTER TABLE social_proof_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read social_proof_products" ON social_proof_products FOR SELECT USING (true);
CREATE POLICY "Admin all social_proof_products" ON social_proof_products FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- STORE SETTINGS (Singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001',
  store_name TEXT DEFAULT 'Zaynahs E-Store',
  store_url TEXT,
  whatsapp_number TEXT DEFAULT '',         -- format: 923001234567 (no + or spaces)
  currency TEXT DEFAULT 'PKR',
  currency_symbol TEXT DEFAULT 'Rs.',
  logo_url TEXT,
  logo_width INTEGER DEFAULT 120,
  banner_url TEXT,
  favicon_url TEXT,
  tagline TEXT,
  address TEXT,
  -- Feature toggles
  show_stock BOOLEAN DEFAULT false,         -- show "X left in stock" to customers
  show_compare_price BOOLEAN DEFAULT true,  -- show strikethrough original price
  enable_search BOOLEAN DEFAULT true,
  enable_category_filter BOOLEAN DEFAULT true,
  -- WhatsApp message customization
  whatsapp_greeting TEXT DEFAULT 'Hello! I would like to order:',
  whatsapp_footer TEXT DEFAULT 'Please confirm my order. Thank you!',
  meta_title TEXT,
  meta_description TEXT,
  footer_text TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  social_whatsapp TEXT,
  social_youtube TEXT,
  -- Fake views and trust settings
  enable_fake_views BOOLEAN DEFAULT true,
  min_views INTEGER DEFAULT 10,
  max_views INTEGER DEFAULT 50,
  enable_trust_badges BOOLEAN DEFAULT true,
  delivery_estimate_text TEXT DEFAULT 'Estimate delivery times: 3-5 days International.',
  free_shipping_text TEXT DEFAULT 'Free shipping & returns: On all orders over $150.',
  promo_code_text TEXT DEFAULT 'Use code "WELCOME15" for discount 15% on your first order.',
  enable_safe_checkout BOOLEAN DEFAULT true,
  safe_checkout_text TEXT DEFAULT 'Guarantee Safe Checkout:',
  safe_checkout_methods TEXT[] DEFAULT '{"visa", "mastercard", "paypal", "amex", "klarna", "cirrus", "westernunion"}',
  enable_ticker BOOLEAN DEFAULT false,
  ticker_text TEXT DEFAULT 'Free returns within 30 days' || CHR(10) || 'Unlimited delivery for only $175',
  swatch_limit INTEGER DEFAULT 8,
  default_variant_index INTEGER DEFAULT 1,
  image_hover_style TEXT DEFAULT 'second_image',
  image_aspect_ratio TEXT DEFAULT '1:1',
  title_line_limit TEXT DEFAULT '2',
  archive_swatch_size TEXT DEFAULT 'md',
  product_swatch_size TEXT DEFAULT 'md',
  archive_swatch_align TEXT DEFAULT 'left',
  
  -- Header configuration settings
  header_sticky BOOLEAN DEFAULT true,
  header_sticky_desktop BOOLEAN DEFAULT true,
  header_sticky_mobile BOOLEAN DEFAULT true,
  header_show_top_bar BOOLEAN DEFAULT true,
  header_top_bar_phone TEXT DEFAULT '0328-4114551',
  header_top_bar_email TEXT DEFAULT 'Totvoguepk@gmail.com',
  header_show_newsletter BOOLEAN DEFAULT true,
  header_newsletter_text TEXT DEFAULT 'Summer sale discount off 50%. Shop Sale',

  header_top_bar_bg TEXT DEFAULT '#d97706',
  header_top_bar_text_color TEXT DEFAULT '#ffffff',
  header_bg TEXT DEFAULT '#ffffff',
  header_text_color TEXT DEFAULT '#1a1a2e',
  header_border_color TEXT DEFAULT '#e5e7eb',

  header_desktop_logo_align TEXT DEFAULT 'left',
  header_desktop_search_align TEXT DEFAULT 'right',
  header_desktop_wishlist_align TEXT DEFAULT 'right',
  header_desktop_cart_align TEXT DEFAULT 'right',
  header_desktop_theme_align TEXT DEFAULT 'right',

  header_mobile_logo_align TEXT DEFAULT 'center',
  header_mobile_menu_align TEXT DEFAULT 'left',
  header_mobile_search_align TEXT DEFAULT 'right',
  header_mobile_cart_align TEXT DEFAULT 'right',
  header_mobile_wishlist_align TEXT DEFAULT 'hidden',

  faq_content TEXT DEFAULT '<h3>Frequently Asked Questions</h3><p>Add your store FAQs here. You can edit this content in the Admin Settings panel.</p>',
  return_policy_content TEXT DEFAULT '<h3>Return & Exchange Policy</h3><p>Add your store Return & Exchange policy here. You can edit this content in the Admin Settings panel.</p>',
  privacy_policy_content TEXT DEFAULT '<h3>Privacy Policy</h3><p>At Zaynahs E-Store, we are committed to maintaining the trust and confidence of our visitors and customers. Read our privacy policy to understand how we collect, use, and protect your personal data.</p>',
  show_faq_in_nav BOOLEAN DEFAULT true,
  show_returns_in_nav BOOLEAN DEFAULT true,
  show_privacy_in_nav BOOLEAN DEFAULT true,
  show_faq_in_footer BOOLEAN DEFAULT true,
  show_returns_in_footer BOOLEAN DEFAULT true,
  show_privacy_in_footer BOOLEAN DEFAULT true,
  
  trust_badge_1_title TEXT DEFAULT 'Free Delivery',
  trust_badge_1_desc TEXT DEFAULT 'On all orders above Rs. 2,000',
  trust_badge_1_icon TEXT DEFAULT 'Truck',
  trust_badge_1_enabled BOOLEAN DEFAULT true,
  trust_badge_2_title TEXT DEFAULT 'Secure Payments',
  trust_badge_2_desc TEXT DEFAULT '100% protected checkout payments',
  trust_badge_2_icon TEXT DEFAULT 'Shield',
  trust_badge_2_enabled BOOLEAN DEFAULT true,
  trust_badge_3_title TEXT DEFAULT 'Easy Exchange',
  trust_badge_3_desc TEXT DEFAULT 'No questions asked return policy',
  trust_badge_3_icon TEXT DEFAULT 'RefreshCw',
  trust_badge_3_enabled BOOLEAN DEFAULT true,
  trust_badge_4_title TEXT DEFAULT '24/7 Support',
  trust_badge_4_desc TEXT DEFAULT 'Call/WhatsApp anytime for assistance',
  trust_badge_4_icon TEXT DEFAULT 'Phone',
  trust_badge_4_enabled BOOLEAN DEFAULT true,

  social_tiktok TEXT DEFAULT '',
  social_snapchat TEXT DEFAULT '',
  social_twitter TEXT DEFAULT '',

  footer_col_1_title TEXT DEFAULT 'About Our Store',
  footer_col_2_title TEXT DEFAULT 'Customer Support',
  footer_col_2_text TEXT DEFAULT 'Call/WhatsApp: 0328-4114551' || CHR(10) || 'Email: Totvoguepk@gmail.com' || CHR(10) || 'Timings: 10 AM - 10 PM',
  footer_col_3_title TEXT DEFAULT 'Quick Links',
  footer_col_4_title TEXT DEFAULT 'Newsletter',
  footer_col_4_text TEXT DEFAULT 'Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.',
  footer_bottom_text TEXT DEFAULT 'All rights reserved.',
  footer_show_payments BOOLEAN DEFAULT true,
  footer_show_menu BOOLEAN DEFAULT true,
  footer_show_newsletter BOOLEAN DEFAULT true,
  footer_show_social BOOLEAN DEFAULT true,

  -- Floating Contact Buttons config
  floating_contacts_enabled BOOLEAN DEFAULT true,
  floating_contacts_position VARCHAR(20) DEFAULT 'left',
  floating_contacts_bottom_mobile INTEGER DEFAULT 80,
  floating_contacts_bottom_desktop INTEGER DEFAULT 24,
  floating_contacts_side_mobile INTEGER DEFAULT 16,
  floating_contacts_side_desktop INTEGER DEFAULT 24,
  floating_contacts_scale NUMERIC DEFAULT 1.0,
  floating_whatsapp_preset TEXT DEFAULT 'Hello! I am visiting your store and have a question.',
  floating_whatsapp_number TEXT,
  floating_whatsapp_enabled BOOLEAN DEFAULT true,
  floating_instagram_enabled BOOLEAN DEFAULT true,
  floating_tiktok_enabled BOOLEAN DEFAULT false,
  floating_snapchat_enabled BOOLEAN DEFAULT false,
  floating_twitter_enabled BOOLEAN DEFAULT false,

  -- Premium e-commerce settings
  exit_intent_enabled BOOLEAN DEFAULT false,
  exit_intent_title TEXT DEFAULT 'Wait! Get a Special Discount',
  exit_intent_text TEXT DEFAULT 'Submit your WhatsApp number to unlock a secret coupon code.',
  exit_intent_coupon TEXT DEFAULT 'WELCOME10',
  spin_wheel_enabled BOOLEAN DEFAULT false,
  spin_wheel_segments TEXT[] DEFAULT '{"Try Again", "5% Off", "Free Shipping", "10% Off", "Free Delivery", "WELCOME15"}',
  cart_timer_minutes INTEGER DEFAULT 10,
  free_shipping_threshold NUMERIC(10,2) DEFAULT 2000.00,
  volume_discount_threshold INTEGER DEFAULT 3,
  volume_discount_percentage NUMERIC(5,2) DEFAULT 10.00,
  recent_buyers JSONB DEFAULT '[{"name": "Ahmad", "city": "Lahore"}, {"name": "Fatima", "city": "Karachi"}, {"name": "Zainab", "city": "Islamabad"}, {"name": "Hamza", "city": "Rawalpindi"}, {"name": "Ayesha", "city": "Faisalabad"}, {"name": "Bilal", "city": "Multan"}]',
  recently_viewed_limit INTEGER DEFAULT 4,
  recent_buyers_enabled BOOLEAN DEFAULT true,
  cookie_consent_enabled BOOLEAN DEFAULT true,
  free_shipping_bar_enabled BOOLEAN DEFAULT true,
  volume_discounts_enabled BOOLEAN DEFAULT true,
  frequently_bought_together_enabled BOOLEAN DEFAULT true,
  coupon_codes_enabled BOOLEAN DEFAULT true,
  enable_variant_swatches BOOLEAN DEFAULT true,
  swatch_shape TEXT DEFAULT 'circle',
  swatch_size TEXT DEFAULT 'md',
  navigation_menu JSONB DEFAULT '[]'::jsonb,
  header_desktop_menu_align TEXT DEFAULT 'center',
  stock_urgency_enabled BOOLEAN DEFAULT true,
  flash_sale_enabled BOOLEAN DEFAULT true,
  flash_sale_start_date TIMESTAMPTZ,
  flash_sale_end_date TIMESTAMPTZ,
  global_flash_sale_discount_type TEXT DEFAULT 'percentage',
  global_flash_sale_discount_value NUMERIC(10,2) DEFAULT 0,
  social_feeds_enabled BOOLEAN DEFAULT true,
  cart_timer_enabled BOOLEAN DEFAULT true,
  size_guide_enabled BOOLEAN DEFAULT true,

  recent_buyers_names TEXT DEFAULT 'Ahmad, Fatima, Zainab, Hamza, Ayesha, Bilal, Sana, Ali, Usman, Maryam',
  recent_buyers_cities TEXT DEFAULT 'Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Sialkot, Gujranwala',
  recent_buyers_source TEXT DEFAULT 'simulated',
  recent_buyers_product_pool TEXT DEFAULT 'any',
  recent_buyers_custom_products JSONB DEFAULT '[]',
  recent_buyers_initial_delay INTEGER DEFAULT 15,
  recent_buyers_interval INTEGER DEFAULT 35,
  recent_buyers_display_duration INTEGER DEFAULT 6,
  recent_buyers_show_on_checkout BOOLEAN DEFAULT false,
  exit_intent_image_url TEXT DEFAULT '',
  exit_intent_delay_mobile INTEGER DEFAULT 25,
  cookie_consent_text TEXT DEFAULT 'We use cookies to optimize your experience, analyze traffic, and support checkout flows. By continuing, you agree to our privacy policy.',
  cookie_consent_button_text TEXT DEFAULT 'Accept All',
  
  social_feeds_homepage_enabled BOOLEAN DEFAULT true,
  social_feeds_product_enabled BOOLEAN DEFAULT true,
  social_feeds_title TEXT DEFAULT 'Follow Us On Instagram',
  social_feeds_subtitle TEXT DEFAULT '@Zaynahs.pk',
  social_feeds_desc TEXT DEFAULT 'Tag us in your post to get featured on our page',
  social_feeds_items JSONB DEFAULT '[]'::jsonb,
  cart_timer_message TEXT DEFAULT 'Items in your cart are reserved for {timer} minutes.',
  product_page_layout TEXT[] DEFAULT ARRAY['details', 'ticker', 'reviews', 'related', 'recently_viewed', 'social_feed'],
  card_style VARCHAR DEFAULT 'style1',
  card_variant TEXT DEFAULT 'v1',
  card_show_stars BOOLEAN DEFAULT true,
  card_show_quickview BOOLEAN DEFAULT true,
  card_show_wishlist BOOLEAN DEFAULT true,
  card_show_quickcart BOOLEAN DEFAULT true,
  card_show_description BOOLEAN DEFAULT true,
  card_show_swatches BOOLEAN DEFAULT true,
  card_show_sizes BOOLEAN DEFAULT true,
  card_show_materials BOOLEAN DEFAULT true,
  card_show_custom BOOLEAN DEFAULT true,
  card_show_custom_2 BOOLEAN DEFAULT true,
  card_show_type_color BOOLEAN DEFAULT true,
  card_show_type_size BOOLEAN DEFAULT true,
  card_show_type_material BOOLEAN DEFAULT true,
  card_show_type_custom BOOLEAN DEFAULT true,
  card_alignment VARCHAR DEFAULT 'left',
  card_elements_order TEXT[] DEFAULT ARRAY['title', 'rating', 'price', 'swatches'],
  card_mobile_columns INTEGER DEFAULT 2,
  theme_preset TEXT DEFAULT 'classic_white',
  theme_config JSONB DEFAULT '{
    "colors": {
      "primary": "#000000",
      "secondary": "#444444",
      "accent": "#C8A97E",
      "background": "#FFFFFF",
      "surface": "#F9F9F9",
      "textPrimary": "#111111",
      "textSecondary": "#666666",
      "border": "#EEEEEE",
      "textHeading": "#000000",
      "textAccent": "#C8A97E"
    },
    "fonts": {
      "heading": "Playfair Display",
      "body": "Inter"
    },
    "typography": {
      "fontSizeBase": 16
    },
    "buttons": {
      "borderRadius": 0,
      "primaryBg": "#000000",
      "primaryText": "#FFFFFF",
      "primaryHover": "#333333"
    },
    "cards": {
      "borderRadius": 0
    }
  }'::jsonb,

  -- Pixels & Tracking
  meta_pixel_id TEXT DEFAULT '',
  ga4_measurement_id TEXT DEFAULT '',
  gtm_container_id TEXT DEFAULT '',
  tiktok_pixel_id TEXT DEFAULT '',
  twitter_pixel_id TEXT DEFAULT '',
  snapchat_pixel_id TEXT DEFAULT '',
  pinterest_tag_id TEXT DEFAULT '',

  -- Social & SEO
  twitter_handle TEXT DEFAULT '',
  meta_title_suffix TEXT DEFAULT '',

  -- AI Settings
  ai_enabled BOOLEAN DEFAULT false,
  content_provider TEXT DEFAULT 'groq',
  content_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  content_keys TEXT DEFAULT '',
  vision_provider TEXT DEFAULT 'gemini',
  vision_model TEXT DEFAULT 'gemini-2.0-flash',
  vision_keys TEXT DEFAULT '',
  ai_tone TEXT DEFAULT 'Professional',
  ai_language TEXT DEFAULT 'English',
  ai_custom_instructions TEXT DEFAULT '',
  auto_content_seo BOOLEAN DEFAULT true,
  auto_media_ai BOOLEAN DEFAULT true,
  target_audiences TEXT DEFAULT 'Kids',
  product_types TEXT DEFAULT 'Clothes, Shoes',
  category_default_template TEXT DEFAULT '<p>Explore our exclusively curated <strong>{{category_name}}</strong> collection — from casual everyday wear to festive outfits. Soft fabrics, vibrant prints, and comfortable fits designed for active kids aged 1–14 years.</p>',
  product_default_template TEXT DEFAULT '<p>Give your child a style upgrade with this premium {{product_name}}. Featuring soft premium cotton fabric, comfortable fits, and a modern look — perfect for active boys and girls.</p>\n\n<h3>Key Features</h3>\n<ul>\n  <li><strong>Premium Fabric:</strong> Soft, breathable, and gentle on sensitive skin.</li>\n  <li><strong>Durable Details:</strong> Fade-resistant through regular washing.</li>\n  <li><strong>Relaxed Fit:</strong> Easy movement, designed for everyday play.</li>\n  <li><strong>Easy to Style:</strong> Pairs easily with any outfits.</li>\n</ul>\n\n<h3>Available Colors</h3>\n<p>Classic shades and vibrant patterns</p>\n\n<h3>Care Instructions</h3>\n<ul>\n  <li>Machine wash cold, inside out.</li>\n  <li>Do not iron on print.</li>\n  <li>Air dry or tumble dry low.</li>\n</ul>',
  category_description_prompt TEXT DEFAULT 'Write an engaging category overview inspired by: Explore our exclusively curated collection, featuring soft fabrics, vibrant prints, and comfortable fits designed for active kids aged 1-14 years.',
  category_description_limit INTEGER DEFAULT 80,
  product_description_prompt TEXT DEFAULT 'Write a premium, detailed product description inspired by: paragraph explaining the product style, soft fabric, and fit; a "Key Features" bullet list; "Available Colors" list; and "Care Instructions" bullet list.',
  product_description_limit INTEGER DEFAULT 150,
  product_short_prompt TEXT DEFAULT 'Write a catchy, high-conversion single-line product highlight (maximum 1 line) about the article. Include the focus keyword and make it highly optimized for SEO.',
  product_short_limit INTEGER DEFAULT 20,

  -- SMTP/Email Fallback Columns
  smtp_email TEXT DEFAULT '',
  smtp_app_password TEXT DEFAULT '',
  smtp_from_name TEXT DEFAULT '',
  admin_notification_email TEXT DEFAULT '',
  email_notifications JSONB DEFAULT '{
    "welcome": true,
    "password_reset": true,
    "password_changed": true,
    "order_placed": true,
    "order_confirmed": true,
    "order_shipped": true,
    "order_delivered": true,
    "order_cancelled": true,
    "order_refunded": true,
    "review_request": true,
    "admin_new_order": true,
    "admin_low_stock": true,
    "admin_new_customer": true,
    "admin_new_review": true,
    "admin_contact_form": true
  }'::jsonb,
  low_stock_threshold INTEGER DEFAULT 5,
  abandoned_cart_email_enabled BOOLEAN DEFAULT FALSE,
  abandoned_cart_admin_notify BOOLEAN DEFAULT FALSE,
  abandoned_cart_email_subject TEXT DEFAULT 'You left items in your cart!',
  abandoned_cart_email_template TEXT DEFAULT 'Hi {{name}},\n\nYou left some items in your cart. Complete your purchase here:\n{{checkout_url}}',
  popular_searches TEXT DEFAULT 'Co-ord Sets, Sonic, Graphic Tee, T-shirt, Kids',
  meta_sync_enabled BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO store_settings (id) VALUES ('00000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  reset_token TEXT UNIQUE,
  reset_token_expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,        -- e.g. ZE-001
  customer_name TEXT,
  customer_phone TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',        -- snapshot of cart at order time
  subtotal NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',            -- pending, confirmed, shipped, delivered, cancelled
  notes TEXT,
  staff_notes TEXT,
  status_logs JSONB DEFAULT '[]'::jsonb,
  review_email_pending BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  tracking_number TEXT,
  courier_name TEXT,
  tracking_url TEXT,
  cancel_reason TEXT,
  refund_amount NUMERIC(10,2),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto increment order number
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ZE-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_variants_updated_at ON product_variants;
CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_settings_updated_at ON store_settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ (customers can read products)
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (active = true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read product_images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (active = true);
CREATE POLICY "Public read product_modifiers" ON product_modifiers FOR SELECT USING (active = true);
CREATE POLICY "Public read store_settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT USING (approved = true);
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Public insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select orders" ON orders FOR SELECT USING (true);

-- ADMIN FULL ACCESS (authenticated users = admin)
CREATE POLICY "Admin all categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all product_images" ON product_images FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all product_variants" ON product_variants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all product_modifiers" ON product_modifiers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all store_settings" ON store_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all reviews" ON reviews FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all badges" ON badges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all customers" ON customers FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
CREATE POLICY "Admin update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ============================================================
-- SHIPPING METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_days TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shipping_methods" ON shipping_methods FOR SELECT USING (active = true);
CREATE POLICY "Admin all shipping_methods" ON shipping_methods FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  instructions TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read payment_methods" ON payment_methods FOR SELECT USING (active = true);
CREATE POLICY "Admin all payment_methods" ON payment_methods FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SIZE GUIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS size_guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  chart_data JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE size_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read size guides" ON size_guides FOR SELECT USING (true);
CREATE POLICY "Admin all size guides" ON size_guides FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_cart_amount NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read coupons" ON coupons FOR SELECT USING (active = true);
CREATE POLICY "Admin all coupons" ON coupons FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SCHEMA VERSION
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO schema_version (version) VALUES ('2.1.0') ON CONFLICT DO NOTHING;

-- ============================================================
-- DYNAMIC REVIEWS STATS SYNC TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_product_reviews_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  UPDATE products
  SET 
    reviews_count = (
      SELECT COALESCE(COUNT(*), 0)
      FROM reviews
      WHERE product_id = v_product_id AND approved = true AND COALESCE(hidden, false) = false
    ),
    rating = COALESCE(
      (
        SELECT ROUND(AVG(rating)::numeric, 1)
        FROM reviews
        WHERE product_id = v_product_id AND approved = true AND COALESCE(hidden, false) = false
      ),
      5.0
    )
  WHERE id = v_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_product_reviews_stats ON reviews;

CREATE TRIGGER trigger_update_product_reviews_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_reviews_stats();

-- ============================================================
-- HOMEPAGE SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_type TEXT NOT NULL,
  title TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  content_data JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  source_type TEXT DEFAULT 'wheel',
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'customer' | 'admin'
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  subject TEXT NOT NULL,
  custom_html TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default email templates
INSERT INTO email_templates (email_type, category, label, description, subject) VALUES
('welcome', 'customer', 'Welcome Email', 'Sent when customer registers', 'Welcome to {{brand_name}}!'),
('password_reset', 'customer', 'Password Reset', 'Sent on forgot password request', 'Reset your {{brand_name}} password'),
('password_changed', 'customer', 'Password Changed', 'Sent after password change confirmation', 'Your password was changed'),
('order_placed', 'customer', 'Order Placed', 'Sent when order is placed', 'Order Confirmation #{{order_id}}'),
('order_confirmed', 'customer', 'Order Confirmed', 'Sent when admin confirms order', 'Your order #{{order_id}} is confirmed'),
('order_processing', 'customer', 'Order Processing', 'Sent when order is being prepared', 'Your order #{{order_id}} is being prepared'),
('order_shipped', 'customer', 'Order Shipped', 'Sent when order ships', 'Your order #{{order_id}} has shipped!'),
('order_out_for_delivery', 'customer', 'Out For Delivery', 'Sent when courier picks up for delivery', 'Your order #{{order_id}} is out for delivery'),
('order_delivered', 'customer', 'Order Delivered', 'Sent when order is successfully delivered', 'Your order #{{order_id}} has been delivered'),
('order_cancelled', 'customer', 'Order Cancelled', 'Sent when order is cancelled', 'Your order #{{order_id}} was cancelled'),
('order_refunded', 'customer', 'Order Refunded', 'Sent when refund is processed', 'Refund processed for order #{{order_id}}'),
('review_request', 'customer', 'Review Request', 'Sent 3 days after delivery', 'How was your order from {{brand_name}}?'),
('admin_new_order', 'admin', 'New Order Alert', 'Sent to admin on new order', 'New Order #{{order_id}} - {{order_total}}'),
('admin_order_cancelled', 'admin', 'Order Cancelled Alert', 'Sent to admin when order is cancelled', 'Order #{{order_id}} was cancelled'),
('admin_low_stock', 'admin', 'Low Stock Alert', 'Sent when stock level drops below threshold', 'Low Stock: {{product_name}}'),
('admin_new_customer', 'admin', 'New Customer Alert', 'Sent on new customer registration', 'New customer: {{customer_name}}'),
('admin_new_review', 'admin', 'New Review Alert', 'Sent on new product review', 'New review on {{product_name}}'),
('admin_contact_form', 'admin', 'Contact Form Alert', 'Sent on contact form submission', 'Contact Form: {{contact_subject}}')
ON CONFLICT (email_type) DO NOTHING;

-- ============================================================
-- SEO & MEDIA LIBRARY (ZAYNAHS SEO + AI SYSTEM)
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  seo_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT,
  lsi_tags TEXT,
  og_title TEXT,
  og_description TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  image_alt TEXT,
  long_description TEXT,
  faq_schema JSONB DEFAULT '[]'::jsonb,
  pinterest_description TEXT,
  is_optimized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_meta_entity ON seo_meta (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT,
  seo_filename TEXT,
  file_url TEXT NOT NULL,
  alt_text TEXT,
  title TEXT,
  description TEXT,
  caption TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT true,
  bucket TEXT,
  file_size BIGINT,
  mime_type TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_library_url ON media_library (file_url);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read media_library" ON media_library;
CREATE POLICY "Public read media_library" ON media_library FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all media_library" ON media_library;
CREATE POLICY "Admin all media_library" ON media_library FOR ALL USING (auth.role() = 'authenticated');


CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_enabled BOOLEAN DEFAULT false,
  content_provider TEXT DEFAULT 'groq',
  content_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  content_keys TEXT DEFAULT '',
  vision_provider TEXT DEFAULT 'gemini',
  vision_model TEXT DEFAULT 'gemini-2.0-flash',
  vision_keys TEXT DEFAULT '',
  brand_name TEXT DEFAULT '',
  store_type TEXT DEFAULT 'General',
  target_market TEXT DEFAULT 'Pakistan',
  tone TEXT DEFAULT 'Professional',
  language TEXT DEFAULT 'English',
  custom_instructions TEXT DEFAULT '',
  auto_content_seo BOOLEAN DEFAULT true,
  auto_media_ai BOOLEAN DEFAULT true,
  target_audiences TEXT DEFAULT 'Kids',
  product_types TEXT DEFAULT 'Clothes, Shoes',
  category_default_template TEXT DEFAULT '<p>Explore our exclusively curated <strong>{{category_name}}</strong> collection — from casual everyday wear to festive outfits. Soft fabrics, vibrant prints, and comfortable fits designed for active kids aged 1–14 years.</p>',
  product_default_template TEXT DEFAULT '<p>Give your child a style upgrade with this premium {{product_name}}. Featuring soft premium cotton fabric, comfortable fits, and a modern look — perfect for active boys and girls.</p>\n\n<h3>Key Features</h3>\n<ul>\n  <li><strong>Premium Fabric:</strong> Soft, breathable, and gentle on sensitive skin.</li>\n  <li><strong>Durable Details:</strong> Fade-resistant through regular washing.</li>\n  <li><strong>Relaxed Fit:</strong> Easy movement, designed for everyday play.</li>\n  <li><strong>Easy to Style:</strong> Pairs easily with any outfits.</li>\n</ul>\n\n<h3>Available Colors</h3>\n<p>Classic shades and vibrant patterns</p>\n\n<h3>Care Instructions</h3>\n<ul>\n  <li>Machine wash cold, inside out.</li>\n  <li>Do not iron on print.</li>\n  <li>Air dry or tumble dry low.</li>\n</ul>',
  category_description_prompt TEXT DEFAULT 'Write an engaging category overview inspired by: Explore our exclusively curated collection, featuring soft fabrics, vibrant prints, and comfortable fits designed for active kids aged 1-14 years.',
  category_description_limit INTEGER DEFAULT 80,
  product_description_prompt TEXT DEFAULT 'Write a premium, detailed product description inspired by: paragraph explaining the product style, soft fabric, and fit; a "Key Features" bullet list; "Available Colors" list; and "Care Instructions" bullet list.',
  product_description_limit INTEGER DEFAULT 150,
  product_short_prompt TEXT DEFAULT 'Write a catchy, high-conversion single-line product highlight (maximum 1 line) about the article. Include the focus keyword and make it highly optimized for SEO.',
  product_short_limit INTEGER DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default singleton record for AI settings if not exists
INSERT INTO ai_settings (id, ai_enabled, content_provider, content_model, content_keys, vision_provider, vision_model, vision_keys, brand_name, store_type, target_market, tone, language, custom_instructions, auto_content_seo, auto_media_ai, target_audiences, product_types, category_default_template, product_default_template, category_description_prompt, category_description_limit, product_description_prompt, product_description_limit, product_short_prompt, product_short_limit)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  false,
  'groq',
  'llama-3.3-70b-versatile',
  '',
  'gemini',
  'gemini-2.0-flash',
  '',
  'TotVogue.pk',
  'General',
  'Pakistan',
  'Professional',
  'English',
  '',
  true,
  true,
  'Kids',
  'Clothes, Shoes',
  '<p>Explore our exclusively curated <strong>{{category_name}}</strong> collection — from casual everyday wear to festive outfits. Soft fabrics, vibrant prints, and comfortable fits designed for active kids aged 1–14 years.</p>',
  '<p>Give your child a style upgrade with this premium {{product_name}}. Featuring soft premium cotton fabric, comfortable fits, and a modern look — perfect for active boys and girls.</p>\n\n<h3>Key Features</h3>\n<ul>\n  <li><strong>Premium Fabric:</strong> Soft, breathable, and gentle on sensitive skin.</li>\n  <li><strong>Durable Details:</strong> Fade-resistant through regular washing.</li>\n  <li><strong>Relaxed Fit:</strong> Easy movement, designed for everyday play.</li>\n  <li><strong>Easy to Style:</strong> Pairs easily with any outfits.</li>\n</ul>\n\n<h3>Available Colors</h3>\n<p>Classic shades and vibrant patterns</p>\n\n<h3>Care Instructions</h3>\n<ul>\n  <li>Machine wash cold, inside out.</li>\n  <li>Do not iron on print.</li>\n  <li>Air dry or tumble dry low.</li>\n</ul>',
  'Write an engaging category overview inspired by: Explore our exclusively curated collection, featuring soft fabrics, vibrant prints, and comfortable fits designed for active kids aged 1-14 years.',
  80,
  'Write a premium, detailed product description inspired by: paragraph explaining the product style, soft fabric, and fit; a "Key Features" bullet list; "Available Colors" list; and "Care Instructions" bullet list.',
  150,
  'Write a catchy, high-conversion single-line product highlight (maximum 1 line) about the article. Include the focus keyword and make it highly optimized for SEO.',
  20
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read ai_settings" ON ai_settings;
CREATE POLICY "Admin read ai_settings" ON ai_settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin all ai_settings" ON ai_settings;
CREATE POLICY "Admin all ai_settings" ON ai_settings FOR ALL USING (auth.role() = 'authenticated');

-- Sync triggers between store_settings and ai_settings
CREATE OR REPLACE FUNCTION sync_settings_to_ai()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent cascading recursion loops
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  UPDATE ai_settings
  SET 
    ai_enabled = NEW.ai_enabled,
    content_provider = NEW.content_provider,
    content_model = NEW.content_model,
    content_keys = NEW.content_keys,
    vision_provider = NEW.vision_provider,
    vision_model = NEW.vision_model,
    vision_keys = NEW.vision_keys,
    tone = NEW.ai_tone,
    language = NEW.ai_language,
    custom_instructions = NEW.ai_custom_instructions,
    auto_content_seo = NEW.auto_content_seo,
    auto_media_ai = NEW.auto_media_ai,
    target_audiences = NEW.target_audiences,
    product_types = NEW.product_types,
    category_default_template = NEW.category_default_template,
    product_default_template = NEW.product_default_template,
    brand_name = NEW.store_name,
    category_description_prompt = NEW.category_description_prompt,
    category_description_limit = NEW.category_description_limit,
    product_description_prompt = NEW.product_description_prompt,
    product_description_limit = NEW.product_description_limit,
    product_short_prompt = NEW.product_short_prompt,
    product_short_limit = NEW.product_short_limit,
    updated_at = NOW()
  WHERE id = '00000000-0000-4000-8000-000000000002';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_settings_to_ai ON store_settings;
CREATE TRIGGER trigger_sync_settings_to_ai
  AFTER UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_settings_to_ai();

CREATE OR REPLACE FUNCTION sync_ai_to_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent cascading recursion loops
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  UPDATE store_settings
  SET 
    ai_enabled = NEW.ai_enabled,
    content_provider = NEW.content_provider,
    content_model = NEW.content_model,
    content_keys = NEW.content_keys,
    vision_provider = NEW.vision_provider,
    vision_model = NEW.vision_model,
    vision_keys = NEW.vision_keys,
    ai_tone = NEW.tone,
    ai_language = NEW.language,
    ai_custom_instructions = NEW.custom_instructions,
    auto_content_seo = NEW.auto_content_seo,
    auto_media_ai = NEW.auto_media_ai,
    target_audiences = NEW.target_audiences,
    product_types = NEW.product_types,
    category_default_template = NEW.category_default_template,
    product_default_template = NEW.product_default_template,
    store_name = CASE WHEN NEW.brand_name IS NOT NULL AND NEW.brand_name <> '' THEN NEW.brand_name ELSE store_name END,
    category_description_prompt = NEW.category_description_prompt,
    category_description_limit = NEW.category_description_limit,
    product_description_prompt = NEW.product_description_prompt,
    product_description_limit = NEW.product_description_limit,
    product_short_prompt = NEW.product_short_prompt,
    product_short_limit = NEW.product_short_limit,
    updated_at = NOW()
  WHERE id = '00000000-0000-4000-8000-000000000001';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_ai_to_settings ON ai_settings;
CREATE TRIGGER trigger_sync_ai_to_settings
  AFTER UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_ai_to_settings();

-- ============================================================
-- META CATALOG CATEGORY MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_category_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE UNIQUE,
  meta_category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meta_category_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read meta mappings" ON meta_category_mapping;
CREATE POLICY "Public read meta mappings" ON meta_category_mapping
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all meta mappings" ON meta_category_mapping;
CREATE POLICY "Admin all meta mappings" ON meta_category_mapping
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- EMAIL SUBSCRIBERS (Newsletter footer form)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'newsletter',
  subscribed BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers (email);

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert email subscribers" ON email_subscribers;
CREATE POLICY "Public insert email subscribers" ON email_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all email subscribers" ON email_subscribers;
CREATE POLICY "Admin all email subscribers" ON email_subscribers
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- META SYNC LOG (2026-06-14)
-- Stores Meta Catalog sync results — prevents infinite webhook loop
-- by NEVER writing back to products table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('synced', 'error', 'skipped')),
  error       text,
  action      text NOT NULL DEFAULT 'UPDATE' CHECK (action IN ('UPDATE', 'DELETE')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_sync_log_product_id ON public.meta_sync_log(product_id);
CREATE INDEX IF NOT EXISTS idx_meta_sync_log_created_at ON public.meta_sync_log(created_at DESC);

ALTER TABLE public.meta_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read meta_sync_log" ON public.meta_sync_log;
CREATE POLICY "Admin read meta_sync_log"
  ON public.meta_sync_log FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role insert meta_sync_log" ON public.meta_sync_log;
CREATE POLICY "Service role insert meta_sync_log"
  ON public.meta_sync_log FOR INSERT
  WITH CHECK (true);


-- ============================================================
-- VARIANT PRESETS
-- ============================================================
CREATE TABLE IF NOT EXISTS variant_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  attribute TEXT NOT NULL,  -- 'color', 'size', 'material', 'custom'
  values JSONB NOT NULL,    -- [{ "label": "Red", "hex": "#e94560", "imageUrl": null }]
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE variant_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all variant_presets" ON variant_presets;
CREATE POLICY "Admin all variant_presets" ON variant_presets
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read variant_presets" ON variant_presets;
CREATE POLICY "Public read variant_presets" ON variant_presets
  FOR SELECT USING (true);


-- ============================================================
-- ABANDONED CARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,                      -- localStorage/cookie-based session ID
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,                         -- Shipping address line
  customer_city TEXT,                            -- City
  customer_apartment TEXT,                       -- Apartment / Suite / Unit
  customer_postal_code TEXT,                     -- Postal / ZIP code
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'PKR',
  checkout_url TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  order_placed BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  recovered_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON abandoned_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(customer_email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_pending ON abandoned_carts(email_sent, order_placed, last_activity);

-- Enable RLS
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert abandoned carts" ON abandoned_carts;
CREATE POLICY "Public insert abandoned carts" ON abandoned_carts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update abandoned carts" ON abandoned_carts;
CREATE POLICY "Public update abandoned carts" ON abandoned_carts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admin read abandoned carts" ON abandoned_carts;
CREATE POLICY "Admin read abandoned carts" ON abandoned_carts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin delete abandoned carts" ON abandoned_carts;
CREATE POLICY "Admin delete abandoned carts" ON abandoned_carts FOR DELETE USING (auth.role() = 'authenticated');

-- Updated At Trigger for abandoned_carts
DROP TRIGGER IF EXISTS update_abandoned_carts_updated_at ON abandoned_carts;
CREATE TRIGGER update_abandoned_carts_updated_at
  BEFORE UPDATE ON abandoned_carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Database trigger to automatically link a newly placed order to any active abandoned cart with a matching phone number
CREATE OR REPLACE FUNCTION link_order_to_abandoned_cart()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
BEGIN
  -- Extract digits from customer phone to perform clean comparison
  IF NEW.customer_phone IS NOT NULL THEN
    v_phone := regexp_replace(NEW.customer_phone, '\D', '', 'g');
  END IF;

  -- Match any unrecovered abandoned cart for the customer and mark as recovered/ordered
  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    UPDATE abandoned_carts
    SET order_placed = true,
        order_id = NEW.id,
        recovered_at = NOW(),
        updated_at = NOW()
    WHERE order_placed = false
      AND (
        (customer_phone IS NOT NULL AND regexp_replace(customer_phone, '\D', '', 'g') = v_phone)
        OR
        (customer_phone = NEW.customer_phone)
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_link_order_to_abandoned_cart ON orders;
CREATE TRIGGER trigger_link_order_to_abandoned_cart
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION link_order_to_abandoned_cart();

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ============================================================
-- PRODUCT CATEGORIES (MULTI-CATEGORY JUNCTION)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, category_id)
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- SELECT and write policies for product_categories
DROP POLICY IF EXISTS "Allow public read access to product_categories" ON public.product_categories;
CREATE POLICY "Allow public read access to product_categories"
  ON public.product_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated admin full write access to product_categories" ON public.product_categories;
CREATE POLICY "Allow authenticated admin full write access to product_categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.product_categories;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- Index for soft delete Recycle Bin checks
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products (deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories (deleted_at);
CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews (deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders (deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers (deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_library_deleted_at ON media_library (deleted_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_subscribers_deleted_at ON whatsapp_subscribers (deleted_at);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_deleted_at ON email_subscribers (deleted_at);
CREATE INDEX IF NOT EXISTS idx_size_guides_deleted_at ON size_guides (deleted_at);
CREATE INDEX IF NOT EXISTS idx_variant_presets_deleted_at ON variant_presets (deleted_at);

-- Schedule Recycle Bin Daily Cleanup Cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('purge-deleted-products-30-days')
FROM cron.job
WHERE jobname = 'purge-deleted-products-30-days';

SELECT cron.schedule(
  'purge-deleted-products-30-days',
  '0 0 * * *', -- every day at midnight
  $$ DELETE FROM public.products WHERE deleted_at < NOW() - INTERVAL '1 month' $$
);

-- ============================================================
-- DATABASE WEBHOOKS (REVALIDATION TRIGGERS)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS supabase_functions;

-- Create the trigger function in supabase_functions schema to match Dashboard UI expectations
CREATE OR REPLACE FUNCTION supabase_functions.http_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  url text := TG_ARGV[0];
  method text := TG_ARGV[1];
  headers_str text := TG_ARGV[2];
  params_str text := TG_ARGV[3];
  timeout_str text := TG_ARGV[4];
  
  headers jsonb;
  params jsonb;
  payload jsonb;
  timeout_ms integer;
  resolved_store_url text;
BEGIN
  -- Parse headers and params as jsonb
  BEGIN
    headers := headers_str::jsonb;
  EXCEPTION WHEN OTHERS THEN
    headers := '{}'::jsonb;
  END;

  BEGIN
    params := params_str::jsonb;
  EXCEPTION WHEN OTHERS THEN
    params := '{}'::jsonb;
  END;

  timeout_ms := COALESCE(timeout_str::integer, 5000);

  -- Dynamically resolve domain from store_settings
  BEGIN
    SELECT store_url INTO resolved_store_url FROM public.store_settings LIMIT 1;
    IF resolved_store_url IS NOT NULL AND resolved_store_url <> '' THEN
      resolved_store_url := rtrim(resolved_store_url, '/');
      
      -- Ensure it starts with http:// or https://
      IF NOT (resolved_store_url LIKE 'http://%' OR resolved_store_url LIKE 'https://%') THEN
        resolved_store_url := 'https://' || resolved_store_url;
      END IF;

      -- Replace any template default URLs with the user-configured domain name
      IF url LIKE 'https://www.zaynahs.pk%' THEN
        url := replace(url, 'https://www.zaynahs.pk', resolved_store_url);
      ELSIF url LIKE 'https://zaynahs.pk%' THEN
        url := replace(url, 'https://zaynahs.pk', resolved_store_url);
      ELSIF url LIKE 'https://zaynahs.com%' THEN
        url := replace(url, 'https://zaynahs.com', resolved_store_url);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Table or columns might not exist yet during initial migrations setup, fallback silently
  END;

  -- Build payload structure matching Supabase webhook event schema
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', NULL,
      'old_record', to_jsonb(OLD)
    );
  END IF;

  -- Asynchronously enqueue HTTP request via pg_net
  PERFORM net.http_post(
    url := url,
    body := payload,
    headers := headers,
    timeout_milliseconds := timeout_ms
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 1. Trigger for products table
DROP TRIGGER IF EXISTS "revalidate-products" ON public.products;
CREATE TRIGGER "revalidate-products"
  AFTER INSERT OR UPDATE OR DELETE
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://www.zaynahs.pk/api/revalidate',
    'POST',
    '{"Content-Type":"application/json","x-revalidate-secret":"zaynahs_secret_cache_revalidate_2026"}',
    '{}',
    '5000'
  );

-- 2. Trigger for categories table
DROP TRIGGER IF EXISTS "revalidate-categories" ON public.categories;
CREATE TRIGGER "revalidate-categories"
  AFTER INSERT OR UPDATE OR DELETE
  ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://www.zaynahs.pk/api/revalidate',
    'POST',
    '{"Content-Type":"application/json","x-revalidate-secret":"zaynahs_secret_cache_revalidate_2026"}',
    '{}',
    '5000'
  );

-- 3. Trigger for reviews table
DROP TRIGGER IF EXISTS "revalidate-reviews" ON public.reviews;
CREATE TRIGGER "revalidate-reviews"
  AFTER INSERT OR UPDATE OR DELETE
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://www.zaynahs.pk/api/revalidate',
    'POST',
    '{"Content-Type":"application/json","x-revalidate-secret":"zaynahs_secret_cache_revalidate_2026"}',
    '{}',
    '5000'
  );

-- 4. Trigger for homepage_sections table
DROP TRIGGER IF EXISTS "revalidate-homepage" ON public.homepage_sections;
CREATE TRIGGER "revalidate-homepage"
  AFTER INSERT OR UPDATE OR DELETE
  ON public.homepage_sections
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://www.zaynahs.pk/api/revalidate',
    'POST',
    '{"Content-Type":"application/json","x-revalidate-secret":"zaynahs_secret_cache_revalidate_2026"}',
    '{}',
    '5000'
  );

-- 5. Trigger for store_settings table
DROP TRIGGER IF EXISTS "revalidate-settings" ON public.store_settings;
CREATE TRIGGER "revalidate-settings"
  AFTER INSERT OR UPDATE OR DELETE
  ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://www.zaynahs.pk/api/revalidate',
    'POST',
    '{"Content-Type":"application/json","x-revalidate-secret":"zaynahs_secret_cache_revalidate_2026"}',
    '{}',
    '5000'
  );
