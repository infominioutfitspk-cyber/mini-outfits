<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:domain-rules -->
# Multi-Domain System Rule

This app runs across ANY domain (localhost, custom domain, production). Never hardcode a domain or brand name.

**Always use:**
- Server-side: `getSiteUrl(settings)` from `@/lib/site-url-server` — uses `settings.storeUrl` first, then detects `host` header
- Client-side: `getClientSiteUrl(settings)` from `@/lib/site-url` — uses `settings.storeUrl` first, then `window.location.origin`
- URL cleanup: `cleanLocalhostUrls(text, siteUrl)` from `@/lib/site-url` — replaces localhost URLs with dynamic site URL
- Brand name: `settings.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Zaynahs E-Store'`
- Logo: `settings.logoUrl` — always from general settings, never fallback to Vercel/Next.js default favicon
- Favicon: `settings.faviconUrl` — always from general settings, served via `/favicon.ico` route that reads from DB
- OG image: `settings.logoUrl` or `settings.bannerUrl` — never use Vercel/Next.js default og-image
- Google index / SEO: all meta tags, JSON-LD schema, canonical URLs, sitemap, robots.txt must use `getSiteUrl()` value
- All image URLs in meta tags must use `cleanLocalhostUrls()` to ensure absolute paths

**CRITICAL — Never use `getSiteUrl()` inside `generateMetadata`:**
- `getSiteUrl()` imports `headers()` from `next/headers` which forces `cache-control: private, no-store`
- Kills ISR (`revalidate`), kills Cloudflare CDN cache
- Always use direct: `settings?.storeUrl?.replace(/\/+$/, '') || process.env.NEXT_PUBLIC_SITE_URL || ''`
- Exception: inside page component (not generateMetadata) — allowed

**Never use:**
- Hardcoded `totvogue.pk`, `zaynahs.pk`, `TotVogue.pk` — all must come from DB settings or request headers
- `process.env.NEXT_PUBLIC_SITE_URL` as final fallback — use `getSiteUrl()` helper inside page components
- `.replace(/http:\/\/localhost:3000/g, '...')` — use `cleanLocalhostUrls()` instead
- Vercel/Next.js default favicon, logo, or og-image — always read from DB settings
- Hardcoded favicon.ico in `/public/` — the app serves favicon dynamically from `settings.faviconUrl`
<!-- END:domain-rules -->

<!-- BEGIN:ssr-rules -->
# SSR / Caching Rules

1. **Never block SSR with non-critical data.** Social proofs, banners, recommendations — anything non-critical must be:
   - Fetched client-side (inside `'use client'` component via `useEffect` + dynamic import)
   - OR wrapped in `Promise.race` with timeout (max 2s), caught with `.catch(() => [])`
   - Pass `[]` as default, let client-side fetch populate

2. **ISR pattern:** `export const revalidate = 86400` on all storefront pages.
   - Webhooks purge cache on admin save (`revalidateTag`, `revalidatePath`, Cloudflare purge)

3. **Server/Client split for site-url:**
   - `lib/site-url-server.ts` = server-only (uses `next/headers`) — DO NOT import in client components
   - `lib/site-url.ts` = client-safe — uses `window.location.origin`, no `next/headers`

4. **Cloudflare cache override:**
   - Always set `cdn-cache-control: public, s-maxage=86400, stale-while-revalidate=60`
   - This makes Cloudflare cache even pages with `cache-control: private`
<!-- END:ssr-rules -->

<!-- BEGIN:db-rules -->
# Database Rules

1. **Always use Supabase Client API (supabase-js) — NEVER Prisma, direct pg connections, or raw SQL in app code.**
   - All DB operations must go through `supabaseAdmin` (service role, server-side) or the anon client (client-side)
   - Use `@/lib/supabase/admin` for server-side queries
   - Use `@/lib/supabase/client` for client-side queries
   - No Prisma ORM, no `pg`, no `node-postgres`, no direct `psql` from app code
   - Schema changes only via migration files + master schema (not from app runtime)

