import Link from 'next/link';
import { getBestsellers } from '@/lib/api/products';
import { getAllReviews } from '@/lib/api/reviews';
import { getFaqs } from '@/lib/api/faqs';
import { getSeoOrg } from '@/lib/api/seo-org';
import { richHtml } from '@/lib/sanitizeHtml';
import { SITE_URL, absUrl, seoMeta } from '@/lib/site';
import { ik } from '@/lib/imagekit';
import ProductCard from '../_components/ProductCard';
import ReviewRow from '../_components/ReviewRow';
import SkImg from '../_components/SkImg';
import { HeroCopy, FEATURED_HEAD, NOTES_HEAD } from './homeCopy';

// Dashboard-controlled SEO ('home') over the page's own copy; the seo-org
// description / OG image fill in when the home row is empty.
export async function generateMetadata() {
  const org = await getSeoOrg();
  return seoMeta('home', {
    title: 'Velmique — Maison de Parfum',
    description: org?.description || 'Refined, handcrafted Indian fragrances for moments that stay with you.',
    path: '/',
    image: org?.ogImage || undefined,
  });
}

// Regenerate at most every minute (ISR): fast, but bestsellers/reviews/FAQs stay fresh.
export const revalidate = 60;

const stars = (r) => { const n = Math.round(Number(r) || 5); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };

const AV = ['#b85f6e', '#866027', '#7a3b3f', '#4a6b4f', '#9a6b2e', '#6e4a7a'];

