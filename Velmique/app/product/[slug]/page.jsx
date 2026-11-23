import ScentExperience from '@/components/product/ScentExperience';
import Link from 'next/link';
import { richHtml } from '@/lib/sanitizeHtml';
import { SITE_URL, absUrl, pageMeta } from '@/lib/site';
import { ik } from '@/lib/imagekit';
import { getProductBySlug, getBestsellers, getPublicProducts, noteKey } from '@/lib/api/products';
import { getProductReviews } from '@/lib/api/reviews';
import { getFaqs } from '@/lib/api/faqs';
import { getBundleTiers, getPackTiers } from '@/lib/api/bundles';
import ProductCard from '../../_components/ProductCard';
import PdpBuy from '../../_components/PdpBuy';
import DescriptionHtml from '@/components/product/DescriptionHtml';
import PdpGallery from '../../_components/PdpGallery';
import DeliveryCheck from '../../_components/DeliveryCheck';
import WriteReview from '../../_components/WriteReview';
import TrackEvent from '../../_components/TrackEvent';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const stars = (r) => { const n = Math.round(Number(r) || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };
const AV = ['#b85f6e', '#866027', '#7a3b3f', '#4a6b4f', '#9a6b2e', '#6e4a7a'];


/* Pull an attribute from the default variation as a clean token list, splitting
   comma-joined values (the backend stores "Fruity, Sweet, Musky" as one string). */
function tokens(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean);
}

