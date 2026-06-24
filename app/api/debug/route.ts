import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const staticSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  const results: Record<string, any> = {};

  // Test 1: server client (cookies)
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('badges').select('count').limit(1);
    results.serverClientBadges = error ? `ERROR: ${error.message}` : 'OK';
  } catch (e: any) {
    results.serverClientBadges = `CRASH: ${e.message}`;
  }

  // Test 2: static client - size_guides
  try {
    const { data, error } = await staticSupabase
      .from('size_guides')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    results.staticSizeGuides = error ? `ERROR: ${error.message}` : `OK (${data?.length || 0} rows)`;
  } catch (e: any) {
    results.staticSizeGuides = `CRASH: ${e.message}`;
  }

  // Test 3: static client - variant_presets
  try {
    const { data, error } = await staticSupabase
      .from('variant_presets')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    results.staticVariantPresets = error ? `ERROR: ${error.message}` : `OK (${data?.length || 0} rows)`;
  } catch (e: any) {
    results.staticVariantPresets = `CRASH: ${e.message}`;
  }

  // Test 4: env vars
  results.envSupabaseUrl = supabaseUrl === 'https://placeholder.supabase.co' ? 'PLACEHOLDER' : 'SET';
  results.envSupabaseKey = supabaseAnonKey === 'placeholder' ? 'PLACEHOLDER' : 'SET';

  // Test 5: products query
  try {
    const { data, error } = await staticSupabase
      .from('products')
      .select('id, name, price')
      .eq('active', true);
    results.productsQuery = error ? `ERROR: ${error.message}` : `OK (${data?.length || 0} rows)`;
  } catch (e: any) {
    results.productsQuery = `CRASH: ${e.message}`;
  }

  return Response.json(results);
}