export default async function MaisonHome() {
  const [featured, reviewsRes, faqs, seoOrg] = await Promise.all([
    getBestsellers(8).catch(() => []),
    getAllReviews({ limit: 30 }).catch(() => null),
    getFaqs('global').catch(() => []),
    getSeoOrg().catch(() => null),
  ]);

  // Organization (dashboard-controlled, hardcoded fallback) + WebSite with the
  // sitelinks search box pointing at /search.
  const jsonLd = [
    seoOrg?.organization || { '@context': 'https://schema.org', '@type': 'Organization', name: 'Velmique', url: SITE_URL, logo: absUrl('/logo.webp') },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Velmique', url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  // Hero spotlights the #1 bestseller as a live product card.
  const best = featured?.[0] || null;

  // Unique fragrance NOTES (name + image) across the catalog — note
  // attributes only, no accords. Fed by the per-variation attribute images
  // managed in the dashboard, so new notes appear here automatically.
  const NOTE_TINTS = ['#e5a84f', '#f0b98a', '#cdd79a', '#c0455f', '#7fa05a', '#e7ddc9', '#d9a0c4', '#8a6a46'];
  const noteMap = new Map();
  for (const p of featured) {
    for (const v of (p.variations || [])) {
      for (const n of (v.noteItems || [])) {
        if (!n?.name) continue;
        const k = n.name.toLowerCase().trim();
        if (!noteMap.has(k) || (!noteMap.get(k).image && n.image)) noteMap.set(k, { name: n.name, image: n.image || '' });
      }
    }
  }
  const homeNotes = [...noteMap.values()].slice(0, 12);
  // Only real, published reviews — the section is hidden until there are some.
  const reviews = (reviewsRes?.reviews || []).slice(0, 30);

  // Reviews wall (same 3-row auto-scroll as the PDP).
  const rList = reviews;
  const rPer = Math.ceil(rList.length / 3) || 1;
  const reviewRows = [rList.slice(0, rPer), rList.slice(rPer, rPer * 2), rList.slice(rPer * 2)].filter((r) => r.length);
  const reviewDirs = ['left', 'right', 'left'];
  const renderReview = (v, i) => {
    const name = v.reviewerName || v.guestName || v.name || 'Customer';
    return (
      <div className="m-rev" key={v.id || i}>
        <div className="m-stars">{stars(v.rating)}</div>
        <q>{v.review || v.comment || ''}</q>
        <div className="m-rev__by">
          <span className="m-rev__av" style={{ background: AV[(typeof i === 'number' ? i : 0) % AV.length] }}>{name[0]}</span>
          <span><b>{name}</b>{v.verified_purchase ? <small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Verified Buyer</small> : null}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
      ))}
      {/* Hero */}
      <section className="m-hero">
        <div className="m-wrap m-hero__grid">
          <HeroCopy />
          <div className="m-hero__figure m-hero__figure--card">
            {best ? (
              <div className="m-herocard">
                <span className="m-herocard__no1">★ #1 Bestseller</span>
                <ProductCard product={best} priority />
              </div>
            ) : null}
          </div>
        </div>
        <div className="m-hero__aside">More than a fragrance.<br />A feeling.</div>
      </section>

      {/* Featured */}
      <section className="m-section" id="m-featured"><div className="m-wrap">
        {FEATURED_HEAD}
        {featured.length ? (
          <div className="m-pgrid">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--m-ink-soft)' }}>Our collection is being bottled. Please check back shortly.</p>
        )}
      </div></section>

      {/* Notes — fragrance note attributes with their images */}
      {homeNotes.length ? (
        <section className="m-section" style={{ paddingTop: 0 }}><div className="m-wrap">
          {NOTES_HEAD}
          <div className="m-pnotegrid">
            {homeNotes.map((n, i) => (
              <Link className="m-pn m-pn--link" key={n.name} href={`/shop?note=${encodeURIComponent(n.name)}`} aria-label={`Shop fragrances with ${n.name}`}>
                <div className="orb" style={n.image ? undefined : { background: `radial-gradient(circle at 34% 28%,#ffffffcc,${NOTE_TINTS[i % NOTE_TINTS.length]})` }}>
                  {n.image ? <SkImg src={ik(n.image, 200)} alt={n.name} loading="lazy" /> : null}
                </div>
                <b>{n.name}</b>
                <span className="m-pn__go">Shop this note →</span>
              </Link>
            ))}
          </div>
        </div></section>
      ) : null}

      {/* Philosophy */}
      <section className="m-section m-philo" id="m-about"><div className="m-wrap m-philo__grid">
        <div>
          <span className="m-eyebrow">Our philosophy</span>
          <h2>A Deeper<br />Kind of Luxury.</h2>
          <p className="lede">At VELMIQUE, we believe a fragrance is more than a scent — it&rsquo;s a memory in the making. Each perfume is crafted in India with rare ingredients, timeless techniques and a modern sensibility, for those who live with intention.</p>
          <div style={{ marginTop: 26 }}><Link className="m-btn m-btn--ghost" href="/about">Our story <span className="m-arrow">→</span></Link></div>
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
          <div style={{ marginTop: 26 }}><Link className="m-btn m-btn--on-band" href="/shop">Explore the collection <span className="m-arrow">→</span></Link></div>
        </div>
        <div className="m-notes">
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#f2d08a,#c98f3d)' }} /><div><div className="m-note__k">Top Notes</div><div className="m-note__d">Citrus, fruits, fresh spices</div></div><div className="m-note__time">0 – 15 min</div></div>
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#e7a9a2,#b85f6e)' }} /><div><div className="m-note__k">Heart Notes</div><div className="m-note__d">Floral, aromatic, warm spices</div></div><div className="m-note__time">15 min – 4 hrs</div></div>
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#8a6a46,#3f2a1c)' }} /><div><div className="m-note__k">Base Notes</div><div className="m-note__d">Oud, amber, musk, woods</div></div><div className="m-note__time">4 hrs +</div></div>
        </div>
      </div></section>

      {/* Reviews */}
      {reviewRows.length ? (
      <section className="m-section"><div className="m-wrap">
        <div className="m-shead"><span className="m-eyebrow">Loved by thousands</span><h2>Real People. Lasting Impressions.</h2></div>
        <div className="m-rvwall">
          {reviewRows.map((row, idx) => (
            <ReviewRow key={idx} items={row} staticClassName="m-revs" min={4} direction={reviewDirs[idx]} render={renderReview} />
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
                <div className="m-faq__a" {...richHtml(f.answer)} />
              </details>
            ))}
          </div>
        </div></section>
      ) : null}
    </>
  );
}
