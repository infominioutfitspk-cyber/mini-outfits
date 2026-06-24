interface AISettings {
  brand_name: string;
  store_type: string;
  target_market: string;
  tone: string;
  language: string;
  custom_instructions: string;
  target_audiences?: string;
  product_types?: string;
  category_default_template?: string;
  product_default_template?: string;
  category_description_prompt?: string;
  category_description_limit?: number;
  product_description_prompt?: string;
  product_description_limit?: number;
  product_short_prompt?: string;
  product_short_limit?: number;
}

/**
 * Builds the system prompt for the SEO Copywriter AI agent based on store settings
 */
export function buildSystemPrompt(settings: AISettings, storeSettings?: any, siteUrl?: string): string {
  const resolvedUrl = siteUrl || storeSettings?.store_url || process.env.NEXT_PUBLIC_SITE_URL || '';
  const audienceStr = settings.target_audiences ? `\nTarget Audiences: ${settings.target_audiences}` : '';
  const typesStr = settings.product_types ? `\nProduct Types: ${settings.product_types}` : '';
  
  let brandInfo = `Brand Name: ${settings.brand_name || storeSettings?.store_name || 'Zaynahs E-Store'}`;
  if (storeSettings?.address) {
    brandInfo += `\nPhysical Address / Location: ${storeSettings.address}`;
  }
  if (storeSettings?.whatsapp_number) {
    brandInfo += `\nWhatsApp Customer Contact: +${storeSettings.whatsapp_number}`;
  }
  if (storeSettings?.tagline) {
    brandInfo += `\nBrand Tagline: ${storeSettings.tagline}`;
  }
  
  let templateGuides = '';
  if (settings.category_default_template) {
    templateGuides += `\nFor category pages, base the generated "long_description" on the structural layout and style of this template (replace {{category_name}} with the actual category name):\n${settings.category_default_template}\n`;
  }
  if (settings.product_default_template) {
    templateGuides += `\nFor product pages, base the generated "long_description" on the structural layout and style of this template (replace {{product_name}} with the actual product name):\n${settings.product_default_template}\n`;
  }

  let customPromptInstructions = '';
  if (settings.category_description_prompt) {
    customPromptInstructions += `\n- Category Description Custom Instructions: ${settings.category_description_prompt}`;
  }
  if (settings.category_description_limit) {
    customPromptInstructions += `\n- Category Description Length: Must be approximately ${settings.category_description_limit} words.`;
  }
  if (settings.product_description_prompt) {
    customPromptInstructions += `\n- Product Description Custom Instructions: ${settings.product_description_prompt}`;
  }
  if (settings.product_description_limit) {
    customPromptInstructions += `\n- Product Description Length: Must be approximately ${settings.product_description_limit} words.`;
  }
  if (settings.product_short_prompt) {
    customPromptInstructions += `\n- Product Short Description Custom Instructions: ${settings.product_short_prompt}`;
  }
  if (settings.product_short_limit) {
    customPromptInstructions += `\n- Product Short Description Length: Must be approximately ${settings.product_short_limit} words.`;
  }

  return `You are an expert SEO copywriter and marketing specialist for the brand "${settings.brand_name || storeSettings?.store_name || 'Zaynahs E-Store'}".
${brandInfo}
Store Type: ${settings.store_type || 'General'} clothing & fashion store.${audienceStr}${typesStr}
Target Market: ${settings.target_market || 'Pakistan'}.
Tone of Voice: ${settings.tone || 'Professional'}.
Target Language: Write content in ${settings.language || 'English'}.
${settings.custom_instructions ? `Special Brand Instructions: ${settings.custom_instructions}` : ''}
${templateGuides}
${customPromptInstructions ? `SPECIFIC WRITING PARAMETERS:${customPromptInstructions}\n` : ''}
STRICT SEO & COPYWRITING INSTRUCTIONS:
1. The Primary Focus Keyword MUST appear in the first sentence of the meta description and long description.
2. The long description MUST be formatted in rich, informative, engaging markdown-like HTML (using <h2>, <p>, <ul>, <li> tags). Do not include <html>, <head>, or <body> tags. Adhere to any length constraints specified above (default to 1000+ words for product descriptions and 150+ words for category descriptions if no limit is set).
3. Incorporate the store website URL (${resolvedUrl}) naturally 2-3 times as contextual internal links.
4. FAQ Schema MUST contain 3-5 relevant questions and answers providing structured information about sizing, materials, delivery, and exchange, utilizing the brand contact and address details if relevant.
5. You must output ONLY a valid, parseable JSON object fitting the requested schema. Do not output any thinking tags, markdown wrapper blocks (like \`\`\`json), or conversational text. Return only raw JSON.`;
}