export async function generateMetadata({ params }) {
  const product = await getProductBySlug(params.slug);
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
  const product = await getProductBySlug(params.slug);

  // Soft not-found (noindex via generateMetadata) rather than notFound(): the
  // detail fetch is uncached, so a transient API failure must not get a 404
  // cached against a real product URL.
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

  const [reviewsRes, bestsellers, productFaqs, globalFaqs, productPacks, catalog, packTiers] = await Promise.all([
    getProductReviews(product.id, { limit: 30 }),
    getBestsellers(5),
    getFaqs('product', product.id),
    getFaqs('global'),
    getBundleTiers(product.id),
    getPublicProducts({ limit: 48 }),
    getPackTiers(),
  ]);

  // Admin-managed FAQs from the backend: prefer this product's own (+ brand-wide
  // "all products") FAQs, fall back to the site-wide global set.
  const faqs = productFaqs.length ? productFaqs : globalFaqs;

  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const attrs = defVar?.attributes || {};
  const stock = defVar?.stock;
  const inStock = product.inStock !== false && (stock == null || stock > 0);

  const accords = tokens(attrs['main accords'] || attrs['accords']);
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

  const spec = [
    ['Longevity', tokens(attrs['longevity (hrs)'] || attrs['longevity']).map((h) => `${h} hrs`).join(', ')],
    ['Sillage', tokens(attrs['sillage']).join(', ')],
    ['Best for', tokens(attrs['best for']).join(', ')],
    ['Season', tokens(attrs['season']).join(' · ')],
    ['Gender', tokens(attrs['gender']).join(', ')],
    ['Concentration', 'Eau de Parfum'],
  ].filter(([, v]) => v);
  if (defVar?.size) spec.push(['Size', defVar.size]);

  // Editorial sections (reference style) from any NEW attribute key the admin
  // adds — e.g. "Smells Like", "Makes You Feel", "Inspiration". A single long
  // value renders as prose over its image; short values render as word pills
  // (each with its uploaded image when one exists). Keys already shown in
  // their own sections are excluded.
  const KNOWN_ATTRS = new Set(['notes', 'main accords', 'accords', 'longevity (hrs)', 'longevity', 'sillage', 'best for', 'season', 'gender', 'size', 'volume', 'color', 'material', 'concentration',
    'top notes', 'top note', 'top', 'heart notes', 'heart note', 'middle notes', 'middle note', 'heart', 'middle', 'base notes', 'base note', 'base']);
  const attrImgs = defVar?.attrImages || {};

  const noteTiers = ['Top', 'Heart', 'Base'].map((label) => {
    const tier = defVar?.noteTiers?.find((group) => group.label === label)
      || product.noteTiers.find((group) => group.label === label);
    return { label, items: (tier?.items || []).map(withPhoto) };
  }).filter(({ items }) => items.length);
  const editorial = Object.entries(attrs)
    .filter(([k, v]) => !KNOWN_ATTRS.has(noteKey(k.replace(/[_-]+/g, ' '))) && Array.isArray(v) && v.length)
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

  const reviews = reviewsRes?.reviews || [];
  const reviewCount = reviewsRes?.pagination?.total || product.reviews || reviews.length;
  const rating = product.rating || reviewsRes?.stats?.average || 0;
  const savePct = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  const related = (bestsellers || []).filter((p) => String(p.id) !== String(product.id)).slice(0, 4);

  const renderReview = (v, i) => {
    const name = v.reviewerName || v.guestName || v.name || 'Customer';
    return (
      <div className="m-rev" key={v.id || i}>
        <div className="m-stars">{stars(v.rating)}</div>
        <q>{v.review || v.comment}</q>
        <div className="m-rev__by">
          <span className="m-rev__av" style={{ background: AV[(typeof i === 'number' ? i : 0) % AV.length] }}>{name[0]}</span>
          <span><b>{name}</b>{v.verified_purchase ? <small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Verified Buyer</small> : null}</span>
        </div>
      </div>
    );
  };


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

  return (
    <div className="v-pdp-page">
      {jsonLd.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
      ))}
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
          {/* Stacked scroll gallery: each image pins at the top of the column,
              and the next one slides up OVER it as the right content scrolls.
              Falls back to a horizontal swipe strip on small screens. */}
          <PdpGallery images={(product.images || []).slice(0, 6)} name={product.name} />
          <div>
            {product.badge ? <span className="m-eyebrow">{product.badge}</span> : null}
            <h1 className="m-pdp__title">{product.name}<span>Eau de Parfum{defVar?.size ? ` · ${defVar.size}` : ''}</span></h1>
            <div className="m-pdp__rate"><span className="m-stars">{stars(rating)}</span> <b>{Number(rating).toFixed(1)}</b> <span>{reviewCount.toLocaleString('en-IN')} reviews</span></div>
            <div className="m-pdp__price"><b>{inr(product.price)}</b>{product.originalPrice ? <s>{inr(product.originalPrice)}</s> : null}{savePct ? <span className="m-save">SAVE {savePct}%</span> : null}</div>
            {product.description ? <p className="v-product-intro">{product.description.replace(/<[^>]*>/g, '').slice(0, 220)}</p> : null}
            <p className="m-tax">Inclusive of all taxes</p>

            <div className="m-ship">
              {inStock
                ? <span className="m-stockbadge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>{stock != null && stock <= 5 ? `Only ${stock} left` : 'In stock'}</span>
                : <span className="m-stockbadge out"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>Out of stock</span>}
              <span className="m-shipfree"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/></svg><strong>Free shipping</strong> on all orders</span>
            </div>

            <PdpBuy product={product} packs={productPacks} mixTiers={packTiers} scents={catalog.products} />


            <DeliveryCheck />


          </div>
        </div>
      </div></div>

      <div className="m-wrap v-product-story"><ScentExperience name={product.name} tiers={noteTiers} notes={notes} accords={accords} spec={spec.filter(([key]) => ['Best for','Season','Sillage','Longevity'].includes(key))} />
        {editorial.map(sec=><section className="v-detail-section" key={sec.key}><h2>{sec.key}</h2>{sec.prose ? <p className="v-detail-caption">{sec.prose}</p> : <p className="v-detail-caption">{sec.items.map(it=>it.name).join(' · ')}</p>}</section>)}
        <details className="v-description"><summary>About this fragrance</summary>{product.descriptionHtml ? <DescriptionHtml className="m-desc-rich" html={richHtml(product.descriptionHtml).dangerouslySetInnerHTML.__html} /> : <p>{product.description || 'Explore the notes and composition of this fragrance above.'}</p>}</details>
      </div>

      {/* Reviews — the wall when there are any, and always a way to write one
          (also opened by the WhatsApp review-request link, ?review=open). */}
      {reviews.length ? (
        <section className="m-section m-later" id="reviews"><div className="m-wrap">
          <div className="m-revhead">
            <div><span className="m-eyebrow">Customer reviews</span><h2>Real Reviews</h2></div>
            <div className="m-revscore"><b>{Number(rating).toFixed(1)}</b><span><span className="m-stars" aria-label={`${Number(rating).toFixed(1)} out of 5`}>{stars(rating)}</span><br /><small>Based on {reviewCount.toLocaleString('en-IN')} reviews</small></span></div>
            <WriteReview productId={product.id} productName={product.name} />
          </div>
          <div className="v-detail-reviews">
            {reviews.slice(0,6).map(renderReview)}
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
      )}

      {/* FAQ — admin-managed, from the backend */}
      {faqs.length ? (
        <section className="m-section m-later v-pdp-faq"><div className="m-wrap">
          <div className="m-shead"><span className="m-eyebrow">Good to know</span><h2>Frequently Asked Questions</h2></div>
          <div className="m-faq">
            {faqs.map((f) => (
              <details key={f.id}>
                <summary>{f.question}</summary>
                <div className="m-faq__a" {...richHtml(f.answer)} />
              </details>
            ))}
          </div>
        </div></section>
      ) : null}

      {/* You may also like */}
      {related.length ? (
        <section className="m-section m-later" style={{ paddingTop: 0 }}><div className="m-wrap">
          <div className="m-shead"><span className="m-eyebrow">You may also like</span><h2>Complete Your Collection.</h2></div>
          <div className="m-pgrid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div></section>
      ) : null}
    </div>
  );
}
