# 🏪 Zaynahs E-Store — MASTER GEMINI RULES
> Replace your entire gemini.md file with this. Gemini Agent is fully autonomous — no manual steps.

## 🔗 Quick Links
- [SCHEMA_CHANGE_LOG.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/SCHEMA_CHANGE_LOG.md)
- [STORE_GUIDE.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/STORE_GUIDE.md) (Contains GitHub & Supabase Credentials)
- [CLOUDFLARE_SUPABASE_SETUP.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/CLOUDFLARE_SUPABASE_SETUP.md) (Cache Rules, Webhooks, ISR Guide)
- [STORE_TESTING_GUIDE.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/STORE_TESTING_GUIDE.md) (Cache & Webhook Tests)
- [NEW_PROJECT_SETUP_GUIDE.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/NEW_PROJECT_SETUP_GUIDE.md) (Full clone & deploy guide)

---

# ⛔ RULE #0 — ABSOLUTE PRIME DIRECTIVE

1. **Fulfill the Request**: Modify, refactor, or create exactly what is asked without hesitation.
2. **Mobile First ALWAYS**: Every single component, page, layout must be designed mobile-first. Desktop is secondary.
3. **Direct Action**: Find relevant files and implement fixes directly — no asking unnecessary questions.
4. **DATA INTEGRITY FIRST**: Product, stock, order data is NEVER approximated. If uncertain → throw error.
5. **TypeScript Strict**: Every file is `.tsx` or `.ts`. No `any` types ever.
6. **No Email System**: This store uses WhatsApp only. Never suggest or implement email flows.
7. **Agent Executes**: Gemini agent runs all terminal commands autonomously. Never ask user to run commands manually unless absolutely required.
8. **Fast & Direct Work**: Work directly and quickly. Do not waste tokens on MCP tools, browser interactions, or reading unnecessary files. Resolve issues with direct code analysis and implementation.
9. **Product Card Styles & Templates**: Whenever creating, updating, or modifying product card styles, layout designs, swatches, badges, actions, or visual card themes, the agent MUST strictly follow the step-by-step implementation guide in [add_card_style_prompt.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/prompts/add_card_style_prompt.md).

---

# 🎨 DESIGN SYSTEM RULES (NON-NEGOTIABLE)

## Aesthetic: "Modern Pakistani E-Commerce — Premium Mobile"
- **Mobile First**: 375px base, scale up to tablet/desktop
- **Touch Targets**: Minimum 44px for all interactive elements
- **Font**: Geist (headings) + Inter (body) — loaded via next/font
- **Colors**: 
  ```css
  --primary: #1a1a2e        /* Deep Navy */
  --accent: #e94560         /* Bold Red */
  --surface: #ffffff
  --surface-2: #f8f8f8
  --text: #1a1a1a
  --text-muted: #6b7280
  --border: #e5e7eb
  --success: #10b981
  --warning: #f59e0b
  ```
- **Border Radius**: `rounded-2xl` for cards, `rounded-xl` for buttons
- **Shadows**: Soft elevation system — never hard box shadows
- **Animations**: Subtle — fade-in on load, scale on tap, slide-up for modals
- **Theme Switching (`next-themes`)**: Full class-based switcher using `next-themes` and a standard client-side `<ThemeToggle />` component. Declare class-based dark mode in Tailwind v4 with `@variant dark (&:where(.dark, .dark *))` in `globals.css`.
- **Text & Cart Contrast Integrity**: Always apply proper dark mode classes (e.g., `dark:bg-[#16162a]`, `dark:border-gray-800`, `dark:text-white`, `dark:text-gray-300`) directly on elements. Never use broad global utility overrides (like `.dark .bg-white`) inside `globals.css` to prevent specificity and contrast bugs.
- **Color Scale Standardization**: Never use non-standard Tailwind class numbers (e.g., `gray-250`, `gray-205`, `gray-955`, `gray-755`, `gray-55`, `gray-350`, `gray-550`, `red-550`). Only use standard, documented tailwind color weights (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950).

