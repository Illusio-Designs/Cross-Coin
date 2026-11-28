import { Suspense } from 'react';
import ProductDescription from '@/components/ProductDescription';
import FaqSection from '../../_components/FaqSection';
import ScentExperience from '@/components/product/ScentExperience';
import NotePhoto from '@/components/product/NotePhoto';
import BrandIcon from '@/components/ui/BrandIcon';
import Link from 'next/link';
import { sanitizeRich } from '@/lib/sanitizeHtml';
import { SITE_URL, absUrl, pageMeta } from '@/lib/site';
import { getProductBySlug, getBestsellers, getPublicProducts, noteKey } from '@/lib/api/products';
import { buildScentExperience, isScentExperienceAttribute } from '@/lib/scentExperience';
import { getProductReviews } from '@/lib/api/reviews';
import { getFaqs } from '@/lib/api/faqs';
import { getBundleTiers, getPackTiers } from '@/lib/api/bundles';
import ProductCard from '../../_components/ProductCard';
import PdpBuy from '../../_components/PdpBuy';
import PdpMixPack from '../../_components/PdpMixPack';
import PdpGallery from '../../_components/PdpGallery';
import WriteReview from '../../_components/WriteReview';
import TrackEvent from '../../_components/TrackEvent';
import { Sk, SkRegion } from '../../_components/Skeleton';

// Regenerate storefront edits in the background, as on Morbix and Soxbae.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const stars = (r) => { const n = Math.round(Number(r) || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };
const AV = ['#b85f6e', '#866027', '#7a3b3f', '#4a6b4f', '#9a6b2e', '#6e4a7a'];
const OCCASIONS = {
  aurum: ['Dinner', 'Date night'], azur: ['Daily wear', 'Vacation'], belle: ['Brunch', 'Date night'],
  cipher: ['Dinner', 'Formal events'], ember: ['Evening events', 'Celebrations'], halva: ['Date night', 'Dinner'],
  muse: ['Brunch', 'Date night'], pulse: ['Daily wear', 'Evening plans'], regal: ['Weddings', 'Evening events'],
  velour: ['Daily wear', 'Dinner'], vice: ['Daily wear', 'Weekend outings'],
};


/* Pull an attribute from the default variation as a clean token list, splitting
   comma-joined values (the backend stores "Fruity, Sweet, Musky" as one string). */
function tokens(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean);
}

function attribute(variation, ...names) {
  const entries = Object.entries(variation?.attributes || {});
  for (const name of names) {
    const values = tokens(entries.find(([key]) => noteKey(key.replace(/[_-]+/g, ' ')) === name)?.[1]);
    if (values.length) return values;
  }
  return [];
}

function audienceOf(variation) {
  const labels = new Set(attribute(variation, 'gender', 'target gender', 'audience').map((value) => {
    const key = noteKey(value);
    if (['unisex', 'all', 'for all', 'for everyone'].includes(key)) return 'Unisex';
    if (['for him', 'man', 'men', 'male', 'masculine'].includes(key)) return 'For Him';
    if (['for her', 'woman', 'women', 'female', 'feminine'].includes(key)) return 'For Her';
    return null;
  }).filter(Boolean));
  return labels.has('Unisex') || labels.size === 2 ? 'Unisex' : [...labels][0];
}

