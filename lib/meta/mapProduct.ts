import { getClientSiteUrl, cleanLocalhostUrls } from '@/lib/site-url';
import { Product, StoreSettings } from '@/lib/types';

/**
 * Strips HTML tags and replaces localhost URLs with live production domain URLs.
 */
function cleanDescription(htmlText: string, siteUrl: string): string {
  if (!htmlText) return '';
  
  // 1. Replace localhost links with production domain
  let text = cleanLocalhostUrls(htmlText, siteUrl);
  
  // 2. Strip HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // 3. Normalize multiple spaces and HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
    
  return text;
}

/**
 * Helper to ensure image URLs point to the production domain instead of localhost.
 */
function cleanImageUrl(url: string, siteUrl: string): string {
  if (!url) return '';
  return cleanLocalhostUrls(url, siteUrl);
}

/**
 * Auto-detects gender based on product text with word boundary matching.
 */
function getGender(title: string, description: string): 'male' | 'female' | 'unisex' {
  const text = `${title} ${description}`.toLowerCase();
  
  const isFemale = /\b(girl|girls|female|females|frock|frocks|skirt|skirts|kurti|kurtis|gown|gowns|barbie|pink|lace|fiza|zaynah|mariab)\b/i.test(text);
  const isMale = /\b(boy|boys|male|males|shirting|jeans|polo)\b/i.test(text);
  
  if (isFemale && !isMale) return 'female';
  if (isMale && !isFemale) return 'male';
  return 'unisex';
}

/**
 * Auto-detects age group based on product metadata and categories with word boundaries.
 */
function getAgeGroup(title: string, description: string, categoryPath: string): 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult' {
  const text = `${title} ${description} ${categoryPath}`.toLowerCase();
  
  const isNewborn = /\b(newborn|newborns|born|0-3m|3-6m)\b/i.test(text);
  const isInfant = /\b(infant|infants|baby|babies|6-9m|9-12m)\b/i.test(text);
  const isToddler = /\b(toddler|toddlers|12-18m|18-24m|1-2y|2y|3y|4y)\b/i.test(text);
  const isKids = /\b(kid|kids|child|children|boy|boys|girl|girls|school|junior|5y|6y|7y|8y|9y|10y|11y|12y)\b/i.test(text);
  
  if (isNewborn) return 'newborn';
  if (isInfant) return 'infant';
  if (isToddler) return 'toddler';
  if (isKids || categoryPath.toLowerCase().includes("kids' clothing")) return 'kids';
  return 'adult';
}

interface MetaCatalogItem {
  id: string;
  item_group_id?: string;
  title: string;
  description: string;
  price: string;
  sale_price?: string;
  currency: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new';
  link: string;
  image_link: string;
  additional_image_link?: string;
  brand: string;
  category: string;
  google_product_category: string;
  inventory: number;
  color?: string;
  size?: string;
  material?: string;
  gender: 'male' | 'female' | 'unisex';
  age_group: 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult';
}

/**
 * Maps a product (and its active variants, if any) to the Meta Catalog Graph API schema.
 * Returns an array of catalog items (each representing either a simple product or a variant).
 */
