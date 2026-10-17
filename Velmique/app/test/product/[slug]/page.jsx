import Link from 'next/link';
import { getProductBySlug, getBestsellers } from '@/lib/api/products';
import { getProductReviews } from '@/lib/api/reviews';
import ProductCard from '../../_components/ProductCard';
import Gallery from '../../_components/Gallery';
import PdpBuy from '../../_components/PdpBuy';
import DeliveryCheck from '../../_components/DeliveryCheck';

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

  const [reviewsRes, bestsellers] = await Promise.all([
    getProductReviews(product.id, { limit: 12 }),
    getBestsellers(5),
  ]);

  const defVar = (product.variations || []).find((v) => String(v.id) === String(product.defaultVariationId)) || product.variations?.[0] || null;
  const attrs = defVar?.attributes || {};

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

  const WHY = [];
  const longev = tokens(attrs['longevity (hrs)']).join('');
  if (longev) WHY.push(['Long-lasting', `${longev}-hour longevity from a single application.`]);
  if (tokens(attrs['sillage']).length) WHY.push([`${tokens(attrs['sillage'])[0]} Sillage`, 'Projects boldly — noticed the moment you arrive.']);
  if (tokens(attrs['best for']).length) WHY.push(['Day & Night', `Made for ${tokens(attrs['best for']).join(' & ').toLowerCase()}.`]);
  if (tokens(attrs['gender']).length) WHY.push([tokens(attrs['gender'])[0], 'Crafted to be worn and loved by everyone.']);
  while (WHY.length < 4) WHY.push(['Handcrafted', 'Blended in India with rare, responsibly sourced ingredients.']);

  return (
    <>
      <div className="m-pdpwrap"><div className="m-wrap">
        <nav className="m-crumb"><Link href="/test">Home</Link> / <Link href="/shop">Shop</Link> / <span>{product.name}</span></nav>
        <div className="m-pdp">
          <Gallery images={product.images} name={product.name} />
          <div>
            {product.badge ? <span className="m-eyebrow">{product.badge}</span> : null}
            <h1 className="m-pdp__title">{product.name}<span>Eau de Parfum{defVar?.size ? ` · ${defVar.size}` : ''}</span></h1>
            <div className="m-pdp__rate"><span className="m-stars">{stars(rating)}</span> <b>{Number(rating).toFixed(1)}</b> <span>{reviewCount.toLocaleString('en-IN')} reviews</span></div>
            <div className="m-pdp__price"><b>{inr(product.price)}</b>{product.originalPrice ? <s>{inr(product.originalPrice)}</s> : null}{savePct ? <span className="m-save">SAVE {savePct}%</span> : null}</div>
            <p className="m-tax">Inclusive of all taxes</p>

            {accords.length ? (
              <div className="m-opt"><div className="m-opt__h">Main Accords</div>
                <div className="m-accords">{accords.map((a) => <span className="m-accord" key={a}>{a}</span>)}</div>
              </div>
            ) : null}

            <PdpBuy product={product} />

            <DeliveryCheck />
          </div>
        </div>
      </div></div>

      {/* About + Specifications (Morbix-style) */}
      <section className="m-section m-details"><div className="m-wrap m-details__grid">
        <div className="m-about">
          <span className="m-eyebrow">Details</span>
          <h2>About this fragrance</h2>
          {(product.descriptionHtml && /<[a-z][\s\S]*>/i.test(product.descriptionHtml))
            ? <div className="m-desc-rich" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
            : product.description ? <p>{product.description}</p> : <p className="m-muted">No description available for this fragrance yet.</p>}
        </div>
        {spec.length ? (
          <aside className="m-specs">
            <h3>Specifications</h3>
            <dl>{spec.map(([k, v]) => <div className="m-spec-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </aside>
        ) : null}
      </div></section>

      {/* Scent Profile */}
      {accords.length ? (
        <section className="m-section"><div className="m-wrap">
          <div className="m-shead" style={{ textAlign: 'left', margin: '0 0 32px', maxWidth: 660 }}>
            <span className="m-eyebrow">The scent experience</span><h2>Scent Profile</h2>
            <p>A composition built around {accords.slice(0, 3).join(', ').toLowerCase()} — unmistakable the moment you walk in, and lasting all day.</p>
          </div>
          <div className="m-profilegrid">
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
        </div></section>
      ) : null}

      {/* Fragrance notes */}
      {(notesWithImg.length || noteNames.length) ? (
        <section className="m-section m-atelier"><div className="m-wrap">
          <div style={{ marginBottom: 32 }}><span className="m-eyebrow">Fragrance notes</span><h2 style={{ fontSize: 'clamp(28px,4vw,44px)', color: '#F3E7D5', marginTop: 10 }}>The Composition.</h2></div>
          <div className="m-pnotegrid">
            {(notesWithImg.length ? notesWithImg : noteNames.map((n) => ({ name: n, image: '' }))).map((n, i) => (
              <div className="m-pn" key={n.name + i}>
                <div className="orb" style={n.image ? undefined : { background: `radial-gradient(circle at 34% 28%,#ffffffcc,${NOTE_TINTS[i % NOTE_TINTS.length]})` }}>
                  {n.image ? <img src={n.image} alt={n.name} loading="lazy" /> : null}
                </div>
                <b>{n.name}</b>
              </div>
            ))}
          </div>
        </div></section>
      ) : null}

      {/* Why you'll love it */}
      <section className="m-section"><div className="m-wrap">
        <div className="m-shead" style={{ textAlign: 'left', margin: '0 0 32px', maxWidth: 620 }}><span className="m-eyebrow">Why you&rsquo;ll love it</span><h2>Made to be remembered.</h2></div>
        <div className="m-whytiles">
          {WHY.slice(0, 4).map(([t, s], i) => (
            <div className="m-why" key={i}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2"/></svg>
              <b>{t}</b><small>{s}</small>
            </div>
          ))}
        </div>
      </div></section>

      {/* Deeper luxury */}
      <section className="m-section m-atelier"><div className="m-wrap"><div className="m-luxgrid">
        <div>
          <span className="m-eyebrow">Our craftsmanship</span>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', color: '#F3E7D5', marginTop: 10 }}>A Deeper Kind of Luxury.</h2>
          <p className="lede" style={{ color: 'var(--m-on-band-soft)', marginTop: 16, maxWidth: '38ch' }}>{product.name} is handcrafted with the finest ingredients, designed for exceptional longevity and a signature trail that stays with you.</p>
          <div style={{ marginTop: 24 }}><Link className="m-btn m-btn--on-band" href="/about">Our craftsmanship <span className="m-arrow">→</span></Link></div>
        </div>
        <div className="m-luxrow">
          {[['Long-lasting', 'A fragrance that stays with you through the day.'], ['Premium Ingredients', 'Finest global ingredients, responsibly sourced.'], ['IFRA-Certified & Skin Safe', 'Gentle, safe and made for everyday wear.'], ['Cruelty Free & Vegan', 'Because beauty should be kind.']].map(([t, s]) => (
            <div className="m-luxitem" key={t}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <b>{t}</b><small>{s}</small>
            </div>
          ))}
        </div>
      </div></div></section>

      {/* Reviews */}
      {reviews.length ? (
        <section className="m-section"><div className="m-wrap">
          <div className="m-revhead">
            <div><span className="m-eyebrow">Customer reviews</span><h2 style={{ fontSize: 'clamp(28px,4vw,42px)', marginTop: 8 }}>Loved &amp; Verified.</h2></div>
            <div className="m-revscore"><b>{Number(rating).toFixed(1)}</b><span><span className="m-stars">{stars(rating)}</span><br /><small>Based on {reviewCount.toLocaleString('en-IN')} reviews</small></span></div>
          </div>
          <div className="m-revs">
            {reviews.slice(0, 6).map((v, i) => {
              const name = v.reviewerName || v.name || 'Verified Buyer';
              return (
                <div className="m-rev" key={v.id || i}>
                  <div className="m-stars">{stars(v.rating)}</div>
                  <q>{v.review || v.comment}</q>
                  <div className="m-rev__by">
                    <span className="m-rev__av" style={{ background: AV[i % AV.length] }}>{name[0]}</span>
                    <span><b>{name}</b><small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>Verified Buyer</small></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div></section>
      ) : null}

      {/* FAQ */}
      <section className="m-section" style={{ paddingTop: 0 }}><div className="m-wrap">
        <div className="m-shead" style={{ textAlign: 'left', margin: '0 0 24px' }}><span className="m-eyebrow">Good to know</span><h2>Frequently Asked Questions</h2></div>
        <div className="m-faq">
          <details><summary>How long does {product.name} last?</summary><p>{product.name} is an Eau de Parfum{longev ? ` with around ${longev} hours of longevity on skin` : ''}. Projection is strong, so one or two sprays is plenty.</p></details>
          <details><summary>What does it smell like?</summary><p>{product.description}</p></details>
          <details><summary>Is it suitable for daily wear?</summary><p>Yes — {product.name} is versatile and refined, balanced enough for the office and elegant enough for an evening out{tokens(attrs['gender'])[0] ? `. It is a ${tokens(attrs['gender'])[0].toLowerCase()} fragrance` : ''}.</p></details>
          <details><summary>Is it vegan and cruelty-free?</summary><p>Yes. Every VELMIQUE fragrance is vegan, cruelty-free and IFRA-certified for skin safety, with easy 7-day returns.</p></details>
        </div>
      </div></section>

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