2. **Always use `supabaseAdmin` (service role key) for admin/storefront queries.**
   - Bypasses RLS — avoids nested join RLS failures
   - Use `@/lib/supabase/admin` import

3. **Settings table name:** `store_settings` (not `settings`)
   - Key columns: `store_url`, `store_name`, `currency_symbol`, `logo_url`, `favicon_url`, `banner_url`

4. **Avoid nested joins that fail on RLS.**
   - Batch fetch product images separately instead of joining in main query
   - Pattern: fetch main data → collect IDs → batch fetch related data → merge in memory

5. **Reviews table:** `reviews`
   - `getGlobalReviews()` returns `{ reviews: [], total: 0 }` on error (graceful degradation)
   - `getTopReviews(3)` for homepage, `getGlobalReviews()` for /reviews page

6. **Cache tags for revalidation:**
   - `products` — all product changes
   - `categories` — category changes
   - `reviews` — review CRUD
   - `social_proof` — social proof CRUD
   - `settings` — settings update
   - Use `unstable_cache` with these tags for DB-backed caching

7. **Every new migration MUST be merged into `supabase/schema/SUPER_MASTER_SCHEMA.sql` immediately.**  
   The master schema is the single source of truth. Never create a migration file without also updating the master schema.
<!-- END:db-rules -->

<!-- BEGIN:social-proof-guidelines -->
# Social Proof Guidelines

1. **Social proof tab excludes all PII** (Name, Phone, Email) — show privacy notice instead
2. Supports **many-to-many product association** via checkboxes (not single dropdown)
3. If tagged product is deleted → show "Not Available" / "Deleted" badge, no broken link
4. Storefront social proofs are fetched **client-side** (not SSR) to avoid blocking page render
5. **Review count must ALWAYS merge store reviews + proof wall items.**  
   Wherever a review count or rating summary is displayed (grid, header, product page, homepage, /reviews), use:
   ```
   totalCount = storeReviews.length + socialProofCount
   avgRating  = (sum(storeReviews.rating) + socialProofCount * 5) / totalCount
   ```
   Each proof wall entry counts as a **5-star rating**. Append `"(Includes Verified + Proof Wall)"` annotation when `socialProofCount > 0`.
   - Fetch `socialProofCount` server-side via `supabaseAdmin.from('social_proof_products').select('product_id', { count: 'exact', head: true }).eq('product_id', product.id)` for product pages, or `supabaseAdmin.from('social_proof').select('id', { count: 'exact', head: true }).eq('active', true).is('deleted_at', null)` for the homepage.
   - On the `/reviews` page, use `socialProofs.length` (already in client).
<!-- END:social-proof-guidelines -->

<!-- BEGIN:supabase-skill -->
# Supabase Skill — Full Reference

## Core Principles

**1. Supabase changes frequently — verify against changelog and current docs before implementing.**
Do not rely on training data for Supabase features. Function signatures, config.toml settings, and API conventions change between versions.

First, fetch `https://supabase.com/changelog.md` (a lightweight summary index), scan for `breaking-change` tags relevant to your task, and follow the linked page for any that apply. Then look up the relevant topic using the documentation access methods below.

**2. Verify your work.**
After implementing any fix, run a test query to confirm the change works. A fix without verification is incomplete.

**3. Recover from errors, don't loop.**
If an approach fails after 2-3 attempts, stop and reconsider. Try a different method, check documentation, inspect the error more carefully, and review relevant logs when available.

**4. Exposing tables to the Data API:** Depending on the user's Data API settings, newly created tables may not be automatically exposed via the Data (REST) API. `anon` and `authenticated` roles will need to be explicitly granted access. This is separate from RLS, which controls which rows are visible once a table is accessible.

**5. RLS in exposed schemas.**
Enable RLS on every table in any exposed schema (includes `public` by default).

