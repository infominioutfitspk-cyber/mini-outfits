import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI, getAISettings } from '@/lib/aiEngine';
import { buildSystemPrompt, buildSEOPrompt } from '@/lib/seoPrompts';
import { pingIndexNow } from '@/lib/indexNow';
import { getSiteUrl } from '@/lib/site-url-server';

export async function POST(request: Request) {
  try {
    const { entity_type, entity_id, title, context, entity_data } = await request.json();

    if (!entity_type || !entity_id) {
      return NextResponse.json({ error: 'Missing entity_type or entity_id' }, { status: 400 });
    }

    // 1. Fetch entity details from DB for context if entity_data not provided
    let entityData: any = {};
    let slug = '';

    if (entity_data) {
      entityData = entity_data;
      slug = entity_data.slug || '';
    } else if (entity_type === 'product') {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('name, description, price, slug')
        .eq('id', entity_id)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      entityData = {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: 'PKR',
        stock: 10, // fallback stock
      };
      slug = data.slug;
    } else if (entity_type === 'category') {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .select('name, description, slug')
        .eq('id', entity_id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      entityData = {
        name: data.name,
        description: data.description,
      };
      slug = data.slug;
    } else {
      // generic page type
      entityData = {
        title: title || 'Page',
        description: context || '',
      };
      slug = entity_id; // page slug passed as entity_id
    }

    // 2. Fetch Central AI Settings & Store Settings
    const settings = await getAISettings();
    
    const { data: storeSettings } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .eq('id', '00000000-0000-4000-8000-000000000001')
      .single();

    const siteUrl = storeSettings?.store_url || await getSiteUrl(storeSettings) || '';

    // Check if AI features are enabled globally
    if (!settings.ai_enabled) {
      return NextResponse.json({ 
        success: false, 
        skipped: true, 
        message: 'SEO optimization skipped: AI system is globally disabled in settings.' 
      }, { status: 200 });
    }

    // Check if keys are configured
    const keysRaw = settings.content_keys || '';
    const keys = keysRaw
      .split('\n')
      .map((k: string) => k.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      return NextResponse.json({ 
        success: false, 
        skipped: true, 
        message: 'SEO optimization skipped: AI keys not configured in settings.' 
      }, { status: 200 });
    }

    // 3. Build Prompts
    const systemPrompt = buildSystemPrompt(settings, storeSettings);
    const userPrompt = buildSEOPrompt(entity_type, entityData, settings);

    // 4. Invoke LLM via Key Rotation Engine
    const rawResult = await callAI(userPrompt, systemPrompt, false);

    // 5. Parse JSON response (cleans thinking tags or markdown code block wrapper if present)
    let cleanJsonStr = rawResult.trim();
    const firstBrace = cleanJsonStr.indexOf('{');
    const lastBrace = cleanJsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJsonStr = cleanJsonStr.substring(firstBrace, lastBrace + 1);
    } else {
      if (cleanJsonStr.includes('```json')) {
        cleanJsonStr = cleanJsonStr.split('```json')[1].split('```')[0].trim();
      } else if (cleanJsonStr.includes('```')) {
        cleanJsonStr = cleanJsonStr.split('```')[1].split('```')[0].trim();
      }
    }

    let seoData: any;
    try {
      seoData = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error('[SEO Optimize] JSON Parse Error. Raw output was:', rawResult);
      return NextResponse.json({ 
        success: false,
        error: 'AI response was not valid JSON', 
        raw: rawResult 
      }, { status: 200 });
    }

    // 6. Check if entity_id is a valid UUID to write to the DB
    const isValidUuid = (id: string) => {
      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return regex.test(id);
    };

    const isDbWritable = entity_id && isValidUuid(entity_id);

    if (isDbWritable) {
      // Save/Upsert to seo_meta table
      const { error: upsertError } = await supabaseAdmin
        .from('seo_meta')
        .upsert({
          entity_type,
          entity_id,
          seo_title: seoData.seo_title,
          meta_description: seoData.meta_description,
          focus_keyword: seoData.focus_keyword,
          secondary_keywords: seoData.secondary_keywords,
          lsi_tags: seoData.lsi_tags,
          og_title: seoData.og_title,
          og_description: seoData.og_description,
          twitter_title: seoData.twitter_title,
          twitter_description: seoData.twitter_description,
          image_alt: seoData.image_alt,
          long_description: seoData.long_description,
          faq_schema: seoData.faq_schema || [],
          pinterest_description: seoData.pinterest_description,
          is_optimized: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'entity_type,entity_id'
        });

      if (upsertError) {
        console.error('[SEO Optimize] DB Upsert Error:', upsertError);
        return NextResponse.json({ success: false, error: 'Failed to save SEO metadata to database' }, { status: 200 });
      }

      // Write back to main tables
      if (entity_type === 'product') {
        const tagsSet = new Set<string>();
        if (seoData.focus_keyword) {
          seoData.focus_keyword.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
        }
        if (seoData.secondary_keywords) {
          seoData.secondary_keywords.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
        }
        if (seoData.lsi_tags) {
          seoData.lsi_tags.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
        }
        const tagsArray = Array.from(tagsSet);

        const { error: updateProductError } = await supabaseAdmin
          .from('products')
          .update({
            description: seoData.long_description,
            short_description: seoData.meta_description,
            meta_title: seoData.seo_title,
            meta_description: seoData.meta_description,
            tags: tagsArray,
            meta_sync_status: 'synced',
            meta_last_synced_at: new Date().toISOString()
          })
          .eq('id', entity_id);

        if (updateProductError) {
          console.error('[SEO Optimize] Product Main Table Update Error:', updateProductError);
        }
      } else if (entity_type === 'category') {
        const { error: updateCategoryError } = await supabaseAdmin
          .from('categories')
          .update({
            description: seoData.long_description,
            updated_at: new Date().toISOString()
          })
          .eq('id', entity_id);

        if (updateCategoryError) {
          console.error('[SEO Optimize] Category Main Table Update Error:', updateCategoryError);
        }
      }

      // 7. Ping IndexNow API
      const targetUrl = entity_type === 'product'
        ? `${siteUrl}/product/${slug}`
        : entity_type === 'category'
        ? `${siteUrl}/category/${slug}`
        : `${siteUrl}/${slug}`;
      
      await pingIndexNow([targetUrl]);

      // Trigger local storefront cache clear
      try {
        const { revalidateTag } = await import('next/cache');
        if (entity_type === 'product') {
          (revalidateTag as any)(`product-${slug}`);
          (revalidateTag as any)('products');
        } else if (entity_type === 'category') {
          (revalidateTag as any)(`category-${slug}`);
          (revalidateTag as any)('categories');
        }
      } catch (revalErr) {
        console.warn('[SEO Optimize] Local revalidation skipped:', revalErr);
      }
    }

    return NextResponse.json({ success: true, data: seoData });
  } catch (error: any) {
    console.error('[SEO Optimize] Optimization failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Optimization process failed' }, { status: 200 });
  }
}