## Centralized Icons Rule
- **Single Source of Truth**: All icons MUST be imported from the centralized registry file: [Icons.tsx](file:///Users/shoaib/Desktop/Zaynahs%20e-store/components/common/Icons.tsx) (e.g., `import { ShoppingCart, User } from '@/components/common/Icons'`). Never import directly from `lucide-react` or any other icon library in individual pages or components.

## Component Rules
- Every product card: image top, name, price, "Add to Cart" button
- Bottom sticky cart bar on mobile (always visible when cart has items, styled with responsive dark backgrounds)
- Skeleton loaders on every data fetch
- Toast notifications (sonner) for all actions
- No page without loading state
- **Category Links**: All category links MUST open on the shop page with the category filter applied (e.g. `/shop?category=slug`). Never link to a dedicated `/category/[slug]` route unless it redirects to the shop page.
- **Storefront Scroll & Focus Restoration**: Every product card click must save scroll position via `saveScrollPosition(product.id)`, and every listing/grid view page (e.g. Homepage, Shop page, Wishlist) must call `useScrollRestoration()` to restore scroll and focus on back-navigation.
- **Modal & Popup Performance**: To prevent device lag or rendering slowness across all screen sizes (especially high-res desktop displays and mobile viewports), NEVER use CPU-heavy filter blurs (e.g., `backdrop-blur-sm`, `backdrop-blur`) on modal backdrops. Always use high-contrast solid overlays (e.g., `bg-black/60`). Force GPU-accelerated compositing by adding `will-change-transform` to entrance animations and apply `overscroll-contain` for smooth scrolling.
- **RULE DS1 — DYNAMIC THEMING & CONTRAST VISIBILITY (MANDATORY)**:
  - **Always Theme-Bound**: Never hardcode static dark/light backgrounds (e.g., solid charcoal `#111827`, dark navy `#1a1a2e`) in custom elements, panels, or floating controls. They MUST be mapped to dynamic CSS theme classes (e.g., card surface using `bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white`) so they seamlessly adapt to any theme preset (e.g., green, orange, navy) or dark/light mode switches.
  - **Accents & Buttons**: Interactive button assets, highlight badges, and links must inherit theme variables (`bg-primary`, `bg-accent`, `text-primary`, `text-accent`) rather than static color values to stay consistent with the user's active theme.
  - **Resolve Input Double Borders**: When building inline form groups or inputs inside border-bound containers, always apply `style={{ borderWidth: 0 }}` inline on number and text inputs. This suppresses native borders forced by global styles (`globals.css` overrides) and renders clean, single-bordered unified inputs.
  - **Responsive & Mobile Card Layouts**: All bulk editors, detail panels, and settings forms must use a responsive grid (`grid grid-cols-1 md:grid-cols-3` or similar) that aligns items cleanly side-by-side on desktop/tablets and stacks them into high-comfort touchcards on mobile views.
  - **RULE DS2 — DYNAMIC PRODUCT CARD STYLE TEMPLATES & SETTINGS LINKING (MANDATORY)**:
    - Whenever adding, implementing, or modifying any product card design layout or template, the agent MUST ensure it is fully linked to all dynamic customizer settings (such as Image Aspect Ratio (`aspectClass`), Image Hover Style (`imageHoverStyle`), vertical element ordering (`elementsOrder` and `renderShowcaseContent`/`renderElement`), text alignment classes (`alignClass`), star rating visibility (`showStars`), swatches, quick view, wishlist, and cart action overlays).
    - Specifically, the card template MUST support dynamic multi-badge vertical stacking (via the unified `<div className="bdg-container"> {renderCardBadge()} </div>` flexbox) just like the default style1 (`style1`) layout.
    - The agent must strictly follow the step-by-step implementation checklist in [add_card_style_prompt.md](file:///Users/shoaib/Documents/zaynahsestore-tv-main/docs/prompts/add_card_style_prompt.md) and keep all templates completely synchronized.

---

# 🗄️ DATABASE RULES

## Tables (Source of Truth)
```
products          → core product data
product_variants  → color/size/material combinations with price+stock
product_images    → multiple images per product
categories        → product categories
store_settings    → WhatsApp number, store name, logo, currency
orders            → WhatsApp orders tracking (optional)
```

## RULE D1 — VARIANT STOCK IS MANDATORY
Every product with variants MUST track stock per variant in `product_variants.stock`.
`products.stock` = sum of all variant stocks (or direct stock if no variants).

## RULE D2 — IMAGE STORAGE
All images go to Supabase Storage bucket: `product-images`
Public URL stored in `product_images.url`
Never store base64 in DB.

## RULE D3 — SETTINGS SINGLETON
`store_settings` always has exactly ONE row.
ID: `00000000-0000-4000-8000-000000000001`
Never create second row.

## RULE D4 — SOFT DELETE
Never hard delete products. Use `products.active = false`.
Admin can restore. Customer catalog never shows `active = false` products.

## RULE D5 — SCHEMA CHANGE LOG
Every DB change MUST be logged in [SCHEMA_CHANGE_LOG.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/SCHEMA_CHANGE_LOG.md) with date, files changed, what changed.

## RULE D6 — FULLY SELF-CONTAINED MASTER SCHEMA & SETUP GUIDE (STRICTLY ENFORCED)
⚠️ **CRITICAL DIRECTIVE**: Ab koi bhi AI agent/developer jab bhi koi naya feature ya database change banayega, woh **paband** hai ke code update karte hi usi waqt `SUPER_MASTER_SCHEMA.sql` ko bhi update karega. Koi bhi database column, table, index, or constraint master schema mein missing nahi hona chahiye.

Whenever any feature is added, changed, or removed in the application, both:
1. The master schema database file: [SUPER_MASTER_SCHEMA.sql](file:///Users/shoaib/Desktop/Zaynahs%20e-store/supabase/schema/SUPER_MASTER_SCHEMA.sql)
2. The complete step-by-step setup guide: [NEW_PROJECT_SETUP_GUIDE.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/NEW_PROJECT_SETUP_GUIDE.md)
MUST be immediately updated to reflect these changes. The repository must always remain 100% ready to clone and deploy.
Running/pasting the schema into the Supabase SQL Editor must instantly set up the entire database without requiring ANY manual configuration.
Specifically, the schema must automatically handle:
- Creating all tables, constraints, foreign keys, and indexes.
- Enabling Row Level Security (RLS) on all tables and creating all client/admin policies.
- Automatically creating the Supabase Storage bucket (`product-images`) and its public read/write policies.
- Enabling Supabase Realtime publications (`supabase_realtime`) for all required tables (e.g. `orders`, `abandoned_carts`).
- Defining all trigger functions, sequences, and triggers (e.g. dynamic rating synchronizer, order auto-increment, abandoned cart order linking).
Never ask the user to manually set up any tables, policies, buckets, or realtime settings in the Supabase dashboard.

---

# 📁 PROJECT STRUCTURE

```
zaynahs-estore/
├── app/
│   ├── (store)/                    ← Customer facing
│   │   ├── page.tsx                ← Homepage / Catalog
│   │   ├── product/[slug]/page.tsx ← Product Detail
│   │   ├── cart/page.tsx           ← Cart Review
│   │   └── layout.tsx
│   ├── admin/                      ← Admin Panel
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── products/page.tsx
│   │   ├── products/new/page.tsx
│   │   ├── products/[id]/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── revalidate/route.ts     ← ISR revalidation
│   └── layout.tsx                  ← Root layout
├── components/
│   ├── store/                      ← Customer components
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── CartBar.tsx             ← Sticky bottom cart
│   │   ├── CartSheet.tsx           ← Slide-up cart drawer
│   │   ├── CategoryFilter.tsx
│   │   ├── SearchBar.tsx
│   │   ├── VariantSelector.tsx
│   │   └── WhatsAppButton.tsx
│   ├── admin/                      ← Admin components
│   │   ├── ProductForm.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── VariantBuilder.tsx
│   │   ├── CategoryModal.tsx
│   │   └── StatsCard.tsx
│   └── common/
│       ├── Navbar.tsx
│       ├── LoadingSkeleton.tsx
│       ├── EmptyState.tsx
│       └── MobileNav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Browser client
│   │   ├── server.ts               ← Server client
│   │   └── admin.ts                ← Service role client
│   ├── services/
│   │   ├── products.ts             ← All product CRUD
│   │   ├── categories.ts
│   │   ├── storage.ts              ← Image upload/delete
│   │   ├── settings.ts
│   │   └── orders.ts
│   ├── hooks/
│   │   ├── useCart.ts              ← Cart state (zustand)
│   │   ├── useProducts.ts
│   │   └── useSettings.ts
│   ├── utils/
│   │   ├── whatsapp.ts             ← Message generator
│   │   ├── price.ts                ← Format PKR
│   │   └── slug.ts
│   └── types.ts                    ← All TypeScript interfaces
├── store/
│   └── cartStore.ts                ← Zustand cart store
├── supabase/
│   ├── schema/
│   │   └── SUPER_MASTER_SCHEMA.sql ← Single source of truth
│   └── migrations/                 ← Incremental migrations
├── docs/                           ← All documentation
│   ├── SCHEMA_CHANGE_LOG.md        ← DB change history (update on every change)
│   ├── CLOUDFLARE_SUPABASE_SETUP.md ← Cache rules, webhooks, ISR guide
│   ├── STORE_GUIDE.md              ← GitHub & Supabase credentials
│   ├── STORE_TESTING_GUIDE.md      ← Cache & webhook test commands
│   ├── NEW_PROJECT_SETUP_GUIDE.md  ← Clone & deploy steps
│   ├── VERCEL_BUILD_FIXES.md       ← Known build error fixes
│   ├── LESSONS_LEARNED.md          ← Past bugs & fixes
│   └── prompts/                    ← Feature implementation prompts
├── public/
│   └── icons/
├── .env.local
├── gemini.md
└── AGENTS.md
```

---

# 🛒 WHATSAPP ORDER FLOW RULES

## RULE W1 — MESSAGE FORMAT
```typescript
// lib/utils/whatsapp.ts
export const generateWhatsAppMessage = (cart: CartItem[], settings: StoreSettings): string => {
  const lines = cart.map(item => {
    const variant = item.selectedVariant 
      ? ` (${Object.values(item.selectedVariant).join(', ')})` 
      : '';
    const modifiers = item.selectedModifiers?.length 
      ? ` + ${item.selectedModifiers.map(m => m.name).join(', ')}` 
      : '';
    return `• ${item.product.name}${variant}${modifiers} x${item.quantity} = ${formatPrice(item.total)}`;
  });
  
  const total = cart.reduce((sum, item) => sum + item.total, 0);
  
  return [
    `*${settings.storeName} — New Order*`,
    ``,
    ...lines,
    ``,
    `*Total: ${formatPrice(total)}*`,
    ``,
    `Please confirm my order. Thank you! 🙏`
  ].join('\n');
};

export const buildWhatsAppURL = (phone: string, message: string): string => {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
};
```

## RULE W2 — REDIRECT TARGET
- Mobile: opens WhatsApp app directly
- Desktop: opens web.whatsapp.com
- Always use `wa.me` format — never `api.whatsapp.com`
- Phone number stored WITHOUT + or spaces in DB

---

# 🖼️ SUPABASE STORAGE RULES

## RULE S1 — BUCKET SETUP
```sql
-- Run once in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT DO NOTHING;

-- Public read policy
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admin upload policy  
CREATE POLICY "Admin upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Admin delete policy
CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
```

## RULE S2 — IMAGE UPLOAD PATTERN
```typescript
// lib/services/storage.ts
export const uploadProductImage = async (
  file: File,
  productId: string
): Promise<string> => {
  const ext = file.name.split('.').pop();
  const fileName = `${productId}/${Date.now()}.${ext}`;
  
  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, file, { upsert: false });
    
  if (error) throw error;
  
  const { data } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(fileName);
    
  return data.publicUrl;
};

export const deleteProductImage = async (url: string): Promise<void> => {
  // Extract path from URL
  const path = url.split('/product-images/')[1];
  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .remove([path]);
  if (error) throw error;
};
```

## RULE S3 — IMAGE OPTIMIZATION
Always use Next.js `<Image>` component with:
```tsx
<Image
  src={imageUrl}
  alt={product.name}
  fill
  sizes="(max-width: 768px) 50vw, 33vw"
  className="object-cover"
  priority={isAboveFold}
/>
```


## RULE A1 — ADMIN MIDDLEWARE
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const supabase = createServerClient(/* ... */);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
}
```

## RULE A2 — NO CUSTOMER ACCOUNTS
Customers do NOT register or login.
Cart is stored in localStorage via Zustand persist.
Orders go via WhatsApp only.

---

# 📱 MOBILE FIRST RULES

## RULE M1 — BREAKPOINTS
```
Default (mobile): 375px+
sm: 640px+   ← tablet portrait
md: 768px+   ← tablet landscape  
lg: 1024px+  ← desktop
xl: 1280px+  ← wide desktop
```

## RULE M2 — STICKY CART BAR
Always visible on mobile when cart has items:
```tsx
// Fixed bottom bar — above everything
<div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
  <CartBar />
</div>
```

## RULE M3 — TOUCH GESTURES
- Product images: swipeable gallery (use embla-carousel)
- Cart sheet: swipe down to close
- Category filter: horizontal scroll, no wrap

## RULE M4 — TOUCH-FIRST SCROLLABLE OVERLAYS
All overlays, popups, filters, and mobile drawer menus that open on mobile must have touch-first scrolling starting from the top down. These components must use `overscroll-contain`, `touch-pan-y` enabled, and be structured to scroll naturally from the top without nested scroll containers that hijack touch gestures.

---

# 🔄 NAVIGATION & STATE RESTORATION RULES (MANDATORY FOR NEW PAGES)

## RULE N1 — STOREFRONT SCROLL & FOCUS RESTORATION
- **Mechanism**:
  - Whenever a customer clicks a product card on a listing page (Homepage / Shop / Wishlist), we must call `saveScrollPosition(product.id)` which stores the current page path, scroll position `scrollY`, and the product ID into `sessionStorage`.
  - When the customer returns back, `useScrollRestoration()` checks the path. If matched, it restores the scroll position instantly via double requestAnimationFrame (`window.scrollTo({ top, behavior: 'instant' })`) and triggers focus on the active product card.
  - The restored card element gets temporary CSS highlight class `scroll-restore-highlight` which pulses a subtle border shadow/glow to guide the customer's eye.
- **Rule**: Never remove `useScrollRestoration` or the `id={product-card-${product.id}}` bindings from product card templates. **Any new storefront listing page or grid view created in the future must call `useScrollRestoration()` and bind the click save handlers.**

## RULE N2 — ADMIN URL-BASED TAB PERSISTENCE
- **Mechanism**:
  - Any page in the admin console with multiple tabs (such as settings, reviews, leads, customers, trash, media) must persist the active tab ID in the URL as a query parameter (default: `?tab=tabId`).
  - Use the custom hook `useAdminTab` under `lib/hooks/useAdminTab` to read and push URL parameters on tab changes via router replaces with `scroll: false`.
  - For pages containing these search param-bound tabs, the parent layout/page component MUST wrap the client component inside a React `<Suspense>` boundary to prevent de-optimizing static generation build-time errors.
- **Rule**: Avoid keeping transient tab index states in local React state variables (`useState`) when those tabs form key navigation blocks. **All future admin sub-dashboards or settings tabs must utilize this URL-based persistence hook.**

---

# 🔧 FEATURE IMPLEMENTATION WORKFLOW

Always follow this order:

1. **SQL Migration** → create file in `supabase/migrations/`
2. **Update SUPER_MASTER_SCHEMA.sql** → keep in sync
3. **Update types.ts** → TypeScript interfaces
4. **Services** → CRUD in `lib/services/`
5. **Hooks** → React hooks in `lib/hooks/`
6. **UI Component** → Mobile first, follow design rules
7. **Update [SCHEMA_CHANGE_LOG.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/SCHEMA_CHANGE_LOG.md)** → document everything

---

# 🚨 ERROR HANDLING

```typescript
// Standard pattern for all service functions
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*), categories(*)')
      .eq('active', true)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('[products] getProducts failed:', error);
    throw error;
  }
};
```

---

# 🚀 MIGRATION RULES

Every DB change:
1. Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Update `supabase/schema/SUPER_MASTER_SCHEMA.sql`
3. Log in [SCHEMA_CHANGE_LOG.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/SCHEMA_CHANGE_LOG.md)

---

# ⚡ NEXT.JS CACHING RULES

## Caching Strategy
For Zaynahs E-Store, use **Next.js built-in cache + revalidateTag** (ISR) as the primary caching strategy combined with Cloudflare Edge CDN cache purging.

- **Kyun (Rationale):**
  - Zero extra cost or third-party infrastructure.
  - Vercel automated global CDN edge caching.
  - On-demand revalidation: When products/categories/settings are updated in the admin panel, trigger revalidation to instantly refresh the storefront and purge Cloudflare Edge cache.

## Rule for New Pages/Features Caching
Whenever a new database-driven feature or page is added:
1. **Cache Data Fetches**: Wrap data retrieval queries inside `unstable_cache(fn, keyParts, { revalidate: 3600, tags: [tag] })` in the service files under `lib/services/`.
2. **Implement Revalidation Helper**: Add a revalidation helper function inside [revalidate.ts](file:///Users/shoaib/Desktop/Zaynahs%20e-store/lib/revalidate.ts) that:
   * Revalidates the Next.js cache tags.
   * Purges the specific page URLs (and if layout is affected, calls `purgeCloudflareEverything()`) from Cloudflare Edge cache using the zone API.
3. **Trigger on CRUD**: Call the revalidation helper in the corresponding service files (e.g., inside `create`, `update`, `delete` functions).
4. **Hook up Webhooks**: Update the trigger dispatcher inside the `/api/revalidate` webhook route ([route.ts](file:///Users/shoaib/Desktop/Zaynahs%20e-store/app/api/revalidate/route.ts)) to handle changes originating directly from Supabase DB triggers.

## Next.js 16 Type-Safety Standard
In this codebase (Next.js 16), `revalidateTag` type definition expects 2 arguments, but standard runtime execution only needs 1.
* **MANDATORY**: You MUST cast the `revalidateTag` call to `any` to allow compile-time checks to pass without error:
  ```typescript
  (revalidateTag as any)('your-cache-tag');
  ```
  *Never* call `revalidateTag('tag')` directly without the `as any` typecast wrapper, otherwise the TypeScript compilation (`tsc`) will fail with argument count errors (`TS2554`).

## Automated Cache, Webhooks & DNS Setup
- **MANDATORY FOR NEW FORKS**: For configuring database webhooks, Cloudflare cache rules, and google-site-verification DNS TXT records automatically, refer to [CLOUDFLARE_SUPABASE_SETUP.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/CLOUDFLARE_SUPABASE_SETUP.md). The agent MUST run the 1-click terminal commands documented in that file instead of manually creating webhooks, cache rules, or DNS verification records. The Cloudflare deployer script automatically handles creating or updating the `google-site-verification` DNS TXT record matching the `GOOGLE_SITE_VERIFICATION` value in `.env.local`.

## ⚠️ ISR Cache — Critical Rules (MANDATORY)

### RULE C1 — NEVER `headers()` or `cookies()` in Store Pages
Calling `headers()` or `cookies()` in ANY Server Component (especially `generateMetadata`) forces the **entire page** into dynamic rendering → `cache-control: private, no-store` → ISR completely disabled.

```ts
// ❌ FORBIDDEN in app/layout.tsx, app/(store)/**/page.tsx, any store component
import { headers } from 'next/headers';
const h = await headers(); // → kills ISR for ENTIRE app if in root layout

