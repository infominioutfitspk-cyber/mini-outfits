import { MetadataRoute } from 'next';
import { getSettings } from '@/lib/services/settings';
import { getSiteUrl } from '@/lib/site-url-server';

export default async function robots(): Promise<MetadataRoute.Robots> {
  let siteUrl = '';
  try {
    const settings = await getSettings();
    siteUrl = await getSiteUrl(settings);
  } catch (e) {
    console.warn('Failed to load settings in robots:', e);
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/cart',
          '/checkout',
          '/account',
          '/account/',
          '/api',
          '/api/',
        ],
      },
      // Explicitly allow all major AI bots
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
