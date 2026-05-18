import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ProductCard from '../../components/products/ProductCard';

const SAMPLE = {
  name: 'Performance Trail',
  collection: 'Athletic',
  serial: 'N°.001',
  price: 599,
  salePrice: 449,
  rating: 4.9,
  reviews: 218,
  description:
    'A cushion-zoned crew sock built for trail miles and grocery aisles alike. The body is combed cotton for breathability, the toe and heel reinforced with recycled nylon, and the arch held by a low-stretch elastic that wakes the foot up without pinching it.',
  details: [
    'Body — 78% combed cotton, 19% recycled nylon, 3% elastane',
    'Toe + heel — hand-linked, no seam ridges',
    'Arch — low-stretch compression band',
    'Cuff — 1×1 ribbed, holds without biting',
    'Care — cold wash, lay flat, no tumble',
  ],
  sizes: ['S', 'M', 'L', 'XL'],
  colors: [
    { name: 'Ink',       hex: '#141414' },
    { name: 'Charcoal',  hex: '#3A3A3A' },
    { name: 'Slate',     hex: '#6B6B6B' },
    { name: 'Chalk',     hex: '#ECECEC' },
  ],
  images: [
    'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1400&q=85&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=1400&q=85&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542219550-37153d387c27?w=1400&q=85&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1577538928305-3807c3993047?w=1400&q=85&auto=format&fit=crop',
  ],
};

const RELATED = [
  { id: '2', name: 'Heritage Charcoal', slug: 'heritage-charcoal', collection: 'Dress',    price: 799, badge: 'New', images: ['https://images.unsplash.com/photo-1589810635657-232948472d98?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1607793483011-d10bb1d8be0c?w=900&q=80&auto=format&fit=crop'] },
  { id: '3', name: 'Weekend Oat',       slug: 'weekend-oat',       collection: 'Casual',   price: 549, images: ['https://images.unsplash.com/photo-1542219550-37153d387c27?w=900&q=80&auto=format&fit=crop'] },
  { id: '4', name: 'Merino Forest',     slug: 'merino-forest',     collection: 'Wool',     price: 899, salePrice: 649, badge: 'Limited', images: ['https://images.unsplash.com/photo-1577538928305-3807c3993047?w=900&q=80&auto=format&fit=crop'] },
  { id: '6', name: 'Court Crew',        slug: 'court-crew',        collection: 'Athletic', price: 499, images: ['https://images.unsplash.com/photo-1567010892083-3b2e2b6cd24c?w=900&q=80&auto=format&fit=crop'] },
];

export default function ProductDetail() {
  const product = SAMPLE;
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState(product.sizes[1]);
  const [color, setColor] = useState(product.colors[0].name);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  const price = product.salePrice ?? product.price;
  const discount = product.salePrice ? Math.round((1 - product.salePrice / product.price) * 100) : 0;

  return (
    <>
      <Head><title>{product.name} — Gripzus</title></Head>
      <main className="bg-paper">

        {/* Breadcrumb */}
        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 pt-8">
          <p className="eyebrow">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-2 text-line">/</span>
            <Link href="/products" className="hover:text-ink">Catalogue</Link>
            <span className="mx-2 text-line">/</span>
            <span className="text-ink">{product.name}</span>
          </p>
        </div>

        {/* Gallery + Info */}
        <section className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14">

            {/* Gallery */}
            <div className="md:col-span-7">
              <div className="relative aspect-square bg-paper-deep overflow-hidden">
                <img src={product.images[activeImg]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute top-5 left-5 eyebrow">{product.serial}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative aspect-square bg-paper-deep overflow-hidden transition-all ${
                      activeImg === i ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-5">
                <span className="eyebrow">{product.collection} · {product.serial}</span>
                {product.salePrice && (
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase bg-clay text-paper px-2 py-0.5">
                    {discount}% Off
                  </span>
                )}
              </div>

              <h1 className="h-display text-4xl md:text-5xl lg:text-6xl uppercase mb-4">{product.name}</h1>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= Math.round(product.rating) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={s <= Math.round(product.rating) ? 'text-clay' : 'text-line'}>
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <span className="eyebrow">{product.rating} · {product.reviews} reviews</span>
              </div>

              <div className="flex items-baseline gap-3 mb-8 pb-8 border-b border-line">
                <span className="font-display font-bold text-ink text-4xl">₹{price.toLocaleString('en-IN')}</span>
                {product.salePrice && (
                  <span className="font-mono text-ink-muted text-base line-through">₹{product.price.toLocaleString('en-IN')}</span>
                )}
              </div>

              {/* Colour */}
              <div className="mb-7">
                <p className="eyebrow mb-3">Colour — <span className="text-ink">{color}</span></p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      title={c.name}
                      className={`w-10 h-10 rounded-full border transition-all ${
                        color === c.name ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'border-line hover:border-ink'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-8">
                <p className="eyebrow mb-3">Size — <span className="text-ink">{size}</span></p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-[3.5rem] px-4 py-3 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors ${
                        size === s ? 'bg-ink text-paper' : 'border border-line text-ink hover:border-ink'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty + actions */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border border-line">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-12 flex items-center justify-center hover:bg-paper-deep">−</button>
                  <span className="w-12 text-center font-mono text-sm">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="w-11 h-12 flex items-center justify-center hover:bg-paper-deep">+</button>
                </div>
                <button className="flex-1 cta justify-center !py-4">Add to Bag</button>
                <button
                  onClick={() => setWishlisted((w) => !w)}
                  aria-label="Wishlist"
                  className={`w-12 h-12 border flex items-center justify-center transition-colors ${
                    wishlisted ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
                  </svg>
                </button>
              </div>
              <button className="w-full cta-ghost justify-center !py-4 mb-9">Buy Now</button>

              {/* Description */}
              <div className="mb-8">
                <p className="eyebrow mb-3">About this pair</p>
                <p className="prose-body text-sm md:text-base">{product.description}</p>
              </div>

              {/* Spec sheet */}
              <div className="border-t border-line pt-7">
                <p className="eyebrow mb-4">Spec sheet</p>
                <ul className="divide-y divide-line">
                  {product.details.map((d, i) => (
                    <li key={i} className="flex gap-4 py-2.5">
                      <span className="eyebrow text-clay shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-ink-soft text-sm">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Related */}
        <section className="bg-paper-deep border-t border-line py-20 md:py-24">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20">
            <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
              <div>
                <p className="eyebrow mb-4">More from the archive</p>
                <h2 className="h-display text-4xl md:text-6xl">Pairs <em className="h-italic">like this.</em></h2>
              </div>
              <Link href="/products" className="cta-ghost">See all</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
              {RELATED.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
