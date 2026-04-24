'use client';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Star } from 'lucide-react';
import { collections, products, testimonials, discoveryKits, shopTheLooks } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import { useState } from 'react';
import { motion } from 'framer-motion';

/* ─────────────────────────────────────
   MARQUEE — infinite luxury strip
   ───────────────────────────────────── */
const marqueeItems = ['MAISON DE PARFUM', '—', 'EST. 1998', '—', 'HAND-CRAFTED IN PARIS', '—', 'GRASSE ESSENCES', '—', 'EXTRAIT DE PARFUM'];

export function Marquee() {
  return (
    <div className="bg-[#1f1b16] py-5 overflow-hidden border-t border-b border-[#1f1b16]">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...Array(4)].map((_, n) => (
          <div key={n} className="flex items-center gap-8 mx-8">
            {marqueeItems.map((item, i) => (
              <span key={`${n}-${i}`} className={`font-serif text-[#f7f2e8] text-xl md:text-3xl ${item === '—' ? 'text-[#d4927f]' : 'tracking-[0.2em]'}`}>
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   SECTION HEADER (reusable)
   ───────────────────────────────────── */
function Header({ eyebrow, title, accent, href, align = 'left' }) {
  const flex = align === 'center' ? 'flex-col items-center text-center' : 'items-end justify-between';
  return (
    <motion.div
      className={`flex ${flex} mb-12 gap-6`}
      initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <div className={align === 'center' ? 'text-center' : ''}>
        <motion.div
          className={`flex items-center gap-3 mb-4 ${align === 'center' ? 'justify-center' : ''}`}
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
        >
          <span className="h-px w-10 bg-[#b8624f]" />
          <span className="text-[#d4927f] text-[10px] tracking-[0.45em] uppercase font-body">{eyebrow}</span>
          {align === 'center' && <span className="h-px w-10 bg-[#b8624f]" />}
        </motion.div>
        <motion.h2
          className="font-serif text-[#f3ede0] text-4xl md:text-5xl lg:text-6xl leading-[1.05]"
          variants={{ hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } }}
        >
          {title} {accent && <em className="text-[#d4927f] not-italic">{accent}</em>}
        </motion.h2>
      </div>
      {href && align !== 'center' && (
        <motion.div
          variants={{ hidden: { opacity: 0, x: 15 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.2 } } }}
        >
          <Link href={href}
            className="group inline-flex items-center gap-3 text-[#f3ede0] text-[11px] tracking-[0.4em] uppercase font-body border-b border-[#1f1b16] pb-1 hover:border-[#b8624f] hover:text-[#d4927f] transition-colors">
            View All
            <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────
   PRODUCT GRID (stagger reveal)
   ───────────────────────────────────── */
function Grid({ items, onQuickView }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
      {items.map((p, i) => (
        <ProductCard key={p.id} product={p} onQuickView={onQuickView} index={i} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────
   BEST SELLERS
   ───────────────────────────────────── */
export function BestSellers() {
  const [quickView, setQuickView] = useState(null);
  const best = products.filter(p => p.badge === 'Bestseller' || p.rating >= 4.8).slice(0, 4);

  return (
    <section className="py-24 bg-[#14110e]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <Header eyebrow="Must Have" title="Signature" accent="Bestsellers" href="/shop" />
        <Grid items={best} onQuickView={setQuickView} />
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  );
}

/* ─────────────────────────────────────
   STORY BAND — Our craft
   ───────────────────────────────────── */
export function StoryBand() {
  return (
    <section className="relative bg-[#26211b]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-24 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        {/* Image */}
        <motion.div
          className="md:col-span-5 relative"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Decorative offset frame — rendered first, sits behind the image via DOM order */}
          <div className="absolute -top-5 -left-5 w-full h-full border border-[#b8624f] pointer-events-none" />
          <div className="relative aspect-[4/5] overflow-hidden bg-[#1f1b16]">
            <img
              src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=85"
              alt="Perfume craft"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="md:col-span-7 md:pl-10"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-10 bg-[#b8624f]" />
            <span className="text-[#d4927f] text-[10px] tracking-[0.45em] uppercase">Our Craft</span>
          </div>
          <h2 className="font-serif text-[#f3ede0] text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-7">
            Patience,<br /><em className="text-[#d4927f] not-italic">distilled.</em>
          </h2>
          <p className="text-[#b8b0a2] text-base md:text-lg leading-relaxed mb-5 font-body max-w-lg">
            Each formula begins with a walk through the fields of Grasse. Petals are harvested at dawn, absolutes pressed by hand, and the final extrait rests for three months before bottling.
          </p>
          <p className="text-[#b8b0a2] text-base md:text-lg leading-relaxed mb-10 font-body max-w-lg">
            Nothing is rushed. Nothing is wasted. Nothing is left to chance.
          </p>
          <Link href="/about"
            className="group inline-flex items-center gap-3 text-[#f3ede0] text-[11px] tracking-[0.4em] uppercase font-body border-b border-[#1f1b16] pb-1.5 hover:border-[#b8624f] hover:text-[#d4927f] transition-colors">
            Read Our Story
            <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-14 pt-10 border-t border-[#2e2821] max-w-lg">
            {[
              { n: '25+', l: 'Years' },
              { n: '48', l: 'Fragrances' },
              { n: '1998', l: 'Est. Paris' },
            ].map(s => (
              <div key={s.l}>
                <div className="font-serif italic text-3xl md:text-4xl text-[#d4927f]">{s.n}</div>
                <div className="text-[#7a7368] text-[10px] tracking-[0.35em] uppercase mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   COLLECTION BANNER — Noir full-bleed
   ───────────────────────────────────── */
export function CollectionBanner() {
  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden group bg-[#1f1b16]">
      <motion.img
        src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=85"
        alt="Noir Collection"
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.12 }}
        whileInView={{ scale: 1.02 }}
        viewport={{ once: true }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: 'brightness(0.55)' }}
      />

      <motion.div
        className="absolute inset-0 flex items-end"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
        variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } } }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 w-full pb-16">
          <motion.div className="flex items-center gap-3 mb-6"
            variants={{ hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } }}
          >
            <span className="h-px w-10 bg-[#d4927f]" />
            <span className="text-[#d4927f] text-[10px] tracking-[0.45em] uppercase">Featured Collection</span>
          </motion.div>

          <motion.h2
            className="font-serif text-[#f7f2e8] text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-6 max-w-2xl"
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
          >
            Darkness,<br /><em className="text-[#d4927f] not-italic">distilled.</em>
          </motion.h2>

          <motion.p
            className="text-[#f7f2e8]/60 text-base md:text-lg max-w-md mb-10 font-body"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
          >
            Oud, smoked woods, and the quiet weight of frankincense — for those who prefer to arrive unnoticed and linger afterward.
          </motion.p>

          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
            <Link href="/collections/noir"
              className="group/cta inline-flex items-center gap-3 bg-[#14110e] text-[#f3ede0] px-10 py-4 text-[11px] tracking-[0.4em] uppercase font-body relative overflow-hidden">
              <span className="relative z-10">Enter Noir</span>
              <ArrowRight size={13} className="relative z-10 transition-transform group-hover/cta:translate-x-1" />
              <span className="absolute inset-0 bg-[#b8624f] translate-y-full group-hover/cta:translate-y-0 transition-transform duration-500" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────
   GENDER SECTION
   ───────────────────────────────────── */
export function GenderSection({ gender }) {
  const [quickView, setQuickView] = useState(null);
  const items = products.filter(p => p.gender === gender || p.gender === 'Unisex').slice(0, 4);

  return (
    <section className="py-24 bg-[#14110e]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <Header eyebrow="Curated" title={`For ${gender}`} href={`/shop?gender=${gender}`} />
        <Grid items={items} onQuickView={setQuickView} />
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  );
}

/* ─────────────────────────────────────
   FRAGRANCE PYRAMID — unique interactive
   ───────────────────────────────────── */
const pyramid = [
  { cat: 'Top', label: 'Opening', notes: ['Bergamot', 'Pink Pepper', 'Neroli', 'Saffron'], desc: 'The first impression — volatile citrus and spice that fade within minutes.' },
  { cat: 'Heart', label: 'Soul', notes: ['Bulgarian Rose', 'Jasmine Sambac', 'Iris', 'Tuberose'], desc: 'The character — florals and spices that define the scent for hours.' },
  { cat: 'Base', label: 'Signature', notes: ['Oud', 'Sandalwood', 'Amber', 'White Musk'], desc: 'The memory — woods and resins that linger on skin overnight.' },
];

export function NotesBand() {
  const [active, setActive] = useState(1); // start on Heart

  return (
    <section className="py-24 bg-[#1d1915] relative overflow-hidden">
      {/* faint circular watermarks */}
      <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full border border-[#b8624f]/10" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full border border-[#b8624f]/10" />

      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 relative">
        <Header eyebrow="The Composition" title="Fragrance" accent="pyramid" align="center" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-8">
          {/* LEFT — interactive triangle pyramid */}
          <motion.div
            className="relative h-[420px] flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* SVG triangle */}
            <svg viewBox="0 0 400 360" className="w-full max-w-[420px]">
              {/* Base layer */}
              <motion.polygon
                points="30,330 370,330 340,230 60,230"
                fill={active === 2 ? '#b8624f' : '#ebe3d1'}
                stroke="#b8624f"
                strokeWidth="1"
                onClick={() => setActive(2)}
                className="cursor-pointer transition-colors duration-500"
                whileHover={{ scale: 1.02 }}
              />
              {/* Heart layer */}
              <motion.polygon
                points="60,230 340,230 310,130 90,130"
                fill={active === 1 ? '#b8624f' : '#ebe3d1'}
                stroke="#b8624f"
                strokeWidth="1"
                onClick={() => setActive(1)}
                className="cursor-pointer transition-colors duration-500"
              />
              {/* Top layer */}
              <motion.polygon
                points="90,130 310,130 200,30"
                fill={active === 0 ? '#b8624f' : '#ebe3d1'}
                stroke="#b8624f"
                strokeWidth="1"
                onClick={() => setActive(0)}
                className="cursor-pointer transition-colors duration-500"
              />
              {/* Labels */}
              <text x="200" y="90" textAnchor="middle" className="fill-current" fill={active === 0 ? '#f7f2e8' : '#1f1b16'} style={{ font: 'italic 18px Playfair Display, serif', pointerEvents: 'none' }}>Top</text>
              <text x="200" y="190" textAnchor="middle" className="fill-current" fill={active === 1 ? '#f7f2e8' : '#1f1b16'} style={{ font: 'italic 20px Playfair Display, serif', pointerEvents: 'none' }}>Heart</text>
              <text x="200" y="290" textAnchor="middle" className="fill-current" fill={active === 2 ? '#f7f2e8' : '#1f1b16'} style={{ font: 'italic 20px Playfair Display, serif', pointerEvents: 'none' }}>Base</text>
            </svg>

            {/* Small caption */}
            <p className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[#7a7368] text-[9px] tracking-[0.4em] uppercase">Click a layer</p>
          </motion.div>

          {/* RIGHT — note details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="font-serif italic text-[#d4927f] text-2xl mb-2">{pyramid[active].label}</p>
              <h3 className="font-serif text-[#f3ede0] text-4xl md:text-5xl mb-4">{pyramid[active].cat} Notes</h3>
              <p className="text-[#b8b0a2] text-base md:text-lg leading-relaxed mb-8 max-w-md font-body">
                {pyramid[active].desc}
              </p>
              <div className="flex flex-wrap gap-2">
                {pyramid[active].notes.map(n => (
                  <span key={n} className="inline-block px-4 py-2 border border-[#2e2821] text-[#f3ede0] text-[11px] tracking-[0.3em] uppercase font-body hover:bg-[#1f1b16] hover:text-[#f7f2e8] transition-colors cursor-default">
                    {n}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   SHOP THE LOOK
   ───────────────────────────────────── */
export function ShopTheLook() {
  return (
    <section className="py-24 bg-[#14110e]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <Header eyebrow="Our Looks" title="Shop the" accent="scent" href="/lookbook" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {shopTheLooks.slice(0, 2).map((look, idx) => (
            <motion.div
              key={look.id}
              className="group relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: idx * 0.15 }}
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#26211b]">
                <img src={look.image} alt="Shop the look"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f1b16] via-[#1f1b16]/20 to-transparent" />
              <div className="absolute top-5 right-5 font-serif italic text-[#f7f2e8]/70 text-3xl">0{idx + 1}</div>
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-[#d4927f] text-[10px] tracking-[0.4em] uppercase mb-2">Featured Pairing</p>
                <div className="flex flex-wrap gap-x-2 gap-y-1 mb-5">
                  {look.products.map((name, i) => (
                    <Link key={i} href={`/product/${look.slugs[i]}`}
                      className="font-serif text-[#f7f2e8] text-xl italic hover:text-[#d4927f] transition-colors">
                      {name}{i < look.products.length - 1 ? <span className="text-[#d4927f] mx-1">·</span> : ''}
                    </Link>
                  ))}
                </div>
                <Link href={`/product/${look.slugs[0]}`}
                  className="group/btn inline-flex items-center gap-2 text-[#f7f2e8] text-[11px] tracking-[0.4em] uppercase">
                  <span className="w-6 h-px bg-[#14110e] transition-all group-hover/btn:w-10 group-hover/btn:bg-[#d4927f]" />
                  Shop the Look
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   DISCOVERY KITS
   ───────────────────────────────────── */
export function DiscoveryKits() {
  return (
    <section className="py-24 bg-[#26211b]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <Header eyebrow="Try Before You Commit" title="Discovery" accent="kits" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {discoveryKits.map((kit, i) => (
            <motion.div
              key={kit.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              <Link href={`/product/${kit.slug}`}
                className="group relative block bg-[#1d1915] border border-[#2e2821] hover:border-[#b8624f] transition-colors overflow-hidden">
                <div className="grid grid-cols-5 items-stretch">
                  <div className="col-span-2 aspect-square overflow-hidden bg-[#26211b]">
                    <img src={kit.image} alt={kit.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="col-span-3 p-6 flex flex-col justify-center">
                    <p className="text-[#7a7368] text-[9px] tracking-[0.35em] uppercase mb-1.5">{kit.includes}</p>
                    <h3 className="font-serif text-[#f3ede0] text-xl italic mb-4 leading-tight">{kit.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-[#d4927f] text-2xl italic">₹{kit.price}</span>
                      <span className="text-[#f3ede0] group-hover:text-[#d4927f] text-[10px] tracking-[0.35em] uppercase flex items-center gap-1.5 transition-colors">
                        Explore <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
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
   WORLD OF FRAGRANCES — collections grid
   ───────────────────────────────────── */
export function WorldOfFragrances() {
  return (
    <section className="py-24 bg-[#1f1b16]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <motion.div
          className="flex flex-col items-center text-center mb-14"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-[#d4927f]" />
            <span className="text-[#d4927f] text-[10px] tracking-[0.45em] uppercase">Explore</span>
            <span className="h-px w-10 bg-[#d4927f]" />
          </div>
          <h2 className="font-serif text-[#f7f2e8] text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
            Worlds to <em className="text-[#d4927f] not-italic">discover.</em>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {collections.map((col, i) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
            >
              <Link href={`/collections/${col.slug}`} className="group relative block overflow-hidden">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={col.image} alt={col.name}
                    className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110 brightness-[0.7] group-hover:brightness-90" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f1b16] via-[#1f1b16]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-center">
                  <h3 className="font-serif italic text-[#f7f2e8] text-xl md:text-2xl">{col.name}</h3>
                  <p className="text-[#d4927f] text-[9px] tracking-[0.35em] uppercase mt-1.5">{col.tagline}</p>
                  <span className="inline-flex items-center gap-1.5 text-[#f7f2e8]/60 text-[9px] tracking-[0.35em] uppercase mt-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                    Enter <ArrowRight size={9} />
                  </span>
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
   TESTIMONIALS — minimal 3-column
   ───────────────────────────────────── */
/* ─────────────────────────────────────
   TESTIMONIALS — infinite smooth marquee
   ───────────────────────────────────── */
export function Testimonials() {
  // Duplicate the list so the marquee loops seamlessly
  const loop = [...testimonials, ...testimonials, ...testimonials];

  return (
    <section className="py-24 bg-[#14110e] border-t border-[#2e2821] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
        <Header eyebrow="Reviews" title="What they" accent="say." align="center" />
      </div>

      {/* Full-bleed marquee container with side fades */}
      <div className="relative mt-4">
        {/* Left/right gradient fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-[#14110e] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 md:w-40 bg-gradient-to-l from-[#14110e] to-transparent z-10" />

        <div className="group flex overflow-hidden py-6">
          <div className="flex animate-testi-scroll gap-6 shrink-0">
            {loop.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                className="shrink-0 w-[340px] md:w-[400px] bg-[#1d1915] border border-[#2e2821] p-8 hover:border-[#b8624f]/50 transition-colors"
              >
                <div className="flex gap-1 mb-5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} className={s <= t.rating ? 'fill-[#d4927f] text-[#d4927f]' : 'text-[#2e2821]'} />
                  ))}
                </div>
                <blockquote className="font-serif italic text-[#f3ede0] text-lg leading-[1.55] mb-6 line-clamp-5">
                  "{t.text}"
                </blockquote>
                <div className="pt-5 border-t border-[#2e2821]">
                  <p className="font-serif italic text-[#f3ede0] text-base">{t.name}</p>
                  <p className="text-[#7a7368] text-[10px] tracking-[0.3em] uppercase mt-1">
                    {t.location} · {t.product}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 mt-10 text-center">
        <div className="inline-flex items-center gap-4">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-[#d4927f] text-[#d4927f]" />)}
          </div>
          <span className="text-[#b8b0a2] text-sm font-body">
            <span className="font-serif italic text-[#f3ede0] text-lg">4.9</span>
            <span className="mx-2 text-[#7a7368]">·</span>
            2,400+ verified reviews
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes testi-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-100% / 3)); }
        }
        .animate-testi-scroll {
          animation: testi-scroll 40s linear infinite;
          will-change: transform;
        }
        .group:hover .animate-testi-scroll {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
/* ─────────────────────────────────────
   KEEP legacy export for compatibility
   ───────────────────────────────────── */
export const ServicesBar = Marquee;
