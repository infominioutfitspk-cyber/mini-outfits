import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/services/settings';
import { getSiteUrl } from '@/lib/site-url-server';
import { Metadata } from 'next';

export const revalidate = 300; // Cache redirect for 5 minutes

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    
    // Fetch category
    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id, name, description, image_url')
      .eq('slug', slug)
      .maybeSingle();

    if (!category) return {};

    // Fetch SEO metadata
    const { data: seoMeta } = await supabaseAdmin
      .from('seo_meta')
      .select('*')
      .eq('entity_type', 'category')
      .eq('entity_id', category.id)
      .maybeSingle();

    const settings = await getSettings();
    const siteUrl = await getSiteUrl(settings);
    const brandName = settings.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Zaynahs E-Store';

    const title = seoMeta?.seo_title || `${category.name} | ${brandName}`;
    const description = seoMeta?.meta_description || category.description || '';
    const imageUrl = category.image_url || settings.logoUrl || settings.faviconUrl || '';

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      alternates: {
        canonical: `${siteUrl}/category/${slug}`
      },
      openGraph: {
        title,
        description,
        images: [{ url: imageUrl }]
      }
    };
  } catch (err) {
    return {
      title: 'Shop Category'
    };
  }
}

export default async function CategoryRedirectPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  
  // Redirect to the shop page with the category filter applied
  redirect(`/shop?category=${resolvedParams.slug}`);
}
