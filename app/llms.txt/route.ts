import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/services/settings';

export async function GET() {
  try {
    const settings = await getSettings();
    const brandName = settings.storeName || 'Zaynahs E-Store';
    const tagline = settings.tagline || 'Premium Pakistani E-Commerce Store';

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('name, price, slug')
      .limit(20);

    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('name')
      .eq('active', true);

    const lines = [
      `# ${brandName}`,
      `> ${tagline}`,
      ``,
      `## Categories`,
      ...(categories || []).map((c) => `- ${c.name}`),
      ``,
      `## Products`,
      ...(products || []).map((p) => `- ${p.name} (PKR ${p.price})`),
    ];

    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