**6. Security checklist — Supabase-specific traps:**
- Never use `user_metadata` claims in JWT-based authorization. Use `app_metadata` instead.
- Deleting a user does not invalidate existing access tokens.
- Never expose the `service_role` or secret key in public clients.
- Views bypass RLS by default — use `security_invoker = true`.
- UPDATE requires a SELECT policy — without it, updates silently return 0 rows.
- `auth.role()` is deprecated — use `TO authenticated` / `TO anon` syntax.
- `TO authenticated` alone is authentication without authorization — always add a row-level predicate.
- UPDATE policies require both `USING` and `WITH CHECK`.
- `SECURITY DEFINER` functions bypass RLS — prefer `SECURITY INVOKER`.
- Storage upsert requires INSERT + SELECT + UPDATE.
- Always pin package versions and commit lockfiles for Supabase packages.

## Supabase CLI

Always discover commands via `--help` — never guess.

```bash
supabase --help                    # All top-level commands
supabase <group> --help            # Subcommands
supabase <group> <command> --help  # Flags
```

**Known gotchas:**
- `supabase db query` requires CLI v2.79.0+
- `supabase db advisors` requires CLI v2.81.3+
- Always create migration files with `supabase migration new <name>` first

## Making and Committing Schema Changes

Use `supabaseAdmin` SQL queries or migration files — never Prisma or direct pg connections.

**When ready to commit changes to a migration file:**
1. Run advisors → `supabase db advisors` (CLI v2.81.3+) or MCP `get_advisors`
2. Review the Security Checklist above
3. Generate the migration → `supabase db pull <descriptive-name> --local --yes`
4. Verify → `supabase migration list --local`

**Always update `SUPER_MASTER_SCHEMA.sql` after any migration.**
<!-- END:supabase-skill -->

<!-- BEGIN:supabase-postgres-best-practices -->
# Supabase Postgres Best Practices

Comprehensive performance optimization guide for Postgres. Reference when writing SQL queries, designing schemas, implementing indexes, configuring connection pooling, or working with RLS.

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## References
- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
<!-- END:supabase-postgres-best-practices -->

<!-- BEGIN:agent-prime-rules -->
# Agent Prime Rules

1. **Fulfill the Request**: Modify, refactor, or create exactly what is asked without hesitation.
2. **Mobile First ALWAYS**: Every component, page, layout designed mobile-first (375px base). Desktop is secondary.
3. **Direct Action**: Find relevant files and implement fixes directly — no unnecessary questions.
4. **Data Integrity First**: Product, stock, order data is NEVER approximated. If uncertain → throw error.
5. **TypeScript Strict**: Every file is `.tsx` or `.ts`. No `any` types ever.
6. **No Email System**: WhatsApp only. Never suggest or implement email flows.
7. **Fast & Direct Work**: Resolve issues with direct code analysis and implementation.
8. **Dual-Sided Feature Integrity**: Feature added on storefront MUST be implemented on admin panel too, and vice versa.
9. **Customizer & Settings Sync**: All theme/swatch/size/visibility controls must work in both Settings dashboard and Visual Customizer sidebar panels.
10. **Agent Executes**: All terminal commands run autonomously. Never ask user to run commands manually.
11. **Read existing files BEFORE creating new ones.**
12. **Never rewrite a working file unnecessarily.**
13. **Every UI component needs loading + error + empty states.**
14. **Run `npm run build` only when explicitly asked.**
<!-- END:agent-prime-rules -->

<!-- BEGIN:design-rules -->
# Design System Rules

## Aesthetic: "Modern Pakistani E-Commerce — Premium Mobile"
- **Mobile First**: 375px base, scale up
- **Touch Targets**: Minimum 44px for all interactive elements
- **Font**: Geist (headings) + Inter (body) via `next/font`
- **Colors**:
  ```css
  --primary: #1a1a2e  --accent: #e94560  --surface: #ffffff
  --surface-2: #f8f8f8  --text: #1a1a1a  --text-muted: #6b7280
  --border: #e5e7eb  --success: #10b981  --warning: #f59e0b
  ```