function PdpFragranceProfile({ variation, slug }) {
  const configured = attribute(variation, 'occasion', 'occasions', 'wear occasion');
  const occasions = [...new Set(configured.length ? configured : OCCASIONS[slug] || [])];
  const specs = [
    ['Longevity', attribute(variation, 'longevity (hrs)', 'longevity').map((value) => /^\d+(?:\.\d+)?$/.test(value) ? `${value} hrs` : value).join(' · '), 'hourglass'],
    ['Sillage', attribute(variation, 'sillage').join(' · '), 'sparkles'],
    ['Best for', attribute(variation, 'best for').join(' · '), 'perfume'],
    ['Season', attribute(variation, 'season').join(' · '), 'leaf'],
  ].filter(([, value]) => value);
  if (!specs.length && !occasions.length) return null;
  return (
    <section className="v-pdp-profile" aria-label="Fragrance profile">
      {specs.length > 0 && <dl className="v-pdp-profile__stats">
        {specs.map(([label, value, icon]) => <div key={label}>
          <dt><BrandIcon name={icon} size={16} />{label}</dt><dd>{value}</dd>
        </div>)}
      </dl>}
      {occasions.length > 0 && <div className="v-pdp-profile__occasions">
        <h2>Suggested occasions</h2>
        <ul>{occasions.map((occasion) => <li key={occasion}>{occasion}</li>)}</ul>
      </div>}
    </section>
  );
}

export async function generateMetadata({ params }) {
  const product = await getProductBySlug(params.slug, { fresh: false });
  if (!product) return { title: 'Fragrance not found — Velmique', robots: { index: false, follow: true } };
  // Per-product SEO from the dashboard wins; the product copy is the fallback.
  const seo = product.raw?.seo || product.raw?.ProductSEO || {};
  const title = seo.metaTitle || `${product.name} — Velmique Maison de Parfum`;
  const description = seo.metaDescription || (product.description || '').slice(0, 160) || `${product.name} — eau de parfum by Velmique.`;
  const meta = pageMeta({
    title,
    description,
    path: seo.canonicalUrl || `/product/${product.slug}`,
    image: seo.ogImage || product.images?.[0],
  });
  meta.openGraph.title = seo.ogTitle || title;
  meta.openGraph.description = seo.ogDescription || description;
  return meta;
}

