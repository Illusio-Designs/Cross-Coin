'use client';
import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import { products, testimonials } from '@/lib/data';
import { motion } from 'framer-motion';
import ProductCard from '@/components/shop/ProductCard';

/* ─────────────────────────────────────
   1. BRANDS STRIP — "100+ MAISONS RELY ON US"
   ───────────────────────────────────── */
const brandLogos = [
  'Le Mill', 'Ogaan', 'Nicobar', 'Good Earth', 'Forest Essentials', 'Ensemble', 'Bombay Perfumery',
];

export function Marquee() {
  return (
    <section className="relative bg-[var(--bg)] py-12 md:py-16 border-b border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="flex items-center gap-10">
          <p className="text-[var(--ink-muted)] text-[10px] md:text-xs tracking-[0.35em] uppercase font-body shrink-0 max-w-[200px] leading-relaxed">
            Stocked at 100+<br />partner boutiques<br />nationwide
          </p>
          <div className="flex-1 overflow-hidden">
            <div className="flex animate-marquee gap-16 items-center whitespace-nowrap">
              {[...Array(3)].map((_, n) =>
                brandLogos.map((logo, i) => (
                  <span
                    key={`${n}-${i}`}
                    className="font-serif italic text-[var(--ink-muted)] text-2xl md:text-3xl tracking-wide opacity-60"
                  >
                    {logo}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
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
            <p className="text-[var(--ink)] text-base md:text-lg leading-[1.65] font-body max-w-xl mb-8">
              At <span className="font-serif italic">Velmique</span>, we hand-blend timeless extraits and eaux de parfum at our Bandra atelier — built on rare absolutes, aged oud, Kannauj rose and Mysore sandalwood. Stocked at <span className="font-serif italic">100+ partner boutiques</span>, every bottle is composed for sillage that lingers and a story unmistakably yours.
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
            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-[var(--surface-2)]">
              <img
                src="https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?w=1200&q=85&auto=format&fit=crop"
                alt="Velmique perfume bottles on display"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="absolute -top-3 left-4 text-[var(--ink-muted)] text-[10px] tracking-[0.4em] uppercase font-body">
              ✦ Maison de Parfum
            </p>
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
  // perfume bottle / raw fragrance ingredients collage
  { src: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&q=80', rotate: -6, top: '8%', left: '4%', size: 110 },
  { src: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&q=80', rotate: 8, top: '18%', left: '78%', size: 130 },
  { src: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&q=80', rotate: -10, top: '60%', left: '70%', size: 100 },
  { src: 'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?w=400&q=80', rotate: 12, top: '70%', left: '8%', size: 120 },
  { src: 'https://images.unsplash.com/photo-1610461888750-10bfc601b874?w=400&q=80', rotate: -4, top: '38%', left: '85%', size: 80 },
];

export function CollectionBanner() {
  return (
    <section className="bg-[var(--surface)] py-24 md:py-32 relative overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 relative">

        {/* Floating photos */}
        {collagePhotos.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-md overflow-hidden shadow-xl border-4 border-white hidden md:block"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              transform: `rotate(${p.rotate}deg)`,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: i * 0.12 }}
          >
            <img src={p.src} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}

        {/* Headline */}
        <motion.h2
          className="font-display text-[var(--ink)] text-center leading-[0.92] tracking-[-0.02em] relative z-10 max-w-5xl mx-auto"
          style={{ fontSize: 'clamp(2.4rem, 7vw, 6rem)' }}
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
   4. CUSTOMER FAVORITES — uses shared ProductCard (same as shop page)
   ───────────────────────────────────── */
const favoriteSlugs = ['noir-absolu', 'velvet-oud', 'lumiere-doree', 'obsidian-rose'];

export function BestSellers() {
  const items = favoriteSlugs.map(slug => products.find(p => p.slug === slug)).filter(Boolean);

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
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   5. FRAGRANCE FORMULA — numbered ingredients
   ───────────────────────────────────── */
const formula = [
  {
    n: '01',
    title: 'BERGAMOT & SAFFRON — TOP NOTES',
    desc: 'Calabrian bergamot opens with a bright citrus shimmer, paired with rare red saffron threads from Kashmir for a warm spiced top. The first impression — volatile, luminous, fading within minutes to reveal the heart.',
    img: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=900&q=85',
    tag: 'Function · Top Notes',
  },
  {
    n: '02',
    title: 'BULGARIAN ROSE ABSOLUTE',
    desc: 'Three thousand petals distilled into a single drop — the soul of every Velmique extrait, picked at dawn in the Rose Valley.',
  },
  {
    n: '03',
    title: 'AGED OUD & MYSORE SANDALWOOD',
    desc: 'Royal Cambodian oud and sandalwood aged for seven years form the warm, resinous heart of the composition.',
  },
  {
    n: '04',
    title: 'AMBER & WHITE MUSK — BASE',
    desc: 'The signature trail — a powdery amber and clean musk drydown that lingers on skin for twelve hours and beyond.',
  },
];

export function NotesBand() {
  return (
    <section className="bg-[var(--bg)] py-20 md:py-28 border-t border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">

        {/* Header row */}
        <div className="grid grid-cols-12 gap-6 mb-12 items-end">
          <div className="col-span-12 md:col-span-5">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
              The Composition
            </p>
            <h2 className="font-display text-[var(--ink)] leading-[0.92] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>
              FRAGRANCE<br />FORMULA
            </h2>
          </div>
          <div className="col-span-12 md:col-span-7">
            <p className="text-[var(--ink-soft)] text-base leading-relaxed font-body max-w-md md:ml-auto">
              Each Velmique extrait is a four-layer composition. From the volatile top notes to the long-lasting base, every accord is chosen for character, longevity, and the way it unfolds on warm skin throughout the day.
            </p>
          </div>
        </div>

        {/* Featured ingredient — large */}
        <div className="grid grid-cols-12 gap-6 md:gap-10 mb-10">
          <motion.div
            className="col-span-12 md:col-span-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface)]">
              <img src={formula[0].img} alt={formula[0].title}
                className="w-full h-full object-cover" />
            </div>
          </motion.div>

          <motion.div
            className="col-span-12 md:col-span-6 flex flex-col justify-center"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <div className="font-display text-[var(--gold)] text-7xl md:text-8xl mb-2 leading-none">
              {formula[0].n}
            </div>
            <h3 className="font-serif italic text-[var(--ink)] text-2xl md:text-3xl mb-4 max-w-md">
              {formula[0].title}
            </h3>
            <p className="text-[var(--ink-soft)] text-base leading-relaxed font-body max-w-md mb-6">
              {formula[0].desc}
            </p>
            <span className="inline-block bg-[var(--surface-2)] text-[var(--ink)] px-4 py-1.5 rounded-full text-[10px] tracking-[0.3em] uppercase font-body w-fit">
              {formula[0].tag}
            </span>
          </motion.div>
        </div>

        {/* Other ingredients — row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-[var(--border)]">
          {formula.slice(1).map((f, i) => (
            <motion.div
              key={f.n}
              className="border-l-2 border-[var(--gold)] pl-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="font-display text-[var(--gold)] text-5xl mb-3 leading-none">{f.n}</div>
              <h4 className="font-serif italic text-[var(--ink)] text-lg mb-2">{f.title}</h4>
              <p className="text-[var(--ink-soft)] text-sm leading-relaxed font-body">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   6. REAL STORIES — testimonials grid + product photo
   ───────────────────────────────────── */
const realCustomers = [
  { name: 'Aanya Sharma',  city: 'Mumbai',     text: 'Noir Absolu wears 12 hours easily — refined, smoky, never overpowering.' },
  { name: 'Vikram Iyer',   city: 'Bengaluru',  text: 'Lumière Dorée gets compliments at every meeting and weekend brunch.' },
  { name: 'Priya Mehra',   city: 'New Delhi',  text: 'Gentle on skin, powerful sillage — the room remembers Velmique long after I leave.' },
  { name: 'Rohan Kapoor',  city: 'Pune',       text: 'Velvet Oud is my wedding-season signature. The sandalwood base is unmistakable.' },
  { name: 'Ishaan Verma',  city: 'Hyderabad',  text: 'Rich, complex, beautifully composed. Worth every rupee — this is now my daily wear.' },
  { name: 'Kavya Reddy',   city: 'Chennai',    text: 'Finally a maison that takes perfumery seriously. The Kannauj rose is divine.' },
];

export function Testimonials() {
  return (
    <section className="bg-[var(--bg)] py-20 md:py-28">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">

        {/* Header */}
        <div className="mb-12">
          <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
            Reviews
          </p>
          <h2 className="font-display text-[var(--ink)] leading-[0.92] tracking-[-0.01em] max-w-3xl"
            style={{ fontSize: 'clamp(2rem, 5.5vw, 4.6rem)' }}>
            REAL STORIES FROM <em className="not-italic gold-text">REAL</em> CUSTOMERS
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Featured product photo */}
          <motion.div
            className="col-span-12 md:col-span-5 relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9 }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--surface-2)]">
              <img
                src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&q=85&auto=format&fit=crop"
                alt="Glow Serum"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 vertical-rl font-display text-white text-3xl md:text-4xl tracking-tight">
                NOIR ABSOLU
              </div>
            </div>
          </motion.div>

          {/* Testimonial cards grid */}
          <div className="col-span-12 md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {realCustomers.map((t, i) => (
              <motion.div
                key={t.name}
                className="bg-white rounded-xl p-5 md:p-6 border border-[var(--border)] flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
              >
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={11} className="fill-[var(--gold)] text-[var(--gold)]" />
                  ))}
                </div>
                <p className="text-[var(--ink-soft)] text-xs md:text-sm leading-relaxed font-body mb-4 flex-1">
                  {t.text}
                </p>
                <div className="mt-auto">
                  <p className="font-serif italic text-[var(--ink)] text-sm md:text-base">{t.name}</p>
                  {t.city && (
                    <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.2em] uppercase font-body mt-0.5">{t.city}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={14} className="fill-[var(--gold)] text-[var(--gold)]" />
            ))}
          </div>
          <span className="text-[var(--ink-soft)] text-sm font-body">
            <span className="font-serif italic text-[var(--ink)] text-lg">4.9</span>
            <span className="mx-2 text-[var(--ink-muted)]">·</span>
            2,400+ verified reviews
          </span>
          <Link href="/shop" className="pill-cta ml-2">
            See More
            <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
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
