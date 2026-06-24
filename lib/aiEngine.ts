import { supabaseAdmin } from './supabase/admin';

interface AISettings {
  ai_enabled: boolean;
  content_provider: string;
  content_model: string;
  content_keys: string;
  vision_provider: string;
  vision_model: string;
  vision_keys: string;
  brand_name: string;
  store_type: string;
  target_market: string;
  tone: string;
  language: string;
  custom_instructions: string;
  auto_content_seo: boolean;
  auto_media_ai: boolean;
  target_audiences?: string;
  product_types?: string;
  category_default_template?: string;
  product_default_template?: string;
}

/**
 * Helper to fetch settings from Supabase
 */
export async function getAISettings(): Promise<AISettings> {
  const { data, error } = await supabaseAdmin
    .from('ai_settings')
    .select('*')
    .eq('id', '00000000-0000-4000-8000-000000000002')
    .single();

  if (error || !data) {
    throw new Error('AI Settings not initialized in database');
  }
  return data;
}

/**
 * Downloads an image from a URL and converts it to a base64 string
 */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/webp';
    return {
      base64: buffer.toString('base64'),
      mimeType
    };
  } catch (error) {
    console.error('[aiEngine] Error fetching image as base64:', error);
    throw error;
  }
}

/**
 * Main AI call function supporting Groq, Gemini, Claude, Mistral, DeepSeek, Workers AI, etc.
 * Rotates key array upon encountering rate limits (429, 503, 402).
 */
export async function callAI(
  prompt: string,
  systemPrompt: string,
  isVision: boolean = false,
  imageUrl?: string
): Promise<string> {
  const settings = await getAISettings();

  if (!settings.ai_enabled) {
    throw new Error('AI features are globally disabled in settings.');
  }

  const provider = isVision ? settings.vision_provider : settings.content_provider;
  const model = isVision ? settings.vision_model : settings.content_model;
  const keysRaw = isVision ? settings.vision_keys : settings.content_keys;

  const keys = keysRaw
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error(`No API keys found for provider: ${provider}`);
  }

  // Iterate over rotated keys
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    try {
      return await executeRequest(provider, model, apiKey, prompt, systemPrompt, isVision, imageUrl);
    } catch (err: any) {
      console.warn(`[aiEngine] Key ${i} failed for provider ${provider}:`, err.message || err);
      const status = err.status || err.statusCode;
      if (status === 429 || status === 503 || status === 402) {
        // Fallback to next key
        continue;
      }
      throw err; // Stop on logic or schema errors
    }
  }

  throw new Error(`All ${provider} API keys exhausted`);
}

/**
 * Dispatch API calls to specific endpoints
 */
async function executeRequest(
  provider: string,
  model: string,
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  isVision: boolean,
  imageUrl?: string
): Promise<string> {
  let url = '';
  let headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  let body: any = {};

  // If vision request, fetch base64
  let base64Data = '';
  let mimeType = 'image/webp';
  if (isVision && imageUrl) {
    const imgInfo = await fetchImageAsBase64(imageUrl);
    base64Data = imgInfo.base64;
    mimeType = imgInfo.mimeType;
  }

  // Provider routing
  switch (provider.toLowerCase()) {
    case 'gemini': {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };

      const parts: any[] = [];
      if (isVision && base64Data) {
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }
      parts.push({ text: prompt });

      body = {
        contents: [
          {
            role: 'user',
            parts: parts
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json'
        }
      };

      const res = await makeFetch(url, headers, body);
      const json = JSON.parse(res);
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini API');
      return text;
    }

    case 'anthropic': {
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      };

      let content: any = prompt;
      if (isVision && base64Data) {
        content = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ];
      }

      body = {
        model: model,
        system: systemPrompt,
        messages: [{ role: 'user', content: content }],
        max_tokens: 4000
      };

      const res = await makeFetch(url, headers, body);
      const json = JSON.parse(res);
      const text = json?.content?.[0]?.text;
      if (!text) throw new Error('Empty response from Anthropic API');
      return text;
    }

    case 'cloudflare': {
      // Expect key format: account_id:api_token
      const accountId = process.env.CF_ACCOUNT_ID || '';
      url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
      headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      if (isVision && base64Data) {
        body = {
          image: Array.from(Buffer.from(base64Data, 'base64')),
          prompt: prompt
        };
      } else {
        body = {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        };
      }

      const res = await makeFetch(url, headers, body);
      const json = JSON.parse(res);
      const text = json?.result?.response || json?.result?.text;
      if (!text) throw new Error('Empty response from Cloudflare API');
      return text;
    }

    default: {
      // OpenAI compatible endpoints — all providers use standard Bearer auth + chat/completions
      const providers: Record<string, string> = {
        // Free
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        cerebras: 'https://api.cerebras.ai/v1/chat/completions',
        mistral: 'https://api.mistral.ai/v1/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
        nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
        // Cheap
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        together: 'https://api.together.xyz/v1/chat/completions',
        fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
        siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
        kimi: 'https://api.moonshot.cn/v1/chat/completions',
        qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        // Premium
        openai: 'https://api.openai.com/v1/chat/completions',
        minimax: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
      };

      const endpoint = providers[provider.toLowerCase()];
      if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

      url = endpoint;
      headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      let userContent: any = prompt;
      if (isVision && base64Data) {
        userContent = [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          }
        ];
      }

      body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' }
      };

      // OpenRouter can take extra headers
      if (provider.toLowerCase() === 'openrouter') {
        headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || '';
        headers['X-Title'] = process.env.NEXT_PUBLIC_BRAND_NAME || 'Store';
      }

      const res = await makeFetch(url, headers, body);
      const json = JSON.parse(res);
      const text = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI compatible API');
      return text;
    }
  }
}

/**
 * Standard fetch helper with error throw
 */
async function makeFetch(url: string, headers: Record<string, string>, body: any): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    const error: any = new Error(`API Error ${response.status}: ${errText}`);
    error.status = response.status;
    throw error;
  }

  return response.text();
}

/**
 * Shared helper to generate image SEO metadata using the vision model
 */
export async function generateImageMeta(imageUrl: string): Promise<{
  alt_text: string;
  seo_filename: string;
  title: string;
  description: string;
  caption: string;
}> {
  const systemPrompt = `You are an expert Image SEO optimizer. Analyze the provided image and generate relevant SEO tags. Return ONLY a valid JSON object matching the requested schema. Do not include markdown code block wrappers or extra text.`;
  const userPrompt = `Analyze this image and return ONLY this JSON schema:
{
  "alt_text": "Highly descriptive, SEO-friendly ALT text focusing on clothing attributes, material, and color.",
  "seo_filename": "hyphen-separated-lowercase-filename.webp",
  "title": "Clean, descriptive title for the image.",
  "description": "A 100-150 words detailed description of what is visible in the image.",
  "caption": "A short, engaging caption for the image."
}`;

  const rawResult = await callAI(userPrompt, systemPrompt, true, imageUrl);
  let cleanJsonStr = rawResult.trim();
  if (cleanJsonStr.includes('```json')) {
    cleanJsonStr = cleanJsonStr.split('```json')[1].split('```')[0].trim();
  } else if (cleanJsonStr.includes('```')) {
    cleanJsonStr = cleanJsonStr.split('```')[1].split('```')[0].trim();
  }
  return JSON.parse(cleanJsonStr);
}
