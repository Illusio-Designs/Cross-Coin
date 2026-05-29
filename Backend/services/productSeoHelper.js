/**
 * Build ProductSEO row content with sensible auto-fill defaults and a rich
 * schema.org/Product JSON-LD payload. Used by both productController.create
 * and productController.update so admins only need to enter SEO fields when
 * they want to override the defaults — everything else flows from the
 * product's own name / description / brand / variations.
 */

const settingsHelper = require('./settingsHelper.js');

const API_URL = () => process.env.API_URL || 'https://api.crosscoin.in';
const FRONTEND_URL = () => process.env.FRONTEND_URL || 'https://crosscoin.in';

function stripHtml(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(str, n) {
  if (!str) return '';
  const trimmed = stripHtml(str);
  if (trimmed.length <= n) return trimmed;
  return trimmed.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

function resolveImageUrl(value, productImagesFirst = null) {
  if (value && typeof value === 'string') {
    if (value.startsWith('http')) return value;
    if (value.startsWith('/uploads/')) return `${API_URL()}${value}`;
    return `${API_URL()}/uploads/products/${value}`;
  }
  if (productImagesFirst?.filename) {
    return `${API_URL()}/uploads/products/${productImagesFirst.filename}`;
  }
  if (typeof productImagesFirst === 'string' && productImagesFirst) {
    return productImagesFirst.startsWith('http')
      ? productImagesFirst
      : `${API_URL()}/uploads/products/${productImagesFirst}`;
  }
  return null;
}

/**
 * @param {object} ctx
 * @param {object} ctx.product   — Sequelize Product instance OR { id, name, slug, description, brand_id, avg_rating, review_count }
 * @param {Array}  ctx.variations  — array of variations [{ price, stock, sku, ... }]
 * @param {Array}  ctx.images      — array of images [{ filename, ... }]
 * @param {object} ctx.seo         — admin-supplied overrides (any subset of metaTitle/metaDescription/etc.)
 * @param {object} ctx.brand       — Brand instance (optional)
 * @returns {Promise<object>}      — ProductSEO row data
 */
async function buildProductSeoData(ctx) {
  const { product, seo = {}, variations = [], images = [], brand = null } = ctx;

  const brandId = product.brand_id || brand?.id || 1;
  const brandName = brand?.display_name || brand?.name || (await settingsHelper.getSetting(brandId, 'SEO_ORGANIZATION_NAME', 'CrossCoin'));
  const titleTemplate = await settingsHelper.getSetting(brandId, 'SEO_DEFAULT_TITLE_TEMPLATE', '{name} | {brand}');
  const returnPolicyUrl = await settingsHelper.getSetting(brandId, 'SEO_RETURN_POLICY_URL', `${FRONTEND_URL()}/policy?policy=return`);
  const returnDays = parseInt(await settingsHelper.getSetting(brandId, 'SEO_RETURN_WINDOW_DAYS', '7'), 10) || 7;
  const shippingDays = parseInt(await settingsHelper.getSetting(brandId, 'SEO_DEFAULT_SHIPPING_PROMISE_DAYS', '3'), 10) || 3;

  const baseTitle = product.name || 'Product';
  const baseDesc = stripHtml(product.description || '');

  // Title auto-fill — admin override wins, otherwise apply template.
  const metaTitle = (seo.metaTitle || seo.meta_title || titleTemplate
    .replace('{name}', baseTitle)
    .replace('{brand}', brandName)).slice(0, 70);

  // Description auto-fill — 150–160 char window is what Google shows.
  const metaDescription = truncate(
    seo.metaDescription || seo.meta_description || baseDesc || `Shop ${baseTitle} at ${brandName}. Free shipping & easy returns.`,
    160,
  );

  // Keywords auto-fill — comma-separated nouns from name + brand.
  const metaKeywords = seo.metaKeywords || seo.meta_keywords
    || [baseTitle, brandName, 'buy online', 'india'].filter(Boolean).join(', ');

  const ogTitle = seo.ogTitle || seo.og_title || metaTitle;
  const ogDescription = seo.ogDescription || seo.og_description || metaDescription;
  const ogImage = resolveImageUrl(seo.ogImage || seo.og_image, images?.[0]);

  const canonicalUrl = seo.canonicalUrl || seo.canonical_url
    || `${FRONTEND_URL()}/products/${product.slug}`;

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const v0 = variations?.[0] || {};
  const price = Number(v0.price) || 0;
  const inStock = (v0.stock ?? 0) > 0;
  const allImages = (images || []).map(img => {
    if (img?.filename) return `${API_URL()}/uploads/products/${img.filename}`;
    if (typeof img === 'string') return img.startsWith('http') ? img : `${API_URL()}/uploads/products/${img}`;
    return null;
  }).filter(Boolean);

  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: baseTitle,
    description: metaDescription,
    image: allImages.length ? allImages : (ogImage ? [ogImage] : undefined),
    sku: v0.sku || undefined,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      price: price,
      priceCurrency: 'INR',
      priceValidUntil: priceValidUntil.toISOString().slice(0, 10),
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: returnDays,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
        merchantReturnLink: returnPolicyUrl,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: shippingDays, unitCode: 'DAY' },
        },
      },
    },
  };

  // Aggregate rating block — only emit when we have reviews; Google rejects empty/0.
  const reviewCount = parseInt(product.review_count, 10) || 0;
  const avgRating = parseFloat(product.avg_rating);
  if (reviewCount > 0 && avgRating > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount: reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // If admin pasted their own structuredData JSON, honour it as-is.
  const structuredData = seo.structuredData || seo.structured_data || JSON.stringify(ld);

  return {
    metaTitle,
    metaDescription,
    metaKeywords,
    ogTitle,
    ogDescription,
    ogImage,
    canonicalUrl,
    structuredData,
  };
}

module.exports = { buildProductSeoData };
