export function getClientSiteUrl(settings?: { storeUrl?: string }): string {
  if (settings?.storeUrl) return settings.storeUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export function cleanLocalhostUrls(text: string, siteUrl: string): string {
  return text.replace(/http:\/\/localhost:\d+/g, siteUrl.replace(/\/+$/, ''));
}