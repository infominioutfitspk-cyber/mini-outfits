import { revalidateTag, revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/site-url-server';

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function resolveSiteUrl(): Promise<string> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('store_settings')
      .select('store_url')
      .eq('id', '00000000-0000-4000-8000-000000000001')
      .maybeSingle();
    return getSiteUrl({ storeUrl: data?.store_url });
  } catch (e) {
    console.warn('Failed to resolve dynamic siteUrl:', e);
  }
  return getSiteUrl();
}

async function purgeCloudflareUrls(urls: string[]) {
  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
    console.warn('Cloudflare credentials missing. Skipping cache purge.');
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Failed to purge Cloudflare cache:', data);
    } else {
      console.log('Successfully purged Cloudflare cache:', urls);
    }
  } catch (error) {
    console.error('Error purging Cloudflare cache:', error);
  }
}

async function purgeCloudflareEverything() {
  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
    console.warn('Cloudflare credentials missing. Skipping complete cache purge.');
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Failed to purge everything on Cloudflare:', data);
    } else {
      console.log('Successfully purged everything on Cloudflare');
    }
  } catch (error) {
    console.error('Error purging everything on Cloudflare:', error);
  }
}

export async function revalidateProduct(slug: string) {
  try {
    // Correct single-arg revalidateTag — cast to any per GEMINI.md TS rule
    (revalidateTag as any)(`product-${slug}`);
    (revalidateTag as any)('products');
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('reviews');

    // Purge Full Route Cache of relevant paths
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath(`/product/${slug}`);

    // Purge ALL Cloudflare edge cache (static assets are content-hashed — safe)
    await purgeCloudflareEverything();
    console.log(`[revalidate] Product revalidated: ${slug}`);
  } catch (error) {
    console.error(`Error in revalidateProduct for ${slug}:`, error);
    throw error;
  }
}

export async function revalidateBanner() {
  try {
    (revalidateTag as any)('banners');
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('homepage_sections');
    (revalidateTag as any)('products');

    // Purge page routing cache
    revalidatePath('/');
    revalidatePath('/shop');

    const dynamicSiteUrl = await resolveSiteUrl();
    const urls = [
      `${dynamicSiteUrl}/`,
      `${dynamicSiteUrl}`,
      `${dynamicSiteUrl}/shop`,
    ];
    await purgeCloudflareUrls(urls);
    console.log('[revalidate] Banners & homepage revalidated');
  } catch (error) {
    console.error('Error in revalidateBanner:', error);
    throw error;
  }
}

export async function revalidateCategory(slug: string) {
  try {
    (revalidateTag as any)(`category-${slug}`);
    (revalidateTag as any)('categories');
    (revalidateTag as any)('products');

    // Purge page routing cache
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath(`/category/${slug}`);

    await purgeCloudflareEverything();
    console.log(`[revalidate] Category revalidated: ${slug}`);
  } catch (error) {
    console.error(`Error in revalidateCategory for ${slug}:`, error);
    throw error;
  }
}

export async function revalidateHomepage() {
  try {
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('products');

    // Purge page routing cache
    revalidatePath('/');
    revalidatePath('/shop');

    const dynamicSiteUrl = await resolveSiteUrl();
    const urls = [
      `${dynamicSiteUrl}/`,
      `${dynamicSiteUrl}`,
      `${dynamicSiteUrl}/shop`,
    ];
    await purgeCloudflareUrls(urls);
    console.log('[revalidate] Homepage revalidated');
  } catch (error) {
    console.error('Error in revalidateHomepage:', error);
    throw error;
  }
}

export async function revalidateSettings() {
  try {
    (revalidateTag as any)('settings');
    (revalidateTag as any)('homepage');
    (revalidateTag as any)('homepage_sections');
    (revalidateTag as any)('products');
    (revalidateTag as any)('categories');
    (revalidateTag as any)('banners');

    // Revalidate the entire site (including layout metadata, favicon, titles)
    revalidatePath('/', 'layout');

    await purgeCloudflareEverything();
    console.log('[revalidate] Settings revalidated + complete Cloudflare cache purged');
  } catch (error) {
    console.error('Error in revalidateSettings:', error);
    throw error;
  }
}
