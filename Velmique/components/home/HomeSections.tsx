'use client';
import Link from 'next/link';
import { ArrowRight, Star, Package, Truck, ShieldCheck, Headphones } from 'lucide-react';
import { collections, products, testimonials, discoveryKits, shopTheLooks } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import { useState } from 'react';
import { Product } from '@/lib/data';

/* ─── Services Bar ─────────────────────────────────────────── */
const services = [
  { icon: Truck, label: 'Free Delivery', desc: 'On orders over $150' },
  { icon: Package, label: 'Free Shipping', desc: 'On all prepaid orders' },
  { icon: ShieldCheck, label: 'Secure Payments', desc: '100% safe & encrypted' },
  { icon: Headphones, label: 'Customer Service', desc: 'Dedicated support team' },
];

export function ServicesBar() {
  return (
    <section className="bg-white border-y border-[#C9A84C]/20">
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {services.map(s => (
          <div key={s.label} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <s.icon size={18} className="text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-black text-xs font-semibold tracking-[0.1em] uppercase font-body">{s.label}</p>
              <p className="text-black/50 text-xs font-body mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Section Header ───────────────────────────────────────── */
function SectionHeader({ eyebrow, title, href }: { eyebrow: string; title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <p className="text-[#C9A84C] text-[10px] tracking-[0.35em] uppercase font-body mb-1">{eyebrow}</p>
        <h2 className="font-serif text-3xl md:text-4xl text-black">{title}</h2>
        <div className="h-px w-16 bg-[#C9A84C] mt-3" />
      </div>
      {href && (
        <Link href={href}
          className="text-black text-xs tracking-[0.2em] uppercase font-body border border-black/20 hover:border-[#C9A84C] hover:text-[#C9A84C] px-5 py-2.5 transition-all flex items-center gap-2">
          View All <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

/* ─── Best Sellers ─────────────────────────────────────────── */
export function BestSellers() {
  const [quickView, setQuickView] = useState<Product | null>(null);
  const best = products.filter(p => p.badge === 'Bestseller' || p.rating >= 4.8).slice(0, 5);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Must Have" title="Best Sellers" href="/shop" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {best.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickView} light />)}
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  );
}

/* ─── Gender Section ───────────────────────────────────────── */
export function GenderSection({ gender }: { gender: 'Men' | 'Women' }) {
  const [quickView, setQuickView] = useState<Product | null>(null);
  const items = products.filter(p => p.gender === gender || p.gender === 'Unisex').slice(0, 5);

  return (
    <section className={`py-16 ${gender === 'Men' ? 'bg-[#f8f8f8]' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Must Have" title={`For ${gender}`} href={`/shop?gender=${gender}`} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickView} light />)}
        </div>
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </section>
  );
}

/* ─── Collection Banner ────────────────────────────────────── */
export function CollectionBanner() {
  return (
    <section className="relative h-[55vh] min-h-[380px] overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&q=80"
        alt="Noir Collection"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-md">
            <p className="text-[#C9A84C] text-[10px] tracking-[0.4em] uppercase font-body mb-3">Noir Collection</p>
            <h2 className="font-serif text-5xl md:text-6xl text-white leading-none mb-4">
              Darkness<br />Distilled
            </h2>
            <p className="text-white/60 font-body text-sm mb-8 leading-relaxed">
              Oud, frankincense, and smoked woods — our darkest, most magnetic creations.
            </p>
            <Link href="/collections/noir"
              className="inline-flex items-center gap-3 bg-[#C9A84C] text-black px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-body font-semibold hover:bg-white transition-colors">
              Shop Now <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Shop the Look ────────────────────────────────────────── */
export function ShopTheLook() {
  return (
    <section className="py-16 bg-[#f8f8f8]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[#C9A84C] text-[10px] tracking-[0.35em] uppercase font-body mb-2">Our Looks</p>
          <h2 className="font-serif text-3xl md:text-4xl text-black">Shop the Scent</h2>
          <div className="h-px w-16 bg-[#C9A84C] mx-auto mt-3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shopTheLooks.map(look => (
            <div key={look.id} className="relative group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={look.image} alt="Shop the look"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/60 text-[10px] tracking-[0.2em] uppercase font-body mb-1">Featured</p>
                    <div className="flex flex-wrap gap-2">
                      {look.products.map((name, i) => (
                        <Link key={i} href={`/product/${look.slugs[i]}`}
                          className="text-white text-xs font-body hover:text-[#C9A84C] transition-colors">
                          {name}{i < look.products.length - 1 ? ' ·' : ''}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Link href={`/product/${look.slugs[0]}`}
                    className="bg-[#C9A84C] text-black text-[10px] tracking-[0.2em] uppercase font-body font-semibold px-4 py-2 hover:bg-white transition-colors flex items-center gap-1.5">
                    Shop Look <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Discovery Kits ───────────────────────────────────────── */
export function DiscoveryKits() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader eyebrow="Try Before You Commit" title="Discovery Kits" href="/shop?category=Discovery+Sets" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          {discoveryKits.map(kit => (
            <Link key={kit.id} href={`/product/${kit.slug}`}
              className="group border border-black/10 hover:border-[#C9A84C] transition-all overflow-hidden">
              <div className="aspect-square overflow-hidden bg-[#f8f8f8]">
                <img src={kit.image} alt={kit.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-[#C9A84C] text-[10px] tracking-[0.2em] uppercase font-body mb-1">{kit.includes}</p>
                <h3 className="font-serif text-lg text-black">{kit.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-black font-body text-sm font-semibold">${kit.price}</span>
                  <span className="text-[#C9A84C] text-[10px] tracking-[0.2em] uppercase font-body flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    View Kit <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── World of Fragrances ──────────────────────────────────── */
export function WorldOfFragrances() {
  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[#C9A84C] text-[10px] tracking-[0.4em] uppercase font-body mb-3">Explore</p>
          <h2 className="font-serif text-4xl md:text-5xl text-white">World of Captivating Fragrances</h2>
          <p className="text-white/40 font-body text-sm mt-3">Discover Our Exquisite Collection</p>
          <div className="h-px w-20 bg-[#C9A84C] mx-auto mt-5" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {collections.map(col => (
            <Link key={col.id} href={`/collections/${col.slug}`}
              className="group relative overflow-hidden">
              <div className="aspect-[3/4] overflow-hidden">
                <img src={col.image} alt={col.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-75 group-hover:brightness-90" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 border border-[#C9A84C]/0 group-hover:border-[#C9A84C]/50 transition-all duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                <h3 className="font-serif text-xl text-white">{col.name}</h3>
                <p className="text-[#C9A84C] text-[10px] tracking-[0.2em] uppercase font-body mt-1">{col.tagline}</p>
                <span className="inline-flex items-center gap-1 text-white/60 text-[10px] tracking-wider uppercase font-body mt-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  View products <ArrowRight size={9} />
                </span>
              </div>
            </Link>
          ))}
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
    <section className="py-20 bg-white border-t border-black/5">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-[#C9A84C] text-[10px] tracking-[0.35em] uppercase font-body mb-10">What They Say</p>
        <div className="relative min-h-[160px]">
          <div className="flex justify-center mb-5">
            {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-[#C9A84C] text-[#C9A84C] mx-0.5" />)}
          </div>
          <blockquote className="font-serif text-xl md:text-2xl text-black/80 italic leading-relaxed mb-6">
            "{t.text}"
          </blockquote>
          <div>
            <p className="text-black text-sm font-body tracking-wider font-semibold">{t.name}</p>
            <p className="text-black/40 text-xs font-body mt-1">{t.location} · {t.product}</p>
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`transition-all duration-300 rounded-full ${i === active ? 'w-6 h-1.5 bg-[#C9A84C]' : 'w-1.5 h-1.5 bg-black/15 hover:bg-black/30'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
