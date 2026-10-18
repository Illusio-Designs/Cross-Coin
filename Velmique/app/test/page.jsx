import Link from 'next/link';
import { getBestsellers } from '@/lib/api/products';
import { getAllReviews } from '@/lib/api/reviews';
import { getFaqs } from '@/lib/api/faqs';
import ProductCard from './_components/ProductCard';
import ReviewRow from './_components/ReviewRow';

export const metadata = {
  title: 'Velmique — Maison de Parfum',
  description: 'Refined, handcrafted Indian fragrances for moments that stay with you.',
};

const stars = (r) => { const n = Math.round(Number(r) || 5); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };

const PROFILES = [
  { label: 'Woody', a: '#6b4a2e', b: '#3a2616' },
  { label: 'Floral', a: '#d98f94', b: '#a1545f' },
  { label: 'Oud', a: '#5a3f27', b: '#2c1d10' },
  { label: 'Fresh', a: '#7fa070', b: '#3f5a36' },
  { label: 'Sweet', a: '#c79a5a', b: '#7e5a2c' },
  { label: 'Amber', a: '#c9803a', b: '#7a431d' },
];
const OCCASIONS = [
  { label: 'Office', a: '#4a4035', b: '#241c14' },
  { label: 'Evening', a: '#5a3a52', b: '#271726' },
  { label: 'Date Night', a: '#7a3b3f', b: '#2e1518' },
  { label: 'Festive', a: '#9a7338', b: '#4a3317' },
  { label: 'Daily Wear', a: '#8a7a63', b: '#453b2d' },
];
const FALLBACK_REVIEWS = [
  { reviewerName: 'Riya Sharma', rating: 5, review: 'Absolutely in love — elegant, long-lasting and so premium. Finally an Indian maison that gets it.' },
  { reviewerName: 'Arjun Mehta', rating: 5, review: 'Rich, sophisticated and long-lasting. This has become my signature scent — incredible value.' },
  { reviewerName: 'Sneha Kapoor', rating: 4, review: 'Beautiful packaging, amazing fragrance and fast delivery. VELMIQUE truly feels luxurious.' },
];
const AV = ['#b85f6e', '#866027', '#7a3b3f', '#4a6b4f', '#9a6b2e', '#6e4a7a'];