- **Border Radius**: `rounded-2xl` for cards, `rounded-xl` for buttons
- **Shadows**: Soft elevation system — never hard box shadows
- **Animations**: Subtle — fade-in on load, scale on tap, slide-up for modals
- **Theme Switching**: `next-themes` with class-based dark mode using `@variant dark (&:where(.dark, .dark *))` in Tailwind v4 `globals.css`
- **Contrast Integrity**: Apply proper dark mode classes directly on elements (`dark:bg-[#16162a]`, `dark:text-white`). No broad global overrides.
- **Color Scale**: Only standard Tailwind weights (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950).

## Centralized Icons
All icons from `@/components/common/Icons` — never import directly from `lucide-react`.

## Component Rules
- Product card: image top, name, price, Add to Cart
- Bottom sticky cart bar on mobile (when cart has items)
- Skeleton loaders on every data fetch
- Toast notifications (sonner) for all actions
- Category links open shop page with filter (`/shop?category=slug`)
- Storefront scroll restoration on back-navigation
- No CPU-heavy `backdrop-blur` on modals — use solid `bg-black/60` overlays with `overscroll-contain`
- All template cards must support dynamic customizer settings (aspect ratio, hover style, element ordering, badge stacking)
<!-- END:design-rules -->

<!-- BEGIN:db-detailed-rules -->
# Database Detailed Rules

## D1 — Variant Stock Is Mandatory
Products with variants MUST track stock per variant in `product_variants.stock`. `products.stock` = sum of all variant stocks (or direct stock if no variants).

## D2 — Image Storage
All images → Supabase Storage bucket `product-images`. Public URL in `product_images.url`. Never store base64 in DB.

## D3 — Settings Singleton
`store_settings` always has exactly ONE row. ID: `00000000-0000-4000-8000-000000000001`. Never create second row.

## D4 — Soft Delete
Never hard delete products. Use `products.active = false`. Admin can restore. Customer catalog never shows `active = false` products.

## D5 — Schema Change Log
Every DB change logged in `docs/SCHEMA_CHANGE_LOG.md` with date, files changed, what changed.

## D6 — Fully Self-Contained Master Schema
Whenever any feature or DB change is made, `SUPER_MASTER_SCHEMA.sql` MUST be immediately updated. The schema must automatically handle all tables, RLS, policies, buckets, realtime, triggers — zero manual setup required. Repo must always be ready to clone and deploy.

## D7 — Supabase API-Only Operations (STRICTLY ENFORCED)
- **BANNED**: Prisma, Prisma Migrate, direct Postgres connection strings, `psql`, Supabase CLI `link/db push`, any SQL client via DB password.
- **ALLOWED**: `supabaseAdmin` client (server-side), anon client (client-side), Supabase Management API (`sbp_` token), Service API (`service_role` key).
- Schema migrations: create `supabase/migrations/` files, apply via Management API `POST /v1/projects/{ref}/database/migrations`. Never `supabase db push` or `psql`.
- RLS & Storage Policies: via Management API `database/query` endpoint.
- Auth users: `POST /auth/v1/admin/users` (Service API).
- Storage buckets: `POST /storage/v1/bucket` (Service API).
<!-- END:db-detailed-rules -->

<!-- BEGIN:whatsapp-rules -->
# WhatsApp Order Flow Rules

## W1 — Message Format
```typescript
export const generateWhatsAppMessage = (cart: CartItem[], settings: StoreSettings): string => {
  const lines = cart.map(item => {
    const variant = item.selectedVariant ? ` (${Object.values(item.selectedVariant).join(', ')})` : '';
    return `• ${item.product.name}${variant} x${item.quantity} = ${formatPrice(item.total)}`;
  });
  const total = cart.reduce((sum, i) => sum + i.total, 0);
  return [`*${settings.storeName} — New Order*`, '', ...lines, '', `*Total: ${formatPrice(total)}*`, '', 'Please confirm my order. Thank you!'].join('\n');
};

export const buildWhatsAppURL = (phone: string, message: string): string => {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
};
```