export default async function MaisonProduct({ params }) {
  const product = await getProductBySlug(params.slug, { fresh: false });

  if (!product) {
    return (
      <section className="m-section"><div className="m-wrap" style={{ textAlign: 'center' }}>
        <span className="m-eyebrow">Not found</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '14px 0 18px' }}>This scent has drifted away.</h1>
        <p style={{ color: 'var(--m-ink-soft)', marginBottom: 24 }}>We couldn&rsquo;t find that fragrance. Explore the full maison instead.</p>
        <Link className="m-btn m-btn--fill" href="/shop" style={{ justifyContent: 'center' }}>Back to the collection</Link>
      </div></section>
    );
  }

  const reviewsRequest = getProductReviews(product.id, { limit: 6 });
  const catalogRequest = getPublicProducts({ limit: 48 });
  const bundleRequest = getBundleTiers(product.id);
  const mixTiersRequest = getPackTiers();

  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const scentRequest = catalogRequest.then((catalog) => getPdpScent(product, defVar, catalog));
  const stock = defVar?.stock;
  const inStock = product.inStock !== false && (stock == null || stock > 0);
  const audience = audienceOf(defVar);

  const savePct = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  return (
    <div className="v-pdp-page">
      <Suspense fallback={null}>
        <PdpStructuredData product={product} defVar={defVar} inStock={inStock} reviewsRequest={reviewsRequest} />
      </Suspense>
      <TrackEvent
        event="ViewContent"
        eventKey={product.id}
        params={{
          content_ids: [String(product.id)],
          content_type: 'product',
          content_name: product.name,
          value: Number(product.price || 0),
          currency: 'INR',
          contents: [{ id: String(product.id), quantity: 1 }],
        }}
      />
      <div className="m-pdpwrap"><div className="m-wrap">
        <nav className="m-crumb" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / <span aria-current="page">{product.name}</span></nav>
        <div className="m-pdp">
          <PdpGallery images={(product.images || []).slice(0, 6)} name={product.name} />
          <div className="v-pdp-summary">
            {product.badge ? <span className="m-eyebrow">{product.badge}</span> : null}
            <h1 className="m-pdp__title">{product.name}</h1>
            <p className="v-pdp-kind">
              Eau de Parfum {defVar?.size && <small className="v-pdp-volume">{defVar.size}</small>}
              {audience && <small className="v-pdp-volume v-pdp-audience"><BrandIcon name="user" size={14} />{audience}</small>}
            </p>
            <Suspense fallback={<RatingLine rating={product.rating || 0} reviewCount={product.reviews || 0} />}>
              <PdpRating product={product} request={reviewsRequest} />
            </Suspense>
            <div className="v-pdp-offer">
              <div>
                <div className="m-pdp__price">
                  <b>{inr(product.price)}</b>
                  {product.originalPrice > product.price && <s>{inr(product.originalPrice)}</s>}
                  {savePct > 0 && <span className="m-save">Save {savePct}%</span>}
                </div>
                <p className="m-tax">Inclusive of all taxes</p>
              </div>
              <span className={`m-stockbadge${inStock ? '' : ' out'}`}>
                <BrandIcon name={inStock ? 'check' : 'close'} size={14} />
                {inStock ? (stock != null && stock <= 5 ? `Only ${stock} left` : 'In stock') : 'Out of stock'}
              </span>
            </div>
            <PdpFragranceProfile variation={defVar} slug={product.slug} />
            <Suspense fallback={
              <SkRegion label="Loading purchase options…" style={{ marginTop: 16 }}>
                <Sk h={42} r={8} />
                <Sk h={52} r={8} style={{ marginTop: 10 }} />
              </SkRegion>
            }>
              <PdpPurchase product={product} defVar={defVar} bundleRequest={bundleRequest}
                mixTiersRequest={mixTiersRequest} catalogRequest={catalogRequest} scentRequest={scentRequest} />
            </Suspense>
          </div>
        </div>
        <PdpDescription product={product} />
      </div></div>

      <Suspense fallback={null}><PdpScentStory product={product} defVar={defVar} scentRequest={scentRequest} /></Suspense>
      <Suspense fallback={null}><PdpReviews product={product} request={reviewsRequest} /></Suspense>
      <Suspense fallback={null}><PdpFaq productId={product.id} /></Suspense>
      <Suspense fallback={null}><PdpRelated productId={product.id} /></Suspense>
    </div>
  );
}

function PdpDescription({ product }) {
  const html = /<[a-z][\s\S]*>/i.test(product.descriptionHtml) ? sanitizeRich(product.descriptionHtml) : '';
  if (!html && !product.description) return null;

  return (
    <section className="v-detail-section v-product-description" aria-labelledby="pdp-description">
      <h2 id="pdp-description">Product description</h2>
      {html ? (
        <ProductDescription className="m-desc-rich" html={html} />
      ) : (
        <p className="m-desc-rich">{product.description}</p>
      )}
    </section>
  );
}

const cardDetails = ({ rating, reviews, originalPrice, badge }) => ({ rating, reviews, originalPrice, badge });

async function PdpPurchase({ product, defVar, bundleRequest, mixTiersRequest, catalogRequest, scentRequest }) {
  const packs = await bundleRequest;
  const { id, name, slug, defaultVariationId, inStock, price, sizes, images } = product;
  const variations = product.variations.map((variation) => ({
    id: variation.id, size: variation.size, sku: variation.sku, price: variation.price,
    images: variation.images?.slice(0, 1), inStock: variation.inStock, stock: variation.stock,
  }));
  const purchaseProduct = {
    ...cardDetails(product), id, name, slug, defaultVariationId, inStock, price, sizes, images: images.slice(0, 1), variations,
  };
  const initialNotes = getPdpScent(product, defVar, { products: [] }).fragranceNotes;
  const notes = (
    <Suspense fallback={<PdpFragranceNotes notes={initialNotes} />}>
      <PdpEnrichedNotes request={scentRequest} />
    </Suspense>
  );
  const mixPack = !packs.length && (defVar ? defVar.inStock !== false : inStock !== false) ? (
    <Suspense fallback={null}>
      <PdpMixPurchase product={purchaseProduct} defVar={defVar}
        tiersRequest={mixTiersRequest} catalogRequest={catalogRequest} />
    </Suspense>
  ) : null;
  return <PdpBuy product={purchaseProduct} packs={packs} notes={notes} mixPack={mixPack} />;
}

