'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/shop/ProductCard';
import { getBestsellers } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import { getAllReviews } from '@/lib/api/reviews';

/* Shared reveal preset — a quiet fade-up used across every section so the
   page settles section by section as the reader scrolls. */
const reveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
};

/* ─────────────────────────────────────
   1. MARQUEE — italic serif strip on near-black
   ───────────────────────────────────── */
const marqueeWords = ['Rare Absolutes', 'Hand Blended', 'Indian Maison', 'Unforgettable Sillage'];

export function Marquee() {
  const run = [...marqueeWords, ...marqueeWords];
  return (
    <section className="overflow-hidden bg-[var(--ink)] text-white py-[18px] whitespace-nowrap">
      <div className="vq-marquee-track inline-flex items-center gap-[55px]">
        {[...run, ...run].map((w, i) => (
          <span key={i} className="inline-flex items-center gap-[55px]">
            <span className="font-serif italic text-[20px] leading-none">{w}</span>
            <small className="font-body text-[8px] tracking-[0.3em] uppercase text-[var(--gold-light)]">✦</small>
          </span>
        ))}
      </div>
      <style jsx>{`
        .vq-marquee-track { animation: vq-marquee 28s linear infinite; }
        @keyframes vq-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .vq-marquee-track { animation: none; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────
   2. INTRO — the Velmique philosophy
   ───────────────────────────────────── */
export function Intro() {
  return (
    <section className="bg-[var(--bg)]">
      <motion.div
        {...reveal}
        className="max-w-[1440px] mx-auto px-6 md:px-[7vw] py-24 md:py-[150px] grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-10 md:gap-[100px] items-start"
      >
        <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.25em] uppercase font-body">
          The Velmique philosophy
        </p>
        <div>
          <h2 className="font-serif text-[var(--ink)] font-medium leading-[0.98] max-w-[800px]"
            style={{ fontSize: 'clamp(2.6rem, 5vw, 4.7rem)' }}>
            A fragrance should become part of you.
          </h2>
          <p className="text-[var(--ink-muted)] font-body leading-[2] text-[14px] max-w-[650px] mt-8">
            Every Velmique fragrance begins with an idea — a feeling, a memory, a moment.
            We compose each accord slowly, working with rare ingredients and allowing the
            fragrance to mature before it reaches your skin.
          </p>
          <p className="text-[var(--ink-muted)] font-body leading-[2] text-[14px] max-w-[650px] mt-6">
            We do not create fragrances to follow trends. We create them to develop character.
          </p>
          <Link
            href="/about"
            className="inline-block mt-8 border-b border-[var(--ink)] pb-[7px] text-[10px] tracking-[0.2em] uppercase font-body transition-colors hover:text-[var(--gold-deep)] hover:border-[var(--gold-deep)]"
          >
            Discover Velmique
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────
   3. SIGNATURE COLLECTION — live best-sellers (real products)
   ───────────────────────────────────── */
export function BestSellers({ initialItems = null }) {
  const hasSeed = Array.isArray(initialItems) && initialItems.length > 0;
  const [items, setItems] = useState(() => (hasSeed ? initialItems.slice(0, 4) : []));
  const [loaded, setLoaded] = useState(hasSeed);

  useEffect(() => {
    if (hasSeed) return;
    let alive = true;
    getBestsellers(4).then((list) => {
      if (!alive) return;
      setItems(Array.isArray(list) ? list.slice(0, 4) : []);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [initialItems]);

  if (loaded && !items.length) return null;

  return (
    <section id="collection" className="bg-[var(--surface)] px-5 md:px-[5vw] pt-24 md:pt-[100px] pb-28 md:pb-[150px]">
      <div className="max-w-[1440px] mx-auto">
        <motion.div {...reveal} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.25em] uppercase font-body">
              Curated worlds
            </p>
            <h2 className="font-serif text-[var(--ink)] font-medium leading-[0.9] mt-3"
              style={{ fontSize: 'clamp(2.6rem, 5vw, 4.75rem)' }}>
              Signature<br />Collection
            </h2>
          </div>
          <p className="text-[var(--ink-muted)] font-body text-[12px] leading-[1.8] max-w-[350px]">
            Four expressions. Four moods. One unmistakable Velmique signature. Discover
            fragrances created for different sides of your personality.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-[18px]">
          {!loaded
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="bg-[var(--surface-2)] animate-pulse" style={{ aspectRatio: '0.8' }} />
                  <div className="mt-5 space-y-2">
                    <div className="h-2 w-1/3 rounded bg-[var(--surface-2)] animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-[var(--surface-2)] animate-pulse" />
                  </div>
                </div>
              ))
            : items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>

        <div className="mt-14 flex justify-center">
          <Link href="/shop" className="pill-cta pill-cta-light">
            View the full collection
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   4. SHOP BY COLLECTION — live categories (real data)
   ───────────────────────────────────── */
export function CollectionsBand({ initialCategories = null }) {
  const hasSeed = Array.isArray(initialCategories) && initialCategories.length > 0;
  const [cats, setCats] = useState(() => (hasSeed ? initialCategories.slice(0, 6) : []));
  const [loaded, setLoaded] = useState(hasSeed);

  useEffect(() => {
    if (hasSeed) return;
    let alive = true;
    getPublicCategories().then((list) => {
      if (!alive) return;
      setCats(Array.isArray(list) ? list.slice(0, 6) : []);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [initialCategories]);

  if (loaded && !cats.length) return null;

  return (
    <section className="bg-[var(--bg)] px-6 md:px-[7vw] py-24 md:py-[130px]">
      <div className="max-w-[1440px] mx-auto">
        <motion.div {...reveal} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.25em] uppercase font-body">
              Explore
            </p>
            <h2 className="font-serif text-[var(--ink)] font-medium leading-[0.9] mt-3"
              style={{ fontSize: 'clamp(2.4rem, 4.5vw, 4rem)' }}>
              Shop by collection
            </h2>
          </div>
          <Link href="/collections" className="text-[10px] tracking-[0.2em] uppercase font-body border-b border-[var(--ink)] pb-[7px] transition-colors hover:text-[var(--gold-deep)] hover:border-[var(--gold-deep)]">
            All collections
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px]">
          {!loaded && Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="bg-[var(--surface-2)] animate-pulse" style={{ aspectRatio: '4/5' }} />
          ))}
          {loaded && cats.map((c, i) => (
            <motion.div
              key={c.id || c.slug}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/collections/${c.slug}`} className="group relative block overflow-hidden" style={{ aspectRatio: '4/5' }}>
                <div className="absolute inset-0 bg-[var(--surface-2)]">
                  {c.image && (
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(17,16,14,0.78)] via-[rgba(17,16,14,0.15)] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <p className="text-[var(--gold-light)] text-[8px] tracking-[0.25em] uppercase font-body mb-2">
                    Collection
                  </p>
                  <h3 className="font-serif text-white leading-none" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}>
                    {c.name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   5. STORY — split image + dark panel
   ───────────────────────────────────── */
export function StoryBand() {
  return (
    <section id="story" className="grid grid-cols-1 md:grid-cols-2 md:min-h-[700px]">
      <div className="overflow-hidden bg-[#31261e] min-h-[400px] md:min-h-0 group">
        <img
          src="/about.webp"
          alt="Velmique perfume atelier"
          className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
        />
      </div>
      <motion.div
        {...reveal}
        className="bg-[var(--ink)] text-white flex flex-col justify-center px-7 md:px-[9vw] py-20 md:py-[100px]"
      >
        <p className="text-[var(--gold)] text-[9px] tracking-[0.25em] uppercase font-body">Our story</p>
        <h2 className="font-serif leading-[0.9] my-7" style={{ fontSize: 'clamp(3rem, 5vw, 5.1rem)', fontWeight: 400 }}>
          The art of <em className="italic font-normal">slow perfume.</em>
        </h2>
        <p className="text-[#bdb7af] font-body leading-[2] text-[13px] max-w-[500px]">
          Velmique is a homegrown maison de parfum built around the belief that beautiful
          fragrance takes time.
        </p>
        <p className="text-[#bdb7af] font-body leading-[2] text-[13px] max-w-[500px] mt-5">
          Inspired by French perfumery and India's rich attar heritage, our fragrances bring
          together rare botanicals, aged woods and carefully composed accords.
        </p>
        <Link
          href="/about"
          className="inline-block w-fit mt-9 border border-[#777] text-white px-7 py-4 text-[10px] tracking-[0.2em] uppercase font-body transition-colors hover:bg-white hover:text-[var(--ink)]"
        >
          Discover our story
        </Link>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────
   6. COMPOSITION — four acts, bordered grid
   ───────────────────────────────────── */
const notes = [
  { n: '01', time: 'Top notes · First 5 minutes', title: ['Bergamot', '& Saffron'],
    desc: 'Bright citrus meets warm spice to create an opening that feels luminous and confident.' },
  { n: '02', time: 'Heart · 30 min — 2 hours', title: ['Bulgarian', 'Rose'],
    desc: 'A rich floral heart that gives the composition depth, softness and unmistakable character.' },
  { n: '03', time: 'Base · 2 — 6 hours', title: ['Aged Oud', '& Sandalwood'],
    desc: 'Deep woods create warmth and structure, becoming creamier and richer as the fragrance evolves.' },
  { n: '04', time: 'Drydown · 6+ hours', title: ['Amber', '& White Musk'],
    desc: 'A soft, memorable trail designed to remain close to the skin long after the first impression.' },
];

export function NotesBand() {
  return (
    <section id="composition" className="bg-[var(--bg)] px-6 md:px-[7vw] py-24 md:py-[150px]">
      <motion.div {...reveal} className="max-w-[850px] mb-16 md:mb-[90px]">
        <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.25em] uppercase font-body">The composition</p>
        <h2 className="font-serif text-[var(--ink)] font-medium leading-[0.9] mt-5" style={{ fontSize: 'clamp(3rem, 6vw, 5.6rem)' }}>
          Four acts.<br />One lasting impression.
        </h2>
        <p className="text-[var(--ink-muted)] font-body leading-[1.9] text-[13px] max-w-[600px] mt-7">
          Every Velmique extrait evolves on warm skin. From the first luminous opening to the
          final lingering trail, every stage is deliberately composed.
        </p>
      </motion.div>

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-[var(--border)]">
        {notes.map((note, i) => (
          <motion.article
            key={note.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="px-6 md:px-[30px] py-10 min-h-[300px] md:min-h-[330px] border-b border-[var(--border)] lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <div className="font-serif text-[var(--gold-deep)] text-[18px]">{note.n}</div>
            <div className="mt-2.5 text-[8px] tracking-[0.2em] uppercase text-[var(--ink-muted)] font-body">
              {note.time}
            </div>
            <h3 className="font-serif text-[var(--ink)] font-medium leading-[1] mt-9 text-[30px]">
              {note.title[0]}<br />{note.title[1]}
            </h3>
            <p className="text-[var(--ink-muted)] font-body leading-[1.8] text-[11px] mt-4">{note.desc}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   7. STATEMENT — parallax panel
   ───────────────────────────────────── */
export function CollectionBanner() {
  return (
    <section className="vq-statement relative flex items-center justify-center text-center text-white px-5 py-20 min-h-[500px] md:min-h-[620px]">
      <motion.div {...reveal} className="max-w-[900px] relative z-10">
        <p className="text-[#d0b37a] text-[9px] tracking-[0.25em] uppercase font-body">The Velmique signature</p>
        <h2 className="font-serif leading-[0.85] mt-4" style={{ fontSize: 'clamp(3.4rem, 8vw, 6.9rem)', fontWeight: 400 }}>
          Rare ingredients.<br />Quiet confidence.
        </h2>
        <p className="text-[#ddd] font-body text-[13px] tracking-[0.06em] mt-7">
          Hand-blended extraits created to be remembered.
        </p>
      </motion.div>
      <style jsx>{`
        .vq-statement {
          background:
            linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.55)),
            url('/FRAGRANCE.webp') center / cover no-repeat fixed;
        }
        @media (max-width: 900px) { .vq-statement { background-attachment: scroll; } }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────
   8. REVIEWS — live reviews in a 3-up grid (real data)
   ───────────────────────────────────── */
function mapReview(r) {
  return {
    id: r.id,
    name: r.reviewerName || r.guestName || r.User?.name || 'Verified customer',
    text: r.review || r.comment || '',
    rating: Number(r.rating || 0),
  };
}

// Shown when the brand has no approved reviews yet, so the homepage always
// carries a review section (matches the pasted maison design's testimonials).
const FALLBACK_REVIEWS = [
  { id: 'vq-f1', name: 'Verified customer', rating: 5, text: 'The kind of fragrance people ask you about without you having to say anything.' },
  { id: 'vq-f2', name: 'Verified customer', rating: 5, text: 'Elegant, warm and incredibly easy to wear. It has quickly become my signature.' },
  { id: 'vq-f3', name: 'Verified customer', rating: 5, text: 'Beautiful presentation and a fragrance that feels far more expensive than it is.' },
];

export function Testimonials({ initialReviews = null, initialTotal = 0 }) {
  const seed = (Array.isArray(initialReviews) ? initialReviews : []).map(mapReview).filter((r) => r.text);
  const [reviews, setReviews] = useState(() => seed);
  const [loaded, setLoaded] = useState(() => seed.length > 0);
  // Exact store-wide review count from the API (the list is only the latest few).
  const [total, setTotal] = useState(() => Number(initialTotal) || 0);

  useEffect(() => {
    if (seed.length) return;
    let alive = true;
    getAllReviews({ limit: 12 }).then(({ reviews: rs, pagination }) => {
      if (!alive) return;
      setTotal(Number(pagination?.total) || 0);
      setReviews((rs || []).map(mapReview).filter((r) => r.text));
      setLoaded(true);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReviews]);

  const rated = reviews.filter((r) => r.rating > 0);
  const avgRating = rated.length ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : 0;

  // Always render the section — fall back to curated testimonials when there
  // are no live reviews yet. Repeat a short list so the marquee fills its row.
  const source = reviews.length ? reviews : FALLBACK_REVIEWS;
  const marqueeList = source.length >= 6
    ? source
    : Array.from({ length: Math.ceil(6 / source.length) }).flatMap(() => source);

  return (
    <section id="reviews" className="bg-[var(--surface-2)] py-20 md:py-[140px] text-center overflow-hidden">
      <motion.div {...reveal} className="px-5 sm:px-6 md:px-[7vw]">
        <p className="text-[var(--gold-deep)] text-[9px] tracking-[0.25em] uppercase font-body">The experience</p>
        <h2 className="font-serif text-[var(--ink)] font-medium mt-4" style={{ fontSize: 'clamp(2.4rem, 6vw, 5.1rem)', lineHeight: 1.02 }}>
          Worn by people<br />who know scent.
        </h2>
        {reviews.length > 0 && (
          <p className="mt-6 text-[11px] tracking-[0.2em] uppercase font-body text-[var(--ink-soft)]">
            <span className="text-[var(--gold-deep)]" aria-hidden="true">★</span>{' '}
            {(avgRating || 0).toFixed(1)}
            <span className="mx-2 text-[var(--gold)]" aria-hidden="true">·</span>
            {Math.max(total, reviews.length).toLocaleString('en-IN')} review{Math.max(total, reviews.length) === 1 ? '' : 's'}
          </p>
        )}
      </motion.div>

      {/* Continuous auto-scrolling marquee of reviews (pauses on hover). */}
      <div className="vq-rev-marquee mt-12 md:mt-16">
        <div className="vq-rev-track">
          {[...marqueeList, ...marqueeList].map((t, i) => (
            <article key={`${t.id}-${i}`} className="vq-rev-card bg-white/55 px-7 py-9 text-left shrink-0">
              <div className="text-[var(--gold-deep)] text-[11px] tracking-[0.2em]">
                {'★★★★★'.slice(0, Math.max(1, Math.round(t.rating) || 5))}
              </div>
              <p className="font-serif text-[var(--ink)] leading-[1.3] mt-5 line-clamp-5"
                style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)' }}>“{t.text}”</p>
              <div className="mt-5 text-[9px] tracking-[0.2em] uppercase font-body text-[var(--ink-soft)]">{t.name}</div>
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .vq-rev-marquee {
          overflow: hidden; position: relative;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
        }
        .vq-rev-track { display: flex; gap: 20px; width: max-content; padding-inline: 10px;
          animation: vq-rev 85s linear infinite; }
        .vq-rev-marquee:hover .vq-rev-track { animation-play-state: paused; }
        .vq-rev-card { width: 300px; max-width: 82vw; }
        @media (min-width: 768px) { .vq-rev-card { width: 360px; } }
        @keyframes vq-rev { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) {
          .vq-rev-track { animation: none; overflow-x: auto; }
        }
      `}</style>
    </section>
  );
}

/* ─────────────────────────────────────
   Legacy stubs — keep older imports resolving
   ───────────────────────────────────── */
export function GenderSection() { return null; }
export function ShopTheLook() { return null; }
export function DiscoveryKits() { return null; }
export function WorldOfFragrances() { return null; }
export const ServicesBar = Marquee;
