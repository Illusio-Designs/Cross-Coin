'use client';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/shop/ProductCard';
import { getBestsellers } from '@/lib/api/products';
import { getPublicCategories } from '@/lib/api/categories';
import { getAllReviews } from '@/lib/api/reviews';

/* ─────────────────────────────────────
   1. PRESS STRIP — "As Featured In"
   Centered editorial layout: hairline-flanked eyebrow on top, then a
   single row of publications. Each name uses the typographic flavour
   that nods at the real magazine logo (bold uppercase for VOGUE / ELLE
   / GQ, serif italic for Harper's / Grazia / Verve). Hairline dividers
   separate the names; greyscale by default with a soft gold tint on
   hover. Replaces the old scrolling marquee.
   ───────────────────────────────────── */
const pressLogos = [
  { name: 'VOGUE',           cls: 'font-display tracking-[0.05em]' },
  { name: "Harper's Bazaar", cls: 'font-serif italic tracking-tight' },
  { name: 'ELLE',            cls: 'font-display tracking-[0.18em]' },
  { name: 'GQ',              cls: 'font-display tracking-[0.05em]' },
  { name: 'Grazia',          cls: 'font-serif italic tracking-tight' },
  { name: 'Femina',          cls: 'font-serif tracking-[0.04em]' },
  { name: 'Verve',           cls: 'font-serif italic tracking-tight' },
];