async function PdpEnrichedNotes({ request }) {
  const { fragranceNotes } = await request;
  return <PdpFragranceNotes notes={fragranceNotes} />;
}

async function PdpMixPurchase({ product, defVar, tiersRequest, catalogRequest }) {
  const tiers = await tiersRequest;
  if (!tiers.length) return null;

  const catalog = await catalogRequest;
  const scents = catalog.products
    .filter((scent) => String(scent.id) !== String(product.id) && scent.inStock !== false && scent.defaultVariationId)
    .map((scent) => {
      const variation = scent.variations.find((v) => String(v.id) === String(scent.defaultVariationId));
      return {
        ...cardDetails(scent),
        id: scent.id, name: scent.name, slug: scent.slug, defaultVariationId: scent.defaultVariationId,
        price: scent.price, sizes: [variation?.size || scent.sizes[0]], images: scent.images.slice(0, 1),
      };
    });
  const current = {
    ...product,
    price: Number(defVar?.price ?? product.price) || 0,
    sizes: [defVar?.size || defVar?.sku || product.sizes?.[0] || 'One Size'],
  };
  return <PdpMixPack key={product.id} current={current} scents={scents} tiers={tiers} />;
}

function summarizeReviews(product, reviewsRes) {
  const reviews = reviewsRes?.reviews || [];
  const reviewCount = reviewsRes?.pagination?.total || product.reviews || reviews.length;
  const rating = product.rating || reviewsRes?.stats?.average || 0;
  return { reviews, reviewCount, rating };
}

function RatingLine({ rating, reviewCount }) {
  return (
    <div className="m-pdp__rate"><span className="m-stars">{stars(rating)}</span> <b>{Number(rating).toFixed(1)}</b> <span>{reviewCount.toLocaleString('en-IN')} reviews</span></div>
  );
}

async function PdpRating({ product, request }) {
  const { rating, reviewCount } = summarizeReviews(product, await request);
  return <RatingLine rating={rating} reviewCount={reviewCount} />;
}

async function PdpStructuredData({ product, defVar, inStock, reviewsRequest }) {
  const { rating, reviewCount } = summarizeReviews(product, await reviewsRequest);
  const url = absUrl(`/product/${product.slug}`);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: (product.description || '').slice(0, 500),
      image: (product.images || []).slice(0, 6),
      sku: defVar?.sku || String(product.id),
      brand: { '@type': 'Brand', name: 'Velmique' },
      ...(product.category ? { category: product.category } : {}),
      ...(rating > 0 && reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(rating).toFixed(1), reviewCount } } : {}),
      offers: (product.variations?.length ? product.variations : [{ id: product.id, price: product.price, inStock }]).map((v) => ({
        '@type': 'Offer',
        url,
        sku: v.sku || String(v.id),
        priceCurrency: 'INR',
        price: Number(v.price || product.price || 0),
        availability: v.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: absUrl('/shop') },
        { '@type': 'ListItem', position: 3, name: product.name, item: url },
      ],
    },
  ];

  return jsonLd.map((obj, i) => (
    <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
  ));
}

