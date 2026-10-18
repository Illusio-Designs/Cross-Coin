import Link from 'next/link';
import { getProductBySlug, getBestsellers } from '@/lib/api/products';
import { getProductReviews } from '@/lib/api/reviews';
import { getFaqs } from '@/lib/api/faqs';
import { getPackTiers, getBundleTiers } from '@/lib/api/bundles';
import ProductCard from '../../_components/ProductCard';
import PdpBuy from '../../_components/PdpBuy';
import DeliveryCheck from '../../_components/DeliveryCheck';
import ReviewRow from '../../_components/ReviewRow';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const stars = (r) => { const n = Math.round(Number(r) || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };
const AV = ['#b85f6e', '#866027', '#7a3b3f', '#4a6b4f', '#9a6b2e', '#6e4a7a'];
const NOTE_TINTS = ['#e5a84f', '#f0b98a', '#cdd79a', '#c0455f', '#7fa05a', '#e7ddc9', '#d9a0c4', '#8a6a46'];
const PROF_TINTS = ['#e5a84f', '#e7b86a', '#e7ddc9', '#ecd8c4', '#9fc07a', '#c58c84'];

/* Pull an attribute from the default variation as a clean token list, splitting
   comma-joined values (the backend stores "Fruity, Sweet, Musky" as one string). */
function tokens(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean);
}

export async function generateMetadata({ params }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Not found — Velmique' };
  const seo = product.raw?.seo || {};
  return {
    title: seo.metaTitle || `${product.name} — Velmique Maison de Parfum`,
    description: seo.metaDescription || product.description?.slice(0, 160),
    openGraph: {
      title: seo.ogTitle || seo.metaTitle || product.name,
      description: seo.ogDescription || seo.metaDescription || '',
      images: seo.ogImage ? [seo.ogImage] : (product.images?.[0] ? [product.images[0]] : []),
    },
  };
}