export function Marquee() {
  return (
    <section className="relative bg-[var(--bg)] py-14 md:py-20 border-y border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">

        {/* Centered eyebrow flanked by hairlines */}
        <div className="flex items-center justify-center gap-5 mb-9">
          <span className="hidden sm:block h-px w-16 bg-[var(--border)]" />
          <p className="text-[var(--gold-deep)] text-[10px] md:text-[11px] tracking-[0.45em] uppercase font-body">
            As Featured In
          </p>
          <span className="hidden sm:block h-px w-16 bg-[var(--border)]" />
        </div>

        {/* Logo row */}
        <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 lg:gap-x-14 gap-y-5">
          {pressLogos.map((logo, i) => (
            <li key={logo.name} className="flex items-center gap-x-6 sm:gap-x-10 lg:gap-x-14">
              <span
                className={`${logo.cls} text-[var(--ink-soft)] text-xl md:text-2xl lg:text-[28px] leading-none transition-colors hover:text-[var(--gold-deep)]`}
              >
                {logo.name}
              </span>
              {i < pressLogos.length - 1 && (
                <span aria-hidden className="hidden md:block h-4 w-px bg-[var(--border)]" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   2. ABOUT BAND — paragraph + photo + Shop pill
   ───────────────────────────────────── */
export function StoryBand() {
  return (
    <section className="bg-[var(--bg)] py-20 md:py-28">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">

          {/* Left — text */}
          <motion.div
            className="md:col-span-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-6">
              About Us
            </p>
            <p className="text-[var(--ink)] text-base md:text-lg leading-[1.65] font-body max-w-xl mb-5 text-justify hyphens-auto">
              At <span className="font-serif italic">Velmique</span>, every fragrance begins as an idea — a feeling, a memory, a quiet morning in Kannauj or a long evening in Mysore. We hand-blend timeless extraits and eaux de parfum at our Bandra atelier, working in small batches with rare absolutes, aged oud, Kannauj rose, and Mysore sandalwood sourced from growers we have known for years.
            </p>
            <p className="text-[var(--ink)] text-base md:text-lg leading-[1.65] font-body max-w-xl mb-5 text-justify hyphens-auto">
              Each bottle is built note by note, cured for weeks, and decanted by hand. We do not chase trends or mass-market scents — we compose perfumes for people who want to wear something considered, layered, and unmistakably theirs. From the volatile top notes that introduce you to a room, to the warm resinous base that lingers on cashmere hours after you have left, every accord is chosen for character, longevity, and sillage that quietly announces presence.
            </p>
            <p className="text-[var(--ink)] text-base md:text-lg leading-[1.65] font-body max-w-xl mb-8 text-justify hyphens-auto">
              Today our extraits are stocked at <span className="font-serif italic">100+ partner boutiques</span> across India and shipped to private collectors worldwide. Every flacon carries a number, the perfumer's signature, and a story we hope becomes part of yours.
            </p>
            <Link href="/shop" className="pill-cta">
              Shop Now
              <ArrowUpRight size={14} strokeWidth={1.6} />
            </Link>
          </motion.div>

          {/* Right — photo */}
          <motion.div
            className="md:col-span-6 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-[var(--surface-2)]">
              <img
                src="/about.png"
                alt="Velmique perfume bottles on display"
                className="w-full h-auto object-contain"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   3. BIG TYPOGRAPHY BAND — headline + photo collage
   ───────────────────────────────────── */
const collagePhotos = [
  // Balanced collage framing the headline — perfume-themed only, two per side
  { src: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=85', rotate: -6, top: '8%', left: '3%', size: 200 },
  { src: 'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?w=600&q=85', rotate: 8, top: '58%', left: '5%', size: 180 },
  { src: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=600&q=85', rotate: 7, top: '8%', left: '82%', size: 200 },
  { src: 'https://images.unsplash.com/photo-1610461888750-10bfc601b874?w=600&q=85', rotate: -8, top: '58%', left: '80%', size: 180 },
];

export function CollectionBanner() {
  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden bg-[var(--surface)]"
      style={{
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Soft overlay so the headline stays readable */}
      <div className="absolute inset-0 bg-[var(--surface)]/70 pointer-events-none" />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 relative">

        {/* Floating photos — bigger, elegant editorial frames */}
        {collagePhotos.map((p, i) => (
          <motion.div
            key={i}
            className="absolute overflow-hidden hidden md:block"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size * 1.2,
              transform: `rotate(${p.rotate}deg)`,
              border: '6px solid #fff',
              borderRadius: '4px',
              boxShadow: '0 18px 45px -12px rgba(20, 12, 4, 0.35), 0 4px 12px -4px rgba(20, 12, 4, 0.18)',
            }}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.04, transition: { duration: 0.3 } }}
          >
            <img src={p.src} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}

        {/* Headline — all filled, with a soft cream halo so it reads cleanly over the model */}
        <motion.h2
          className="font-display text-[var(--ink)] text-center leading-[0.92] tracking-[-0.02em] relative z-10 max-w-5xl mx-auto"
          style={{
            fontSize: 'clamp(2.4rem, 7vw, 6rem)',
            WebkitTextStroke: '1px var(--bg)',
            paintOrder: 'stroke fill',
            textShadow: '0 2px 18px rgba(245, 240, 230, 0.55)',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9 }}
        >
          RARE ABSOLUTES,<br />
          UNFORGETTABLE <em className="not-italic gold-text">SILLAGE</em><br />
          BOTTLED BY HAND
        </motion.h2>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   4. CUSTOMER FAVORITES — live best-sellers from the API. If the brand
   has no published products yet, the section quietly hides itself.
   ───────────────────────────────────── */
export function BestSellers() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getBestsellers(8).then(list => {
      if (!alive) return;
      setItems(Array.isArray(list) ? list.slice(0, 8) : []);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  if (loaded && !items.length) return null;

  return (
    <section className="bg-[var(--bg)] py-20 md:py-28">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
              Curated
            </p>
            <h2 className="font-display text-[var(--ink)] leading-[0.95] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              EXPLORE OUR <em className="not-italic gold-text">CUSTOMER</em> FAVORITES
            </h2>
          </div>
          <Link href="/shop" className="pill-cta pill-cta-light">
            View All
            <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {!loaded
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[3/4] rounded-2xl bg-[var(--surface-2)] animate-pulse" />
                  <div className="mt-4 space-y-2">
                    <div className="h-2.5 w-1/3 rounded bg-[var(--surface-2)] animate-pulse" />
                    <div className="h-3.5 w-2/3 rounded bg-[var(--surface-2)] animate-pulse" />
                  </div>
                </div>
              ))
            : items.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   4b. COLLECTIONS — live categories from the dashboard.
   Each card links to /shop?collection=<slug>. Hides itself if there
   are no categories yet so the homepage stays clean.
   ───────────────────────────────────── */
export function CollectionsBand() {
  const [cats, setCats] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getPublicCategories().then(list => {
      if (!alive) return;
      setCats(Array.isArray(list) ? list.slice(0, 6) : []);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  if (loaded && !cats.length) return null;

  return (
    <section className="bg-[var(--surface)] py-20 md:py-28">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
              Curated Worlds
            </p>
            <h2 className="font-display text-[var(--ink)] leading-[0.95] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              SHOP BY <em className="not-italic gold-text">COLLECTION</em>
            </h2>
          </div>
          <Link href="/collections" className="pill-cta pill-cta-light">
            All Collections <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {!loaded && Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="aspect-[4/5] rounded-2xl bg-[var(--surface-2)] animate-pulse" />
          ))}
          {loaded && cats.map((c, i) => (
            <motion.div
              key={c.id || c.slug}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <Link
                href={`/shop?collection=${c.slug}`}
                className="group relative block overflow-hidden rounded-2xl bg-[var(--surface-2)]"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  {c.image && (
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-white uppercase leading-none tracking-tight text-2xl md:text-3xl">
                      {c.name}
                    </h3>
                    {c.tagline && (
                      <p className="text-white/75 font-body text-xs md:text-sm mt-2 line-clamp-1">{c.tagline}</p>
                    )}
                  </div>
                  <ArrowUpRight size={20} strokeWidth={1.5}
                    className="text-white/80 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
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
   5. FRAGRANCE FORMULA — sticky image + vertical timeline of notes
   The fragrance unfolds in four stages on skin (Top → Heart → Base →
   Drydown). The image stays sticky while each note scrolls past with
   its stage label, timing band, big number, title, and description.
   ───────────────────────────────────── */
const formula = [
  {
    n: '01',
    stage: 'TOP NOTES',
    timing: 'First 5 minutes',
    title: 'Bergamot & Saffron',
    desc: 'Calabrian bergamot opens with a bright citrus shimmer, paired with rare red saffron threads from Kashmir for a warm spiced top. The first impression — volatile, luminous, fading within minutes to reveal the heart beneath.',
  },
  {
    n: '02',
    stage: 'HEART',
    timing: '30 min — 2 hours',
    title: 'Bulgarian Rose Absolute',
    desc: 'Three thousand petals distilled into a single drop — the soul of every Velmique extrait, picked at dawn in the Rose Valley and processed within hours of harvest to preserve their indolic depth.',
  },
  {
    n: '03',
    stage: 'BASE',
    timing: '2 — 6 hours',
    title: 'Aged Oud & Mysore Sandalwood',
    desc: 'Royal Cambodian oud and Mysore sandalwood aged for seven years form the warm, resinous heart of the composition. The wood notes deepen over time, becoming creamier and more honeyed on warm skin.',
  },
  {
    n: '04',
    stage: 'DRYDOWN',
    timing: '6+ hours',
    title: 'Amber & White Musk',
    desc: 'The signature trail — a powdery amber and clean musk drydown that lingers on skin for twelve hours and beyond. This is what people remember; what stays on cashmere long after you have left the room.',
  },
];

export function NotesBand() {
  return (
    <section className="bg-[var(--bg)] py-20 md:py-28 border-t border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">

        {/* Header */}
        <div className="grid grid-cols-12 gap-6 mb-16 md:mb-20 items-end">
          <div className="col-span-12 md:col-span-7">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
              The Composition
            </p>
            <h2 className="font-display text-[var(--ink)] leading-[0.92] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(2.4rem, 6.5vw, 5.2rem)' }}>
              FRAGRANCE <em className="not-italic gold-text">FORMULA</em>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-[var(--ink)] text-base md:text-lg leading-[1.65] font-body max-w-md md:ml-auto">
              Every Velmique extrait unfolds in four acts. Each accord is composed for the way it transforms on warm skin — from the volatile shimmer of the top notes to the trail that lingers long after.
            </p>
          </div>
        </div>

        {/* Two columns: sticky image left, vertical timeline right */}
        <div className="grid grid-cols-12 gap-8 md:gap-12 lg:gap-20 items-start">

          {/* Left — sticky image */}
          <motion.div
            className="col-span-12 md:col-span-5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9 }}
          >
            <div className="md:sticky md:top-28">
              <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)]">
                <img src="/FRAGRANCE.png" alt="Velmique fragrance composition"
                  className="w-full h-auto object-contain" />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.35em] uppercase font-body">
                  Bandra Atelier · 2025
                </p>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </div>
          </motion.div>

          {/* Right — vertical timeline of notes */}
          <div className="col-span-12 md:col-span-7 relative">
            {/* Vertical hairline running down the timeline */}
            <span aria-hidden className="absolute left-[14px] top-2 bottom-2 w-px bg-[var(--border)] hidden md:block" />

            <div className="flex flex-col gap-10 md:gap-14">
              {formula.map((f, i) => (
                <motion.div
                  key={f.n}
                  className="relative md:pl-14"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Timeline dot on the hairline */}
                  <span aria-hidden
                    className="hidden md:flex absolute left-0 top-1 h-7 w-7 items-center justify-center rounded-full bg-[var(--bg)] border border-[var(--gold)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
                  </span>

                  {/* Stage label + skin-time meta row */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body">
                      {f.stage}
                    </span>
                    <span className="h-px w-6 bg-[var(--border)]" />
                    <span className="text-[var(--ink-muted)] text-[10px] tracking-[0.25em] uppercase font-body">
                      {f.timing}
                    </span>
                  </div>

                  {/* Number + title row */}
                  <div className="flex items-baseline gap-5 mb-3">
                    <span className="font-display text-[var(--gold)] leading-none"
                      style={{ fontSize: 'clamp(2.6rem, 4.5vw, 3.6rem)' }}>
                      {f.n}
                    </span>
                    <h3 className="font-serif italic text-[var(--ink)] leading-tight"
                      style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)' }}>
                      {f.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-[var(--ink)] text-base md:text-lg leading-[1.65] font-body max-w-xl text-justify hyphens-auto">
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   6. REAL STORIES — live reviews from /api/reviews/all
   Two infinite marquees fed by the API. Hides itself entirely if the
   brand has no approved reviews yet.
   ───────────────────────────────────── */
function ReviewCard({ t }) {
  return (
    <div className="shrink-0 aspect-square w-[180px] md:w-[260px] bg-white rounded-2xl p-3.5 md:p-6 border border-[var(--border)] flex flex-col mx-2 md:mx-2.5 shadow-sm">
      <div className="flex gap-0.5 mb-2 md:mb-3">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={10} className={s <= (t.rating || 0) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border)]'} />
        ))}
      </div>
      <p className="text-[var(--ink-soft)] text-[11px] md:text-sm leading-[1.5] md:leading-[1.55] font-body flex-1 overflow-hidden">
        {t.text}
      </p>
      <div className="mt-2 md:mt-3">
        <p className="font-serif italic text-[var(--ink)] text-xs md:text-base leading-tight truncate">{t.name}</p>
        {t.product && (
          <p className="text-[var(--ink-muted)] text-[9px] md:text-[10px] tracking-[0.2em] uppercase font-body mt-0.5 md:mt-1 line-clamp-1">{t.product}</p>
        )}
      </div>
    </div>
  );
}

// Convert the API row → the shape <ReviewCard /> renders.
function mapReview(r) {
  return {
    id:     r.id,
    name:   r.reviewerName || r.guestName || r.User?.name || 'Anonymous',
    text:   r.review || r.comment || '',
    rating: Number(r.rating || 0),
    product: r.productName || r.Product?.name || '',
  };
}

export function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [stats,   setStats]   = useState({ avg: 0, total: 0 });

  useEffect(() => {
    let alive = true;
    getAllReviews({ limit: 24 }).then(({ reviews: rs }) => {
      if (!alive) return;
      const mapped = (rs || []).map(mapReview).filter(r => r.text);
      setReviews(mapped);
      if (mapped.length) {
        const total = mapped.length;
        const sum = mapped.reduce((s, r) => s + (r.rating || 0), 0);
        setStats({ avg: sum / total, total });
      }
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  // Split into two rows — each marquee scrolls independently.
  const { topRow, bottomRow } = useMemo(() => {
    if (!reviews.length) return { topRow: [], bottomRow: [] };
    const half = Math.ceil(reviews.length / 2);
    return {
      topRow:    reviews.slice(0, half),
      bottomRow: reviews.slice(half).length ? reviews.slice(half) : reviews.slice(0, half),
    };
  }, [reviews]);

  if (loaded && !reviews.length) return null;

  return (
    <section className="bg-[var(--bg)] py-20 md:py-28">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">

        {/* Header — title left, rating + CTA right */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex-1">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
              Reviews
            </p>
            <h2 className="font-display text-[var(--ink)] leading-[0.92] tracking-[-0.01em] max-w-3xl"
              style={{ fontSize: 'clamp(2rem, 5.5vw, 4.6rem)' }}>
              REAL STORIES FROM <em className="not-italic gold-text">REAL</em> CUSTOMERS
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={14} className={s <= Math.round(stats.avg) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border)]'} />
              ))}
            </div>
            <span className="text-[var(--ink-soft)] text-sm font-body">
              <span className="font-serif italic text-[var(--ink)] text-lg">
                {stats.avg ? stats.avg.toFixed(1) : '—'}
              </span>
              <span className="mx-2 text-[var(--ink-muted)]">·</span>
              {stats.total} verified review{stats.total === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Featured product photo — hidden on mobile, shown from md+ */}
          <motion.div
            className="hidden md:block md:col-span-5 relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9 }}
          >
            <div className="relative h-full min-h-[600px] overflow-hidden rounded-2xl bg-[var(--surface-2)]">
              <img
                src="/review.png"
                alt="Velmique customer reviews"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Two infinite-scrolling rows: top → left, bottom → right.
              Container fills column height; each row gets equal share. */}
          <motion.div
            className="col-span-12 md:col-span-7 flex flex-col justify-center gap-4 md:gap-6 overflow-hidden min-h-[380px] md:min-h-[600px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            {/* Top row — scrolls left */}
            <div className="reviews-marquee">
              <div className="reviews-track reviews-track-left">
                {[...topRow, ...topRow].map((t, i) => (
                  <ReviewCard key={`top-${t.id}-${i}`} t={t} />
                ))}
              </div>
            </div>

            {/* Bottom row — scrolls right */}
            <div className="reviews-marquee">
              <div className="reviews-track reviews-track-right">
                {[...bottomRow, ...bottomRow].map((t, i) => (
                  <ReviewCard key={`bot-${t.id}-${i}`} t={t} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <style jsx>{`
          .reviews-marquee {
            position: relative;
            overflow: hidden;
            mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
          }
          .reviews-track {
            display: flex;
            width: max-content;
            will-change: transform;
          }
          .reviews-track-left {
            animation: reviews-scroll-left 40s linear infinite;
          }
          .reviews-track-right {
            animation: reviews-scroll-right 40s linear infinite;
          }
          .reviews-marquee:hover .reviews-track {
            animation-play-state: paused;
          }
          @keyframes reviews-scroll-left {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          @keyframes reviews-scroll-right {
            from { transform: translateX(-50%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   Legacy stubs — keep page imports working but render nothing
   (sections we replaced with the editorial layout)
   ───────────────────────────────────── */
export function GenderSection() { return null; }
export function ShopTheLook() { return null; }
export function DiscoveryKits() { return null; }
export function WorldOfFragrances() { return null; }
export const ServicesBar = Marquee;
