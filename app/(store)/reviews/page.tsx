import React from 'react';
import type { Metadata } from 'next';
import { getGlobalReviews } from '@/lib/services/reviews';
import { getSocialProofs } from '@/lib/services/socialProof';
import { getSettings } from '@/lib/services/settings';
import { getSiteUrl } from '@/lib/site-url-server';
import ReviewsPageClient from './ReviewsPageClient';

interface PageProps {
  searchParams: Promise<{ search?: string; rating?: string; sort?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const storeName = settings.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Zaynahs E-Store';
  return {
    title: `Customer Reviews | ${storeName}`,
    description: 'Read authentic customer reviews and ratings. See what our customers are saying about our products.',
  };
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const settings = await getSettings();
  const siteUrl = await getSiteUrl(settings);

  const { reviews, total } = await getGlobalReviews({
    search: sp.search,
    rating: sp.rating ? parseInt(sp.rating) : undefined,
    sort: (sp.sort as any) || 'newest',
    page: parseInt(sp.page || '1'),
    limit: 20,
  });

  const socialProofs = await getSocialProofs();

  // Generate JSON-LD aggregate schema
  const aggregateRating = reviews.length > 0
    ? {
        average: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
        count: total,
      }
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Customer Reviews | ${settings.storeName || 'TotVogue'}`,
    ...(aggregateRating && {
      review: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.average.toFixed(1),
        reviewCount: aggregateRating.count,
        bestRating: 5,
        worstRating: 1,
      }
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReviewsPageClient
        initialReviews={reviews}
        initialTotal={total}
        initialSocialProofs={socialProofs}
        storeUrl={siteUrl}
      />
    </>
  );
}