## W2 — Redirect Target
- Mobile: opens WhatsApp app. Desktop: web.whatsapp.com. Always `wa.me` format. Phone stored WITHOUT + or spaces in DB.
<!-- END:whatsapp-rules -->

<!-- BEGIN:storage-rules -->
# Supabase Storage Rules

## S1 — Image Upload Pattern
Use `supabaseAdmin.storage.from('product-images').upload(fileName, file, { upsert: false })`. Get public URL via `.getPublicUrl(fileName)`. Delete via `.remove([path])`.

## S2 — Image Optimization
Use Next.js `<Image>` with `fill`, `sizes="(max-width: 768px) 50vw, 33vw"`, `className="object-cover"`.

## S3 — Smart Image Compressor
All uploads pass through `lib/utils/imageCompressor.ts` with 3-strategy fallback chain: `createImageBitmap` → `ObjectURL + img + createImageBitmap` → `heic2any` (WASM fallback). Output: `.webp`, max 1200px, target under 50 KB. On total failure → throw user-visible toast error.

## S4 — Admin Image Previews
Admin panel uses plain `<img>` (not `next/image`) to avoid domain restriction errors.

## S5 — next.config.ts Image Domains
`images.remotePatterns` must include Supabase hostname for `next/image` on storefront.

## S6 — Universal Media Selector
All admin image selection uses shared `MediaSelectorModal`. Direct `<input type="file">` forbidden on settings/product editors.
<!-- END:storage-rules -->

<!-- BEGIN:mobile-first-rules -->
# Mobile First Rules

## Breakpoints
```
Default: 375px+ | sm: 640px+ | md: 768px+ | lg: 1024px+ | xl: 1280px+
```

## M1 — Sticky Cart Bar
Always visible on mobile when cart has items: `fixed bottom-0 left-0 right-0 z-50 md:hidden`.

## M2 — Touch Gestures
- Product images: swipeable (embla-carousel)
- Cart sheet: swipe down to close
- Category filter: horizontal scroll, no wrap

## M3 — Touch-First Scrollable Overlays
All overlays/popups/filters must have `overscroll-contain`, `touch-pan-y`, scrolling naturally from top. No nested scroll containers.

## M4 — Breakout for Admin Responsive
Admin forms use responsive grid (`grid-cols-1 md:grid-cols-3`) that stacks on mobile, side-by-side on desktop.
<!-- END:mobile-first-rules -->

<!-- BEGIN:navigation-rules -->
# Navigation & State Restoration Rules

## N1 — Storefront Scroll & Focus Restoration
Product card clicks save scroll via `saveScrollPosition(product.id)` into `sessionStorage`. On return, `useScrollRestoration()` restores `scrollY` via double `requestAnimationFrame` and highlights the card. Every listing/grid page MUST use `useScrollRestoration()`.

## N2 — Admin URL-Based Tab Persistence
Admin tabs use URL query param `?tab=tabId` via `useAdminTab` hook. Parent must wrap in `<Suspense>`. Never use `useState` for key navigation tabs.
<!-- END:navigation-rules -->

<!-- BEGIN:implementation-workflow -->
# Feature Implementation Workflow

Always follow this order:
1. **SQL Migration** → `supabase/migrations/YYMMDDHHMMSS_description.sql`
2. **Update SUPER_MASTER_SCHEMA.sql** → keep in sync
3. **Update types.ts** → TypeScript interfaces
4. **Services** → CRUD in `lib/services/`
5. **Hooks** → React hooks in `lib/hooks/`
6. **UI Component** → Mobile first, follow design rules
7. **Update SCHEMA_CHANGE_LOG.md** → document everything
<!-- END:implementation-workflow -->