export default async function MaisonHome() {
  const [featured, reviewsRes, faqs] = await Promise.all([
    getBestsellers(8),
    getAllReviews({ limit: 30 }),
    getFaqs('global'),
  ]);

  // Hero spotlights the #1 bestseller as a live product card.
  const best = featured?.[0] || null;
  const reviews = (reviewsRes?.reviews?.length ? reviewsRes.reviews : FALLBACK_REVIEWS).slice(0, 30);

  // Reviews wall (same 3-row auto-scroll as the PDP).
  const rList = reviews;
  const rPer = Math.ceil(rList.length / 3) || 1;
  const reviewRows = [rList.slice(0, rPer), rList.slice(rPer, rPer * 2), rList.slice(rPer * 2)].filter((r) => r.length);
  const reviewDirs = ['left', 'right', 'left'];
  const renderReview = (v, i) => {
    const name = v.reviewerName || v.name || 'Verified Buyer';
    return (
      <div className="m-rev" key={v.id || i}>
        <div className="m-stars">{stars(v.rating)}</div>
        <q>{v.review || v.comment || ''}</q>
        <div className="m-rev__by">
          <span className="m-rev__av" style={{ background: AV[(typeof i === 'number' ? i : 0) % AV.length] }}>{name[0]}</span>
          <span><b>{name}</b><small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>Verified Buyer</small></span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Hero */}
      <section className="m-hero">
        <div className="m-wrap m-hero__grid">
          <div>
            <span className="m-eyebrow">Indian craftsmanship · global soul</span>
            <h1>Wear Your<br /><em>Presence.</em></h1>
            <p className="m-hero__lede">Refined, handcrafted fragrances for moments that stay with you — long after you&rsquo;ve left the room.</p>
            <div className="m-hero__cta">
              <Link className="m-btn m-btn--fill" href="#m-featured">Discover the collection <span className="m-arrow">→</span></Link>
              <Link className="m-btn m-btn--on-band" href="#m-about">Our story</Link>
            </div>
          </div>
          <div className="m-hero__figure m-hero__figure--card">
            {best ? (
              <div className="m-herocard">
                <span className="m-herocard__no1">★ #1 Bestseller</span>
                <ProductCard product={best} />
              </div>
            ) : null}
          </div>
        </div>
        <div className="m-hero__aside">More than a fragrance.<br />A feeling.</div>
      </section>

      {/* Featured */}
      <section className="m-section" id="m-featured"><div className="m-wrap">
        <div className="m-shead">
          <span className="m-eyebrow">Featured fragrances</span>
          <h2>Signature Scents for Every You.</h2>
          <p>Distinctly crafted. Unmistakably you.</p>
        </div>
        {featured.length ? (
          <div className="m-pgrid">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--m-ink-soft)' }}>Our collection is being bottled. Please check back shortly.</p>
        )}
      </div></section>

      {/* Scent profile + occasion */}
      <section className="m-section" style={{ paddingTop: 0 }}><div className="m-wrap">
        <p className="m-sublabel">Shop by scent profile</p>
        <div className="m-chips">
          {PROFILES.map((c) => (
            <Link key={c.label} className="m-chip" href="/test/shop" style={{ background: `linear-gradient(150deg,${c.a},${c.b})` }}>
              <span>{c.label} <span className="m-arrow">→</span></span>
            </Link>
          ))}
        </div>
        <p className="m-sublabel" style={{ marginTop: 46 }}>Shop by occasion</p>
        <div className="m-chips occ">
          {OCCASIONS.map((c) => (
            <Link key={c.label} className="m-chip" href="/test/shop" style={{ background: `linear-gradient(150deg,${c.a},${c.b})` }}>
              <span>{c.label} <span className="m-arrow">→</span></span>
            </Link>
          ))}
        </div>
      </div></section>

      {/* Philosophy */}
      <section className="m-section m-philo" id="m-about"><div className="m-wrap m-philo__grid">
        <div>
          <span className="m-eyebrow">Our philosophy</span>
          <h2>A Deeper<br />Kind of Luxury.</h2>
          <p className="lede">At VELMIQUE, we believe a fragrance is more than a scent — it&rsquo;s a memory in the making. Each perfume is crafted in India with rare ingredients, timeless techniques and a modern sensibility, for those who live with intention.</p>
          <div style={{ marginTop: 26 }}><Link className="m-btn m-btn--ghost" href="/test/about">Our story <span className="m-arrow">→</span></Link></div>
        </div>
        <div className="m-pillars">
          <div className="m-pillar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v4M12 21a6 6 0 0 0 6-6c0-4-6-9-6-9s-6 5-6 9a6 6 0 0 0 6 6Z"/></svg><div><b>Rare Ingredients</b><small>Sourced from around the world.</small></div></div>
          <div className="m-pillar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20c6-2 10-6 12-14M8 20c4-8 8-10 12-11"/></svg><div><b>Indian Craftsmanship</b><small>Blending heritage with modernity.</small></div></div>
          <div className="m-pillar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-4-7-10a7 7 0 0 1 14 0c0 6-7 10-7 10Z"/><circle cx="12" cy="11" r="2.4"/></svg><div><b>Memory-Driven Perfumery</b><small>Scents that stay with you.</small></div></div>
          <div className="m-pillar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 3 2.4 5.2L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-.8Z"/></svg><div><b>Luxury for Every Day</b><small>Extraordinary, yet personal.</small></div></div>
        </div>
      </div></section>

      {/* Notes band */}
      <section className="m-section m-atelier"><div className="m-wrap m-atelier__grid">
        <div>
          <span className="m-eyebrow">The olfactive world</span>
          <h2>Layers of a Lasting Impression.</h2>
          <p className="lede">Every VELMIQUE fragrance is a balanced composition of top, heart and base notes — designed to evolve with you through the day.</p>
          <div style={{ marginTop: 26 }}><Link className="m-btn m-btn--on-band" href="/test/shop">Explore the collection <span className="m-arrow">→</span></Link></div>
        </div>
        <div className="m-notes">
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#f2d08a,#c98f3d)' }} /><div><div className="m-note__k">Top Notes</div><div className="m-note__d">Citrus, fruits, fresh spices</div></div><div className="m-note__time">0 – 15 min</div></div>
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#e7a9a2,#b85f6e)' }} /><div><div className="m-note__k">Heart Notes</div><div className="m-note__d">Floral, aromatic, warm spices</div></div><div className="m-note__time">15 min – 4 hrs</div></div>
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#8a6a46,#3f2a1c)' }} /><div><div className="m-note__k">Base Notes</div><div className="m-note__d">Oud, amber, musk, woods</div></div><div className="m-note__time">4 hrs +</div></div>
        </div>
      </div></section>

      {/* Reviews */}
      <section className="m-section"><div className="m-wrap">
        <div className="m-shead"><span className="m-eyebrow">Loved by thousands</span><h2>Real People. Lasting Impressions.</h2></div>
        <div className="m-rvwall">
          {reviewRows.map((row, idx) => (
            <ReviewRow key={idx} items={row} staticClassName="m-revs" min={4} direction={reviewDirs[idx]} render={renderReview} />
          ))}
        </div>
      </div></section>

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
    </>
  );
}