/**
 * Builds the user prompt detailing the entity data and requested JSON schema
 */
export function buildSEOPrompt(type: 'product' | 'category' | 'page', data: any, settings?: AISettings): string {
  const basePrompt = `Generate complete, premium SEO and copywriting metadata for this ${type}.`;

  let metaDescInstruction = 'Exactly 150-160 characters. Must contain the primary keyword and end with a compelling call-to-action (CTA).';
  let longDescInstruction = 'A 1000+ words detailed HTML copywriting copy. Break into logical sections with <h2> headers, bullet lists (<ul>, <li>), and paragraphs (<p>).';

  if (settings) {
    if (type === 'product') {
      if (settings.product_short_limit) {
        metaDescInstruction = `Approximately ${settings.product_short_limit} words short description. Must contain the focus keyword.`;
      }
      if (settings.product_short_prompt) {
        metaDescInstruction += ` Style and instruction: ${settings.product_short_prompt}`;
      }
      if (settings.product_description_limit) {
        longDescInstruction = `Approximately ${settings.product_description_limit} words detailed HTML copywriting copy. Break into logical sections with <h2> headers, bullet lists (<ul>, <li>), and paragraphs (<p>).`;
      }
      if (settings.product_description_prompt) {
        longDescInstruction += ` Style and instruction: ${settings.product_description_prompt}`;
      }
    } else if (type === 'category') {
      if (settings.category_description_limit) {
        longDescInstruction = `Approximately ${settings.category_description_limit} words detailed HTML copywriting copy. Break into logical sections with <h2> headers, bullet lists (<ul>, <li>), and paragraphs (<p>).`;
      }
      if (settings.category_description_prompt) {
        longDescInstruction += ` Style and instruction: ${settings.category_description_prompt}`;
      }
    }
  }

  let contextInfo = '';
  if (type === 'product') {
    contextInfo = `
Product Details:
- Name: ${data.name}
- Original Description: ${data.description || 'Not provided'}
- Price: PKR ${data.price}
- Category: ${data.category || 'General'}
- Status: ${data.stock > 0 ? 'In Stock' : 'Out of Stock'}
`;
  } else if (type === 'category') {
    contextInfo = `
Category Details:
- Name: ${data.name}
- Original Description: ${data.description || 'Not provided'}
`;
  } else {
    contextInfo = `
Page Details:
- Title: ${data.title}
- Original Content: ${data.description || 'Not provided'}
`;
  }

  return `${basePrompt}
${contextInfo}

Return ONLY a JSON object formatted exactly as below (no comments, no wrapper formatting):
{
  "seo_title": "Max 60 characters. Place primary keyword at the beginning, followed by brand suffix.",
  "meta_description": "${metaDescInstruction}",
  "focus_keyword": "The single primary keyword phrase chosen for this item.",
  "secondary_keywords": "5 relevant secondary keywords, comma-separated.",
  "lsi_tags": "12 comma-separated LSI (Latent Semantic Indexing) keyword tags.",
  "og_title": "Open Graph title optimized for Facebook and Instagram shares (under 60 chars).",
  "og_description": "Open Graph description (150-200 chars) for social cards.",
  "twitter_title": "Twitter card title (under 60 chars).",
  "twitter_description": "Twitter card description (under 160 chars).",
  "image_alt": "Highly descriptive image ALT text incorporating the focus keyword.",
  "long_description": "${longDescInstruction}",
  "faq_schema": [
    {
      "q": "Question related to materials, delivery, or sizing?",
      "a": "Detailed answers matching brand guidelines."
    }
  ],
  "pinterest_description": "Rich Pin description including sizing tags and keywords."
}`;
}
