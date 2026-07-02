/**
 * Google Merchant Center product feed  →  /google-merchant.xml
 *
 * A server-generated RSS 2.0 feed (with the g: namespace) that lists every
 * product for Google Shopping. Submit its URL in Merchant Center:
 *   Products → Feeds → Add feed → Scheduled fetch →
 *   https://www.crosscoin.in/google-merchant.xml
 *
 * One row per product (default/first variation price). No GTINs, so we send
 * brand + mpn (SKU) and identifier_exists = no, which Google accepts for
 * own-brand apparel.
 */

const BASE_URL = 'https://www.crosscoin.in';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const IMAGEKIT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';

// Store defaults. Change these if the catalogue expands beyond socks.
const DEFAULT_BRAND = 'Cross Coin';
const GOOGLE_CATEGORY = 'Apparel & Accessories > Clothing > Underwear & Socks > Socks';
const DEFAULT_GENDER = 'unisex';
const DEFAULT_AGE_GROUP = 'adult';
const CURRENCY = 'INR';

const xmlEscape = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const stripHtml = (s) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const money = (n) => `${Number(n || 0).toFixed(2)} ${CURRENCY}`;

// Resolve a product image (string path or {large|image_url|url}) to a full URL.
function resolveImg(img) {
  if (!img) return null;
  const path = typeof img === 'string' ? img : (img.large || img.image_url || img.url || '');
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  if (path.startsWith('/')) return `${IMAGEKIT}${path}`;
  return `${IMAGEKIT}/products/${path}`;
}

async function fetchAllProducts() {
  const limit = 250;
  const all = [];
  for (let page = 1; page <= 40; page++) { // safety cap: 40 * 250 = 10k
    let data;
    try {
      const r = await fetch(`${API_URL}/api/products/catalog?page=${page}&limit=${limit}`, {
        headers: { 'X-Brand-Name': 'crosscoin' },
      });
      if (!r.ok) break;
      data = await r.json();
    } catch {
      break;
    }
    const prods = data?.data?.products || [];
    if (!prods.length) break;
    all.push(...prods);
    const total = data?.data?.total || data?.data?.totalProducts || 0;
    if (prods.length < limit || (total && all.length >= total)) break;
  }
  return all;
}

function buildItem(p) {
  const slug = p.slug;
  if (!slug) return null;

  const variations = p.ProductVariations || p.variations || [];
  const v0 = variations[0] || {};
  const price = Number(v0.price || p.price || 0);
  const compare = Number(v0.comparePrice || p.comparePrice || 0);
  if (!price) return null; // Google requires a price

  const image = resolveImg((p.images && p.images[0]) || p.image);
  if (!image) return null; // Google requires image_link

  const extraImages = (p.images || [])
    .slice(1, 11)
    .map(resolveImg)
    .filter(Boolean);

  // In stock if any variation (or the product) has stock.
  const anyStock = variations.some((v) => Number(v.stock || 0) > 0) || Number(p.stock || 0) > 0;
  const availability = anyStock ? 'in_stock' : 'out_of_stock';

  // comparePrice is the MRP; when it's higher, it's the regular price and the
  // selling price is a sale price.
  const onSale = compare > price;
  const regularPrice = onSale ? compare : price;
  const salePrice = onSale ? price : null;

  const mpn = v0.sku || p.sku || `CC-${p.id}`;
  const brand = p.brand || (p.Brand && p.Brand.name) || DEFAULT_BRAND;
  const productType = p.category?.name || p.Category?.name || '';
  const description = stripHtml(p.description || p.shortDescription || p.name).slice(0, 4900) || p.name;

  const lines = [
    `<g:id>${xmlEscape(p.id)}</g:id>`,
    `<g:title>${xmlEscape(p.name)}</g:title>`,
    `<g:description>${xmlEscape(description)}</g:description>`,
    `<g:link>${xmlEscape(`${BASE_URL}/products/${slug}`)}</g:link>`,
    `<g:image_link>${xmlEscape(image)}</g:image_link>`,
    ...extraImages.map((u) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`),
    `<g:availability>${availability}</g:availability>`,
    `<g:price>${money(regularPrice)}</g:price>`,
    ...(salePrice != null ? [`<g:sale_price>${money(salePrice)}</g:sale_price>`] : []),
    `<g:condition>new</g:condition>`,
    `<g:brand>${xmlEscape(brand)}</g:brand>`,
    `<g:mpn>${xmlEscape(mpn)}</g:mpn>`,
    `<g:identifier_exists>no</g:identifier_exists>`,
    `<g:google_product_category>${xmlEscape(GOOGLE_CATEGORY)}</g:google_product_category>`,
    ...(productType ? [`<g:product_type>${xmlEscape(productType)}</g:product_type>`] : []),
    `<g:gender>${DEFAULT_GENDER}</g:gender>`,
    `<g:age_group>${DEFAULT_AGE_GROUP}</g:age_group>`,
  ];

  return `    <item>\n      ${lines.join('\n      ')}\n    </item>`;
}

function buildFeed(items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Cross Coin</title>
    <link>${BASE_URL}</link>
    <description>Cross Coin product feed for Google Shopping</description>
${items.join('\n')}
  </channel>
</rss>`;
}

export async function getServerSideProps({ res }) {
  let items = [];
  try {
    const products = await fetchAllProducts();
    items = products.map(buildItem).filter(Boolean);
  } catch {
    items = [];
  }

  const xml = buildFeed(items);
  res.setHeader('Content-Type', 'application/xml');
  // Refresh a few times a day; Merchant Center typically fetches daily.
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function GoogleMerchantFeed() {
  return null;
}