export default async function MaisonProduct({ params }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return (
      <section className="m-section"><div className="m-wrap" style={{ textAlign: 'center' }}>
        <span className="m-eyebrow">Not found</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '14px 0 18px' }}>This scent has drifted away.</h1>
        <p style={{ color: 'var(--m-ink-soft)', marginBottom: 24 }}>We couldn&rsquo;t find that fragrance. Explore the full maison instead.</p>
        <Link className="m-btn m-btn--fill" href="/test" style={{ justifyContent: 'center' }}>Back to the collection</Link>
      </div></section>
    );
  }

  const [reviewsRes, bestsellers, productFaqs, globalFaqs, packTiers, productPacks] = await Promise.all([
    getProductReviews(product.id, { limit: 30 }),
    getBestsellers(5),
    getFaqs('product', product.id),
    getFaqs('global'),
    getPackTiers(),
    getBundleTiers(product.id),
  ]);
  const packPicks = (bestsellers || []).filter((p) => String(p.id) !== String(product.id)).slice(0, 8);
  // Admin-managed FAQs from the backend: prefer this product's own (+ brand-wide
  // "all products") FAQs, fall back to the site-wide global set.
  const faqs = productFaqs.length ? productFaqs : globalFaqs;

  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const attrs = defVar?.attributes || {};
  const stock = defVar?.stock;
  const inStock = product.inStock !== false && (stock == null || stock > 0);

  const accords = tokens(attrs['main accords'] || attrs['accords']);
  // Accord orbs, image-aware: each accord may carry an uploaded image via the
  // variation's reserved `_images` map (falls back to the tinted orb when absent).
  const accordItems = (defVar?.accordItems?.length ? defVar.accordItems : accords.map((a) => ({ name: a, image: '' }))).slice(0, 5);
  // Fragrance notes, image-aware. Prefer the per-VARIATION notes (name + optional
  // image from attributes._images.notes); fall back to product-level notes
  // ({name,image}) for older products, then to plain variation note names.
  const notesWithImg = defVar?.noteItems?.length ? defVar.noteItems : (product.notes || []);
  const noteNames = notesWithImg.length ? [] : tokens(attrs['notes']);

  const spec = [
    ['Longevity', tokens(attrs['longevity (hrs)'] || attrs['longevity']).map((h) => `${h} hrs`).join(', ')],
    ['Sillage', tokens(attrs['sillage']).join(', ')],
    ['Best for', tokens(attrs['best for']).join(', ')],
    ['Season', tokens(attrs['season']).join(' · ')],
    ['Gender', tokens(attrs['gender']).join(', ')],
    ['Concentration', 'Eau de Parfum'],
  ].filter(([, v]) => v);
  if (defVar?.size) spec.push(['Size', defVar.size]);

  const reviews = reviewsRes?.reviews || [];
  const reviewCount = reviewsRes?.pagination?.total || product.reviews || reviews.length;
  const rating = product.rating || reviewsRes?.stats?.average || 0;
  const savePct = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  const related = (bestsellers || []).filter((p) => String(p.id) !== String(product.id)).slice(0, 4);

  // Reviews wall (Morbix pattern): split the sample into three rows that scroll
  // in alternating directions for a moving "wall of reviews" look.
  const rList = reviews.slice(0, 30);
  const rPer = Math.ceil(rList.length / 3) || 1;
  const reviewRows = [rList.slice(0, rPer), rList.slice(rPer, rPer * 2), rList.slice(rPer * 2)].filter((r) => r.length);
  const reviewDirs = ['left', 'right', 'left'];
  const renderReview = (v, i) => {
    const name = v.reviewerName || v.name || 'Verified Buyer';
    return (
      <div className="m-rev" key={v.id || i}>
        <div className="m-stars">{stars(v.rating)}</div>
        <q>{v.review || v.comment}</q>
        <div className="m-rev__by">
          <span className="m-rev__av" style={{ background: AV[(typeof i === 'number' ? i : 0) % AV.length] }}>{name[0]}</span>
          <span><b>{name}</b><small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>Verified Buyer</small></span>
        </div>
      </div>
    );
  };


  return (
    <>
      <div className="m-pdpwrap"><div className="m-wrap">
        <nav className="m-crumb"><Link href="/test">Home</Link> / <Link href="/shop">Shop</Link> / <span>{product.name}</span></nav>
        <div className="m-pdp">
          {/* Stacked scroll gallery: each image pins at the top of the column,
              and the next one slides up OVER it as the right content scrolls.
              Falls back to a horizontal swipe strip on small screens. */}
          <div className="m-gstack">
            {(product.images || []).slice(0, 6).map((src, i) => (
              <div className="m-gshot" key={i}>
                <img src={src} alt={`${product.name} — view ${i + 1}`} loading={i ? 'lazy' : 'eager'} />
              </div>
            ))}
          </div>
          <div>
            {product.badge ? <span className="m-eyebrow">{product.badge}</span> : null}
            <h1 className="m-pdp__title">{product.name}<span>Eau de Parfum{defVar?.size ? ` · ${defVar.size}` : ''}</span></h1>
            <div className="m-pdp__rate"><span className="m-stars">{stars(rating)}</span> <b>{Number(rating).toFixed(1)}</b> <span>{reviewCount.toLocaleString('en-IN')} reviews</span></div>
            <div className="m-pdp__price"><b>{inr(product.price)}</b>{product.originalPrice ? <s>{inr(product.originalPrice)}</s> : null}{savePct ? <span className="m-save">SAVE {savePct}%</span> : null}</div>
            <p className="m-tax">Inclusive of all taxes</p>

            <div className="m-ship">
              {inStock
                ? <span className="m-stockbadge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>{stock != null && stock <= 5 ? `Only ${stock} left` : 'In stock'}</span>
                : <span className="m-stockbadge out"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>Out of stock</span>}
              <span className="m-shipfree"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/></svg><strong>Free shipping</strong> on all orders</span>
            </div>

            <PdpBuy product={product} packs={productPacks} mixTiers={packTiers} scents={packPicks} />

            <DeliveryCheck />

            {/* About — in the right column */}
            <div className="m-rsec">
              <span className="m-eyebrow">Details</span>
              <h2 className="m-rsec__h">About this fragrance</h2>
              {(product.descriptionHtml && /<[a-z][\s\S]*>/i.test(product.descriptionHtml))
                ? <div className="m-desc-rich" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
                : product.description ? <p className="m-rsec__p">{product.description}</p> : <p className="m-rsec__p">No description available for this fragrance yet.</p>}
            </div>

            {/* Specifications — in the right column */}
            {spec.length ? (
              <div className="m-rsec">
                <span className="m-eyebrow">Specifications</span>
                <h2 className="m-rsec__h">The details</h2>
                <aside className="m-specs" style={{ marginTop: 14 }}>
                  <dl>{spec.map(([k, v]) => <div className="m-spec-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                </aside>
              </div>
            ) : null}

            {/* Scent Profile — in the right column */}
            {accords.length ? (
              <div className="m-rsec">
                <span className="m-eyebrow">What you&apos;ll notice</span>
                <h2 className="m-rsec__h">How It Smells</h2>
                <div className="m-profilegrid" style={{ marginTop: 18 }}>
                  {accordItems.map((a, i) => {
                    const v = Math.max(3, 5 - i);
                    return (
                      <div className="m-prof" key={a.name + i}>
                        <div
                          className="ring"
                          style={a.image ? { overflow: 'hidden' } : { background: `radial-gradient(circle at 35% 30%,#ffffffcc,${PROF_TINTS[i % PROF_TINTS.length]})` }}
                        >
                          {a.image ? <img src={a.image} alt={a.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                        </div>
                        <b>{a.name}</b>
                        <div className="dots">{'●'.repeat(v)}{'○'.repeat(5 - v)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Composition — in the right column, dark card */}
            {(notesWithImg.length || noteNames.length) ? (
              <div className="m-rsec">
                <div className="m-rcompo">
                  <span className="m-eyebrow" style={{ color: 'var(--m-accent-soft)' }}>What&apos;s inside</span>
                  <h2 className="m-rsec__h" style={{ color: '#F3E7D5' }}>Fragrance Notes</h2>
                  <div className="m-pnotegrid" style={{ marginTop: 18 }}>
                    {(notesWithImg.length ? notesWithImg : noteNames.map((n) => ({ name: n, image: '' }))).map((n, i) => (
                      <div className="m-pn" key={n.name + i}>
                        <div className="orb" style={n.image ? undefined : { background: `radial-gradient(circle at 34% 28%,#ffffffcc,${NOTE_TINTS[i % NOTE_TINTS.length]})` }}>
                          {n.image ? <img src={n.image} alt={n.name} loading="lazy" /> : null}
                        </div>
                        <b>{n.name}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div></div>

      {/* Reviews */}
      {reviews.length ? (
        <section className="m-section"><div className="m-wrap">
          <div className="m-revhead">
            <div><span className="m-eyebrow">Customer reviews</span><h2 style={{ fontSize: 'clamp(28px,4vw,42px)', marginTop: 8 }}>Loved &amp; Verified.</h2></div>
            <div className="m-revscore"><b>{Number(rating).toFixed(1)}</b><span><span className="m-stars">{stars(rating)}</span><br /><small>Based on {reviewCount.toLocaleString('en-IN')} reviews</small></span></div>
          </div>
          <div className="m-rvwall">
            {reviewRows.map((row, idx) => (
              <ReviewRow
                key={idx}
                items={row}
                staticClassName="m-revs"
                min={4}
                direction={reviewDirs[idx]}
                render={renderReview}
              />
            ))}
          </div>
        </div></section>
      ) : null}

      {/* FAQ — admin-managed, from the backend */}
      {faqs.length ? (
        <section className="m-section" style={{ paddingTop: 0 }}><div className="m-wrap">
          <div className="m-shead" style={{ textAlign: 'left', margin: '0 0 24px' }}><span className="m-eyebrow">Good to know</span><h2>Frequently Asked Questions</h2></div>
          <div className="m-faq">
            {faqs.map((f) => (
              <details key={f.id}>
                <summary>{f.question}</summary>
                <div className="m-faq__a" dangerouslySetInnerHTML={{ __html: f.answer || '' }} />
              </details>
            ))}
          </div>
        </div></section>
      ) : null}

      {/* You may also like */}
      {related.length ? (
        <section className="m-section" style={{ paddingTop: 0 }}><div className="m-wrap">
          <div className="m-shead"><span className="m-eyebrow">You may also like</span><h2>Complete Your Collection.</h2></div>
          <div className="m-pgrid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div></section>
      ) : null}
    </>
  );
}
