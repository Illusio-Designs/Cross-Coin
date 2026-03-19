'use client';
import Link from 'next/link';
import { ArrowRight, Star, Instagram } from 'lucide-react';
import { collections, products, testimonials } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import { useState } from 'react';
import { Product } from '@/lib/data';

/* ─── Brand Values ─────────────────────────────────────────── */
const values = [
  { icon: '✦', label: 'Ethical Luxury', desc: 'Every piece crafted with conscious care' },
  { icon: '◆', label: 'Premium Fabrics', desc: 'Only the finest materials from around the world' },
  { icon: '❋', label: 'Free Returns', desc: '30-day no-questions-asked returns' },
  { icon: '◉', label: 'Members-Only Drops', desc: 'Exclusive releases for our inner circle' },
];

export function BrandValues() {
  return (
    <section className="border-y border-[#C9A84C]/15 bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {values.map(v => (
          <div key={v.label} className="flex flex-col items-center text-center gap-2">
            <span className="text-[#C9A84C] text-xl">{v.icon}</span>
            <p className="text-cream text-xs tracking-[0.15em] uppercase font-body">{v.label}</p>
            <p className="text-cream/40 text-xs font-body leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Marquee Strip ────────────────────────────────────────── */
export function MarqueeStrip() {
  const items = ['New Arrivals', 'Luxury Crafted', 'Velmique 2026', 'Luminara Collection', 'Evening Wear', 'Signature Pieces', 'Ethical Luxury'];
  return (
    <div className="bg-[#C9A84C]/10 border-y border-[#C9A84C]/20 py-3 overflow-hidden">
      <div className="marquee-content">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="inline-block mx-8 text-[#C9A84C] text-xs tracking-[0.3em] uppercase font-body">
            {item} <span className="text-[#C9A84C]/40 mx-2">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Featured Collections ─────────────────────────────────── */
export function FeaturedCollections() {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Curated for You</p>
        <h2 className="font-serif text-4xl md:text-5xl text-cream">Our Collections</h2>
        <div className="gold-divider w-24 mx-auto mt-4" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {collections.map((col, i) => (
          <Link key={col.id} href={`/collections/${col.slug}`}
            className={`relative group overflow-hidden rounded-sm ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
            <div className={`${i === 0 ? 'aspect-square md:aspect-auto md:h-full' : 'aspect-[3/4]'} overflow-hidden`}>
              <img src={col.image} alt={col.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="font-serif text-2xl text-cream">{col.name}</h3>
              <p className="text-cream/50 text-xs font-body mt-1">{col.productCount} pieces</p>
              <span className="inline-flex items-center gap-1 text-[#C9A84C] text-xs tracking-wider uppercase font-body mt-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                Explore <ArrowRight size={10} />
              </span>
            </div>
            {/* Gold border on hover */}
            <div className="absolute inset-0 border-2 border-[#C9A84C]/0 group-hover:border-[#C9A84C]/30 transition-all duration-300 rounded-sm" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Best Sellers ─────────────────────────────────────────── */
export function BestSellers() {
  const [quickView, setQuickView] = useState<Product | null>(null);
  const best = products.filter(p => p.badge === 'Bestseller' || p.rating >= 4.8).slice(0, 4);

  return (
    <section className="py-20 bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Most Loved</p>
            <h2 className="font-serif text-4xl text-cream">Bestsellers</h2>
          </div>
          <Link href="/shop" className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-body flex items-center gap-1 hover:gap-2 transition-all">
            View All <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {best.map(p => (
            <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
          ))}
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  );
}

/* ─── New Arrivals ─────────────────────────────────────────── */
export function NewArrivals() {
  const [quickView, setQuickView] = useState<Product | null>(null);
  const newItems = products.filter(p => p.badge === 'New');

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Just Arrived</p>
            <h2 className="font-serif text-4xl text-cream">New Arrivals</h2>
          </div>
          <Link href="/shop?filter=new" className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-body flex items-center gap-1 hover:gap-2 transition-all">
            See All <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {newItems.map(p => (
            <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
          ))}
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  );
}

/* ─── Promo Banner ─────────────────────────────────────────── */
export function PromoBanner() {
  return (
    <section className="relative h-[60vh] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
        alt="Promo"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/30" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-lg">
            <p className="text-[#C9A84C] text-xs tracking-[0.4em] uppercase font-body mb-4">Limited Time</p>
            <h2 className="font-serif text-5xl md:text-6xl text-cream leading-none mb-4">
              Up to<br /><span className="gold-text">30% Off</span><br />Select Pieces
            </h2>
            <p className="text-cream/60 font-body text-sm mb-8">Curated sale styles — shop before they're gone.</p>
            <Link href="/shop?filter=sale"
              className="btn-gold inline-flex items-center gap-2 px-8 py-4 text-xs tracking-[0.2em] uppercase font-body rounded-sm">
              Shop the Sale <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─────────────────────────────────────────── */
export function Testimonials() {
  const [active, setActive] = useState(0);
  const t = testimonials[active];

  return (
    <section className="py-24 bg-[#0d0d0d] border-y border-[#C9A84C]/10">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-10">What They Say</p>

        <div className="relative min-h-[160px]">
          <div className="flex justify-center mb-4">
            {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-[#C9A84C] text-[#C9A84C]" />)}
          </div>
          <blockquote className="font-serif text-xl md:text-2xl text-cream/90 italic leading-relaxed mb-6">
            "{t.text}"
          </blockquote>
          <div>
            <p className="text-cream text-sm font-body tracking-wider">{t.name}</p>
            <p className="text-cream/40 text-xs font-body mt-1">{t.location} · {t.product}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`transition-all duration-300 rounded-full ${i === active ? 'w-6 h-1.5 bg-[#C9A84C]' : 'w-1.5 h-1.5 bg-cream/20 hover:bg-cream/40'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Instagram Feed ───────────────────────────────────────── */
const igImages = [
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80',
  'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400&q=80',
  'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&q=80',
  'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=400&q=80',
  'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400&q=80',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80',
];

export function InstagramFeed() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Follow Along</p>
          <h2 className="font-serif text-3xl text-cream">@velmique</h2>
          <p className="text-cream/40 text-sm font-body mt-2">The feed of an extraordinary life</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {igImages.map((img, i) => (
            <a key={i} href="#" className="relative group aspect-square overflow-hidden rounded-sm">
              <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram size={20} className="text-[#C9A84C]" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