function getPdpScent(product, defVar, catalog) {
  const attrImgs = defVar?.attrImages || {};
  const notePhotos = new Map();
  const rememberPhotos = (notes = []) => {
    for (const { name, image } of notes) {
      const key = noteKey(name);
      if (image && !notePhotos.has(key)) notePhotos.set(key, image);
    }
  };
  rememberPhotos(defVar?.noteItems);
  rememberPhotos(product.notes);
  product.variations.forEach((variation) => rememberPhotos(variation.noteItems));
  // Reuse the same ingredient photo from the Velmique catalog when this
  // product has none attached. Only match the full note name.
  catalog.products.filter((item) => item.id !== product.id).forEach((item) => {
    rememberPhotos(item.notes);
    item.variations.forEach((variation) => rememberPhotos(variation.noteItems));
  });
  const withPhoto = (item) => ({ ...item, image: item.image || notePhotos.get(noteKey(item.name)) || '' });
  const notes = (defVar?.noteItems?.length ? defVar.noteItems : product.notes).map(withPhoto);

  const noteTiers = ['Top', 'Heart', 'Base'].map((label) => {
    const tier = defVar?.noteTiers?.find((group) => group.label === label)
      || product.noteTiers.find((group) => group.label === label);
    return { label, items: (tier?.items || []).map(withPhoto) };
  }).filter(({ items }) => items.length);
  return buildScentExperience({ slug: product.slug, tiers: noteTiers, notes, attrImages: attrImgs, descriptions: defVar?.scentDescriptions });
}