<!-- BEGIN:error-handling -->
# Error Handling Pattern

```typescript
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*)')
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
<!-- END:error-handling -->

<!-- BEGIN:caching-rules -->
# Cache & ISR Rules

## C1 — NEVER `headers()` or `cookies()` in Store Pages
Forces `cache-control: private, no-store` → kills ISR entirely. Allowed only in `robots.ts`, `sitemap.ts`, `admin/**`, `api/**`.

## C2 — Expected Cache Headers
| Page | cache-control | x-vercel-cache |
|---|---|---|
| `/*` store pages | `public, s-maxage=86400` | `HIT` (2nd req) |
| `/_next/static/*` | `immutable, 1 year` | `HIT` |
| `/admin/*`, `/api/*` | `no-store` | `MISS` |

## C3 — Cloudflare Cache Rules
- `no-cache-dynamic`: edge_ttl:0 — cart, checkout, account, api, admin
- `static-assets`: edge_ttl:1yr — `/_next/static/*`
- `html-pages`: edge_ttl:24h — all HTML pages
- `supabase-images`: edge_ttl:30d — supabase.co images

## C4 — Cache Purge Flow
Admin DB change → Supabase webhook → `/api/revalidate` → `revalidateTag()` + `revalidatePath()` + `purgeCloudflareEverything()` → next visitor gets fresh data. Use `(revalidateTag as any)('tag')` for Next.js 16 type safety.

## C5 — Caching Strategy
Wrap data fetches in `unstable_cache(fn, keyParts, { revalidate: 3600, tags: [tag] })`. Implement revalidation helper in `lib/revalidate.ts`. Trigger on CRUD in service files. Hook up webhooks in `/api/revalidate/route.ts`.
<!-- END:caching-rules -->

<!-- BEGIN:vercel-build-rules -->
# Vercel Build Rules

## V1 — Build Security
- Never use non-null assertions (`!`) on env vars during top-level module init.
- Always provide fallback strings: `|| 'https://placeholder.supabase.co'` for URL, `|| 'placeholder'` for key.
- Prevents `Error: supabaseUrl is required` at build time.
<!-- END:vercel-build-rules -->

<!-- BEGIN:code-architecture-rules -->
# Code Architecture Rules

## O1 — One File Per Modal/Tab
Every settings tab, modal, sheet, customizer panel in its own dedicated file. No multi-modal/multi-feature files. Files under 500 lines. Modals under `components/admin/settings/` or `components/admin/customizer/sections/`.

## K1 — Page-Level Skeletons
Every route group needs `loading.tsx`. Storefront: `GridSkeleton`. Product detail: `DetailSkeleton`. Admin: stats + table skeletons. Use standard Tailwind grays (`bg-gray-100 dark:bg-gray-800`).

## AI1 — SEO & Copywriting AI Engine
- Vision models for image alt tags, captions, descriptions.
- Text models for copywriting using brand context (`brand_name`, `store_type`, `target_market`, `tone`, `language`).
- AI output populates DB fields directly.
<!-- END:code-architecture-rules -->

<!-- BEGIN:agent-automation -->
# Agent Automation Flow (Clone/Setup)

When user gives (ref ID auto-extracted from URL):
1. Supabase URL + service role key
2. Cloudflare zone ID + API token
3. Vercel API token
4. GitHub PAT
5. Domain name

Agent AUTOMATICALLY:
- **Supabase API**: Execute master schema, create bucket, create 5 webhooks
- **Cloudflare API**: 4 cache rules, 3 page rules, DNS records
- **GitHub + Vercel**: git init/commit/push, vercel deploy, env vars, domain + SSL
- **Verify**: cache headers, webhook test, CF purge, page rules

Full details: `docs/NEW_PROJECT_SETUP_GUIDE.md`
<!-- END:agent-automation -->
