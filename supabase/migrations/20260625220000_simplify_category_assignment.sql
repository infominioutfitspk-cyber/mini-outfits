-- ============================================================
-- SIMPLIFY CATEGORY ASSIGNMENT
-- 1. Replace RLS policy (products.active removed, all products always readable)
-- 2. Remove is_featured and is_visible from product_categories
-- 3. Remove active column from products
-- 4. Insert/update system "Shop" category for /shop route
-- ============================================================

-- 1. Replace RLS policy that depends on products.active (all products always readable now)
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);

-- 2. Remove child property columns from product_categories
ALTER TABLE public.product_categories DROP COLUMN IF EXISTS is_featured;
ALTER TABLE public.product_categories DROP COLUMN IF EXISTS is_visible;

-- 3. Remove active column from products (all products are always visible)
ALTER TABLE public.products DROP COLUMN IF EXISTS active;

-- 4. Insert/update system "Shop" category (protected, for /shop routing)
INSERT INTO public.categories (id, name, slug, description, sort_order, active)
VALUES (
  '00000000-0000-4000-8000-000000000099',
  'Shop',
  'shop',
  'System category — automatically includes all products. Used for /shop route.',
  -1,
  true
)
ON CONFLICT (id) DO UPDATE SET name = 'Shop', slug = 'shop', sort_order = -1;