function PdpFragranceNotes({ notes }) {
  if (!notes.length) return null;
  return (
    <section className="v-scent__gallery" aria-labelledby="pdp-fragrance-notes">
      <h2 id="pdp-fragrance-notes">Fragrance Notes</h2>
      <ul className="v-scent__notes" role="list" aria-labelledby="pdp-fragrance-notes" tabIndex={0}>
        {notes.map(({ name, image }) => (
          <li key={name}>
            <span className="v-scent__note-photo" aria-hidden="true">
              <BrandIcon name="leaf" size={24} />
              {image && <NotePhoto image={image} width={216} widths={[112, 216, 300]} sizes="112px" natural={false} />}
            </span>
            <span className="v-scent__note-name">{name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function PdpScentStory({ product, defVar, scentRequest }) {
  const { phases } = await scentRequest;
  const attrs = defVar?.attributes || {};
  const attrImgs = defVar?.attrImages || {};
  // Editorial sections (reference style) from any NEW attribute key the admin
  // adds — e.g. "Smells Like", "Makes You Feel", "Inspiration". A single long
  // value renders as prose over its image; short values render as word pills
  // (each with its uploaded image when one exists). Keys already shown in
  // their own sections are excluded.
  const KNOWN_ATTRS = new Set(['notes', 'main accords', 'accords', 'longevity (hrs)', 'longevity', 'sillage', 'best for', 'season', 'gender', 'target gender', 'audience', 'occasion', 'occasions', 'wear occasion', 'size', 'volume', 'color', 'material', 'concentration',
    'top notes', 'top note', 'top', 'heart notes', 'heart note', 'middle notes', 'middle note', 'heart', 'middle', 'base notes', 'base note', 'base']);

  const editorial = Object.entries(attrs)
    .filter(([k, v]) => !isScentExperienceAttribute(k) && !KNOWN_ATTRS.has(noteKey(k.replace(/[_-]+/g, ' '))) && Array.isArray(v) && v.length)
    .map(([k, v]) => {
      const imgMap = attrImgs[k] || attrImgs[String(k).toLowerCase()] || {};
      const raw = v.map((s) => String(s).trim()).filter(Boolean);
      if (raw.length === 1 && raw[0].length > 50) {
        return { key: k, prose: raw[0], image: imgMap[raw[0]] || Object.values(imgMap)[0] || '' };
      }
      const items = raw.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean)
        .map((name) => ({ name, image: imgMap[name] || '' }));
      return items.length ? { key: k, items } : null;
    })
    .filter(Boolean);

  return (
    <div className="m-wrap v-product-story">
      <ScentExperience name={product.name} phases={phases}
        accords={attribute(defVar, 'main accords', 'accords').slice(0, 3)} />
      {editorial.map((section) => (
        <section className="v-detail-section" key={section.key}>
          <h2>{section.key}</h2>
          {section.prose ? (
            <div className={section.image ? 'v-detail-feature' : undefined}>
              {section.image && <NotePhoto image={section.image} width={640} />}
              <p className="v-detail-caption">{section.prose}</p>
            </div>
          ) : section.items.some(({ image }) => image) ? (
            <div className="v-detail-media">
              {section.items.map(({ name, image }) => (
                <figure key={name}>
                  {image && <NotePhoto image={image} width={300} />}
                  <figcaption>{name}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="v-detail-caption">{section.items.map(({ name }) => name).join(' · ')}</p>
          )}
        </section>
      ))}
    </div>
  );
}

async function PdpReviews({ product, request }) {
  const { reviews, reviewCount, rating } = summarizeReviews(product, await request);
  const renderReview = (v, i) => {
    const name = v.reviewerName || v.guestName || v.name || 'Customer';
    const photos = (v.ReviewImages || []).filter((photo) => photo.fileType === 'image' && /^https?:\/\//i.test(photo.url || '')).slice(0, 4);
    return (
      <div className="m-rev" key={v.id || i}>
        <div className="m-stars">{stars(v.rating)}</div>
        <q>{v.review || v.comment}</q>
        {photos.length > 0 && <ul className="v-review-photos" aria-label="Customer photos">
          {photos.map((photo, index) => <li key={photo.id || index}>
            <NotePhoto image={photo.url} width={240} alt={`${product.name} in ${name}’s review, photo ${index + 1}`} natural={false} />
          </li>)}
        </ul>}
        <div className="m-rev__by">
          <span className="m-rev__av" style={{ background: AV[(typeof i === 'number' ? i : 0) % AV.length] }}>{name[0]}</span>
          <span><b>{name}</b>{v.verified_purchase ? <small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Verified Buyer</small> : null}</span>
        </div>
      </div>
    );
  };

  return reviews.length ? (
    <section className="m-section m-later" id="reviews"><div className="m-wrap">
      <div className="m-revhead">
        <div><span className="m-eyebrow">Customer reviews</span><h2>Real Reviews</h2></div>
        <div className="m-revscore"><b>{Number(rating).toFixed(1)}</b><span><span className="m-stars" aria-label={`${Number(rating).toFixed(1)} out of 5`}>{stars(rating)}</span><br /><small>Based on {reviewCount.toLocaleString('en-IN')} reviews</small></span></div>
        <WriteReview productId={product.id} productName={product.name} />
      </div>
      <div className="v-detail-reviews">
        {reviews.map(renderReview)}
      </div>
    </div></section>
  ) : (
    <section className="m-section m-later" id="reviews" style={{ paddingBottom: 0 }}><div className="m-wrap">
      <div className="m-empty">
        <h3>No reviews yet</h3>
        <p style={{ marginBottom: 20 }}>Tried {product.name}? Be the first to tell others how it wears.</p>
        <WriteReview productId={product.id} productName={product.name} label="Write the first review" />
      </div>
    </div></section>
  );
}

async function PdpFaq({ productId }) {
  const [productFaqs, globalFaqs] = await Promise.all([getFaqs('product', productId), getFaqs('global')]);
  return <FaqSection className="m-later" faqs={productFaqs.length ? productFaqs : globalFaqs} />;
}

async function PdpRelated({ productId }) {
  const bestsellers = await getBestsellers(5);
  const related = bestsellers.filter((product) => String(product.id) !== String(productId)).slice(0, 4);
  return related.length ? (
    <section className="m-section m-later" style={{ paddingTop: 0 }}><div className="m-wrap">
      <div className="m-shead"><span className="m-eyebrow">You may also like</span><h2>Complete Your Collection.</h2></div>
      <div className="m-pgrid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </div></section>
  ) : null;
}