// ✅ USE THIS INSTEAD
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.totvogue.pk';
```

**Allowed only in:** `app/robots.ts`, `app/sitemap.ts`, `app/admin/**`, `app/api/**`

**Verify clean (run before every deploy):**
```bash
grep -rn "headers()\|cookies()" app/ --include="*.tsx" --include="*.ts" | grep -v "robots\|sitemap\|admin\|api"
# Must be EMPTY
```

### RULE C2 — Webhook Test Command
```bash
curl -X POST https://www.totvogue.pk/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: zaynahs_secret_cache_revalidate_2026" \
  -d '{"type":"UPDATE","table":"products","record":{"id":"test","slug":"any-slug","name":"Test"}}'
# Expected: {"revalidated":true,"table":"products","type":"UPDATE"}
```

### RULE C3 — Expected Cache Headers (Healthy State)
| Page | cache-control | x-vercel-cache |
|---|---|---|
| `/*` store pages | `public, s-maxage=86400` | `HIT` (2nd request) |
| `/_next/static/*` | `immutable, 1 year` | `HIT` |
| `/admin/*`, `/api/*` | `no-store` | `MISS` |

For full test suite: [STORE_TESTING_GUIDE.md](file:///Users/shoaib/Desktop/Zaynahs%20e-store/docs/STORE_TESTING_GUIDE.md)

---

# 🤖 AGENT OPERATING RULES

1. Read existing files BEFORE creating new ones
2. Never rewrite a working file unnecessarily
3. Always check `app/` routing before creating pages
4. Run `npm run build` only when explicitly asked
5. Mobile-first is non-negotiable — desktop is enhancement
6. Every UI component needs loading + error + empty states
7. Images always through Supabase Storage — never local
8. WhatsApp is the ONLY order channel — no exceptions
9. **Dual-Sided Feature Integrity**: Whenever any feature is added or updated on either the customer Storefront or the Admin Panel, it MUST be fully implemented on the other side as well (e.g., if a feature is added to the storefront, its management/editor fields must be added to the Admin Panel, and vice versa), ensuring full database integration, service synchronization, and type-safety throughout the application.
10. **Customizer & Settings Linking Sync**: All theme/swatch controls, sizes (e.g., `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`), visibilities, and settings fields MUST be implemented in both the main Settings dashboard and the Visual Customizer sidebar panels. They must remain fully linked and synchronized so that edits in either interface immediately propagate to the database, store settings state, and the live preview/storefront.

---

## RULE S4 — SMART IMAGE COMPRESSOR & BRAND UPLOADS (UPDATED v1.0.7)
- All uploads pass through `lib/utils/imageCompressor.ts` which uses a **3-strategy fallback chain**:
  1. `createImageBitmap(file)` — OS-native HEIC decoding on macOS/iOS (fastest)
  2. `ObjectURL → <img> → createImageBitmap` — uses OS decoder via img tag (works for HEIC on macOS Chrome)
  3. `heic2any → createImageBitmap` — pure WASM fallback for HEIC on Windows/Linux (last resort)
- If all strategies fail → **throw user-visible Error** (shown as toast). NEVER silently upload a broken file.
- Output: `.webp`, max 1200px, target **under 50 KB**. Iterative quality + resolution reduction.
- Admin panel image previews use plain `<img>` tags (not `next/image`) to avoid domain restriction errors.
- `next.config.ts` must have Supabase hostname in `images.remotePatterns` for `next/image` to work on storefront.
- Favicon, Logo, and Banner uploadable/removable in Settings; logo display width is adjustable via range slider.
- Store favicon and document titles bind dynamically via `generateMetadata()` in `app/layout.tsx`.

## RULE S5 — NEXT.CONFIG IMAGE DOMAINS
```typescript
// next.config.ts — REQUIRED for next/image with Supabase
images: {
  remotePatterns: [{
    protocol: 'https',
    hostname: 'ziucrfpebpxijqhwmqre.supabase.co',
    pathname: '/storage/v1/object/public/**',
  }],
  formats: ['image/webp', 'image/avif'],
}
```

## RULE S6 — UNIVERSAL MEDIA SELECTOR
- All admin panel image selection features MUST use the shared `MediaSelectorModal` component instead of direct `<input type="file">`.
- Selection buttons must use the centralized `Image` icon from `@/components/common/Icons` (e.g. `import { Image as ImageIcon } from '@/components/common/Icons'`) and standardized styling to ensure consistency across the application.
- Direct upload inputs are forbidden on settings forms and product editors; new media must be uploaded within the `MediaSelectorModal` context to maintain library consistency.

---

## RULE K1 — INSTANT PAGE-LEVEL SKELETONS & COLOR SCALE
- Every directory/route group must have a corresponding `loading.tsx` to handle async page transitions instantly.
- **Customer Storefront (`app/(store)/loading.tsx`)**: Default loader using `GridSkeleton` from `@/components/common/LoadingSkeleton` to represent grids of product cards.
- **Product Details (`app/(store)/product/[slug]/loading.tsx`)**: Specific loader using `DetailSkeleton` showing product details structure (two-column layout).
- **Admin Dashboard (`app/admin/loading.tsx`)**: Generic loader displaying statistics cards and list tables skeleton layouts.
- **Skeleton Color Standardization**: All skeleton component backgrounds and placeholders must use standard, documented Tailwind color weights (e.g. `bg-gray-100` and `dark:bg-gray-800`). Under no circumstances should non-standard Tailwind colors (e.g. `bg-gray-150`, `bg-gray-155`) be used.
- **Contrast Integrity**: Skeletons must support both light and dark mode colors (e.g. `dark:bg-[#16162a]`, `dark:border-gray-800/80`, `bg-gray-100`, `dark:bg-gray-800`).

---

## RULE O1 — MODULAR CODE ARCHITECTURE & SEPARATE MODAL/TAB FILES
- **One File Per Modal/Tab**: Every settings tab, dashboard form, modal dialog, sliding sheet, or customizer property panel MUST be written in its own separate, dedicated file (e.g. under `components/admin/customizer/sections/` or `components/admin/settings/`).
- **No Multi-Modal/Multi-Feature Files**: It is strictly forbidden to group multiple modals, multiple settings tabs, or multiple distinct features inside a single file. Every modal or tab must live in its own isolated file to keep features easily updateable.
- **File Length Limits**: Individual files should be kept under 500 lines of code where possible. Large monolithic components exceeding 600 lines are strictly forbidden to prevent confusion, improve page load speeds, and facilitate seamless features update.
- **Strict Separation of Concerns**: Master containers should focus solely on page layouts, state orchestrations, and API bindings, delegating UI blocks and input handlers to child components via clean props interfaces.

---

## RULE V1 — VERCEL BUILD SECURITY & CLIENT INITIALIZATION
To prevent Vercel build-time crashes (`Error: supabaseUrl is required` / `Failed to collect page data` errors):
1. **Never use non-null assertions (`!`) on environment variables during top-level module initialization.**
2. **Always provide a fallback string** (e.g., `|| 'https://placeholder.supabase.co'` for URL and `|| 'placeholder'` for Key) for any static client initialized at the module level.
3. This ensures that the Next.js static compilation and linting analyze files successfully even if environment variables are not loaded in the build system.

---

## RULE AI1 — SEO & COPYWRITING AI ENGINE
- **Vision Models for Images**: Use Vision models (`gemini-2.0-flash` or similar) strictly for image SEO optimizations, alt tags, captions, and visual descriptive generation.
- **Text Models for Copywriting**: Use content copywriting models (configured via `ai_settings` content model) to write descriptions, keywords, titles, and schema metadata.
- **Brand Context Bound**: All copywriting requests must utilize the brand's general settings (`brand_name`, `store_type`, `target_market`, `tone`, `language`, `custom_instructions`, `address`, `whatsapp_number`, `tagline`) as system context to generate highly personalized, localized descriptions and structured FAQ schemas, guaranteeing maximized local SEO ranking.
- **Form Integration**: AI copywriting output must populate storefront description fields directly, and update main data tables (`products` and `categories`) upon generation for complete storefront data synchronization.




your-project/
├── app/
│   └── favicon.ico          ← SIRF ye ek file yahan (tab icon)
│
└── public/
    ├── apple-touch-icon.png
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── android-chrome-192x192.png
    ├── android-chrome-512x512.png
    └── site.webmanifest
```

---

### Short rule:
- **`favicon.ico`** → `app/` folder mein
- **Baaki sab** → `public/` folder mein