export function mapProductToMeta(
  product: Product,
  settings: StoreSettings,
  categoryMap: Record<string, string>
): MetaCatalogItem[] {
  // 1. Data Integrity Validation Checks
  if (!product.name) {
    throw new Error('Product name is required for Meta Catalog sync.');
  }
  if (!product.slug) {
    throw new Error(`Product "${product.name}" has no slug. A valid slug is required to construct the product URL.`);
  }
  if (product.price === undefined || product.price === null) {
    throw new Error(`Product "${product.name}" has no price defined.`);
  }
  if (!product.images || product.images.length === 0) {
    throw new Error(`Product "${product.name}" has no images. Meta Catalog requires at least one image.`);
  }

  // 2. Resolve Site URL and Brand Name fallbacks
  let siteUrl = getClientSiteUrl(settings);
  
  const brandName = settings.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Zaynahs E-Store';
  const currency = settings.currency || 'PKR';
  
  // 3. Resolve and clean image links (preventing localhost leakage)
  const rawPrimaryUrl = product.images.find(img => img.isPrimary)?.url || product.images[0].url;
  const primaryImage = cleanImageUrl(rawPrimaryUrl, siteUrl);

  const additionalImages = product.images
    .filter(img => img.url !== rawPrimaryUrl)
    .map(img => cleanImageUrl(img.url, siteUrl));
  
  // Resolve standard Meta category path
  const categoryPath = (product.categoryId && categoryMap[product.categoryId]) || 'Apparel & Accessories > Clothing';

  const baseDescription = cleanDescription(product.description || product.name, siteUrl);
  
  const gender = getGender(product.name, baseDescription);
  const ageGroup = getAgeGroup(product.name, baseDescription, categoryPath);

  // If the product has active variants, map each variant as an item in Meta Catalog
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    return product.variants
      .filter(v => v.active)
      .map(v => {
        const variantNameParts = [];
        if (v.color) variantNameParts.push(v.color);
        if (v.size) variantNameParts.push(v.size);
        if (v.material) variantNameParts.push(v.material);
        if (v.customValue) variantNameParts.push(v.customValue);
        
        const variantName = variantNameParts.length > 0 
          ? `${product.name} - ${variantNameParts.join(', ')}`
          : product.name;

        const activePrice = v.price || product.price;
        const comparePrice = v.comparePrice || product.comparePrice;

        // Sale price calculations: regular price goes to 'price', discounted active goes to 'sale_price'
        let finalPrice = `${activePrice} ${currency}`;
        let salePrice: string | undefined = undefined;

        if (comparePrice && Number(comparePrice) > Number(activePrice)) {
          finalPrice = `${comparePrice} ${currency}`;
          salePrice = `${activePrice} ${currency}`;
        }

        const variantImageUrl = v.imageUrl ? cleanImageUrl(v.imageUrl, siteUrl) : primaryImage;

        return {
          id: v.id,
          item_group_id: product.id,
          title: variantName,
          description: baseDescription,
          price: finalPrice,
          sale_price: salePrice,
          currency: currency,
          availability: v.stock > 0 ? 'in stock' : 'out of stock',
          condition: 'new',
          link: `${siteUrl}/product/${product.slug}`,
          image_link: variantImageUrl,
          additional_image_link: additionalImages.length > 0 ? additionalImages.join(',') : undefined,
          brand: brandName,
          category: categoryPath,
          google_product_category: categoryPath,
          inventory: v.stock,
          color: v.color || undefined,
          size: v.size || undefined,
          material: v.material || undefined,
          gender,
          age_group: ageGroup
        };
      });
  }

  // Simple product mapping (no variants — item_group_id omitted)
  const activePrice = product.price;
  const comparePrice = product.comparePrice;

  let finalPrice = `${activePrice} ${currency}`;
  let salePrice: string | undefined = undefined;

  if (comparePrice && Number(comparePrice) > Number(activePrice)) {
    finalPrice = `${comparePrice} ${currency}`;
    salePrice = `${activePrice} ${currency}`;
  }

  return [{
    id: product.id,
    title: product.name,
    description: baseDescription,
    price: finalPrice,
    sale_price: salePrice,
    currency: currency,
    availability: product.stock > 0 ? 'in stock' : 'out of stock',
    condition: 'new',
    link: `${siteUrl}/product/${product.slug}`,
    image_link: primaryImage,
    additional_image_link: additionalImages.length > 0 ? additionalImages.join(',') : undefined,
    brand: brandName,
    category: categoryPath,
    google_product_category: categoryPath,
    inventory: product.stock,
    gender,
    age_group: ageGroup
  }];
}
