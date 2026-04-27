'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Heart, Share2, ChevronRight, Star, Minus, Plus, ArrowUpRight } from 'lucide-react';
import { products } from '@/lib/data';
import { useStore } from '@/lib/store';
import ProductCard from '@/components/shop/ProductCard';

export default function ProductPage() {
  const params = useParams();
  const product = products.find(p => p.slug === params.slug);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();

  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [added, setAdded] = useState(false);

  if (!product) return (
    <div className="bg-[var(--bg)] pt-32 pb-20 text-center min-h-screen">
      <p className="font-display text-3xl text-[var(--ink-muted)] uppercase tracking-tight">Product not found</p>
      <Link href="/shop" className="pill-cta mt-8">← Back to Shop</Link>
    </div>
  );

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    addToCart({ id: product.id, name: product.name, price: product.price, image: product.images[0], size: selectedSize, slug: product.slug });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-6 flex items-center gap-2 text-xs font-body text-[var(--ink-muted)]">
        <Link href="/" className="hover:text-[var(--gold-deep)] transition-colors">Home</Link>
        <ChevronRight size={10} />
        <Link href="/shop" className="hover:text-[var(--gold-deep)] transition-colors">Shop</Link>
        <ChevronRight size={10} />
        <span className="text-[var(--ink)]">{product.name}</span>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Images */}
          <div className="flex gap-4">
            {product.images.length > 1 && (
              <div className="flex flex-col gap-3 w-20">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${activeImg === i ? 'border-[var(--gold)]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--surface-2)] relative">
              <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              {product.badge && (
                <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] uppercase px-4 py-1.5 font-body rounded-full bg-white text-[var(--ink)]">
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
                {product.collection} Maison
              </p>
              <h1 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.6rem)' }}>
                {product.name}
              </h1>

              <div className="flex items-center gap-2 mt-4">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={13} className={s <= Math.round(product.rating) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border)]'} />
                  ))}
                </div>
                <span className="text-[var(--ink-soft)] text-sm font-body">{product.rating} ({product.reviews} reviews)</span>
              </div>

              <div className="flex items-baseline gap-3 mt-5 flex-wrap">
                <span className="font-serif italic text-[var(--ink)] text-3xl md:text-4xl">₹{Number(product.price).toLocaleString('en-IN')}</span>
                {product.originalPrice && (
                  <>
                    <span className="text-[var(--ink-muted)] text-base line-through font-body">₹{Number(product.originalPrice).toLocaleString('en-IN')}</span>
                    <span className="text-[var(--gold-deep)] text-xs font-body tracking-wider uppercase">
                      Save ₹{Number(product.originalPrice - product.price).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[var(--ink-muted)] text-xs font-body mt-2">Inclusive of 18% GST · Free shipping over ₹2,500</p>
            </div>

            <p className="text-[var(--ink-soft)] text-base font-body leading-relaxed">{product.description}</p>

            <div className="h-px bg-[var(--border)]" />

            {/* Sizes */}
            {product.sizes && (
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">
                  Size: <span className="text-[var(--ink)]">{selectedSize || 'Select a size'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`px-5 h-11 text-xs font-body border rounded-full transition-all ${
                        selectedSize === s
                          ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                          : 'border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)]'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Quantity</p>
              <div className="flex items-center border border-[var(--border)] w-fit rounded-full">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-3 text-[var(--ink-soft)] hover:text-[var(--gold-deep)] transition-colors">
                  <Minus size={14} />
                </button>
                <span className="px-6 text-[var(--ink)] font-body text-sm">{qty}</span>
                <button onClick={() => setQty(qty + 1)}
                  className="px-4 py-3 text-[var(--ink-soft)] hover:text-[var(--gold-deep)] transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-3">
              <button onClick={handleAddToCart}
                className={`pill-cta flex-1 justify-center !py-4 !px-6 ${added ? '!bg-green-700' : ''}`}>
                <ShoppingBag size={14} />
                {added ? 'Added to Bag ✓' : 'Add to Bag'}
              </button>
              <button onClick={() => toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
                className={`w-14 h-14 flex items-center justify-center border rounded-full transition-all ${
                  wishlisted ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-deep)]' : 'border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)]'
                }`}>
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
              <button className="w-14 h-14 flex items-center justify-center border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--gold-deep)] hover:border-[var(--gold)] rounded-full transition-all">
                <Share2 size={16} />
              </button>
            </div>

            <p className="text-[var(--ink-muted)] text-xs font-body">
              ✦ Free shipping over ₹2,500 · 14-day sealed-bottle returns · UPI / Card / NetBanking
            </p>

            <div className="h-px bg-[var(--border)]" />

            {/* Tabs */}
            <div>
              <div className="flex gap-7 border-b border-[var(--border)]">
                {['description', 'details', 'reviews'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-[10px] tracking-[0.3em] uppercase font-body transition-all ${
                      activeTab === tab ? 'text-[var(--ink)] border-b-2 border-[var(--gold)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="pt-5">
                {activeTab === 'description' && (
                  <p className="text-[var(--ink-soft)] text-sm font-body leading-relaxed">{product.description}</p>
                )}
                {activeTab === 'details' && (
                  <ul className="space-y-2.5">
                    {product.details.map((d, i) => (
                      <li key={i} className="text-[var(--ink-soft)] text-sm font-body flex items-start gap-3">
                        <span className="text-[var(--gold)] text-xs mt-1">✦</span> {d}
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === 'reviews' && (
                  <div className="text-center py-6">
                    <div className="flex justify-center gap-1 mb-3">
                      {[1,2,3,4,5].map(s => <Star key={s} size={20} className="fill-[var(--gold)] text-[var(--gold)]" />)}
                    </div>
                    <p className="font-serif italic text-[var(--ink)] text-3xl">{product.rating}</p>
                    <p className="text-[var(--ink-muted)] text-xs font-body mt-1 tracking-wider uppercase">Based on {product.reviews} reviews</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-24 pt-16 border-t border-[var(--border)]">
            <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
              <div>
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Continue Exploring</p>
                <h2 className="font-display text-[var(--ink)] uppercase leading-tight tracking-tight"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)' }}>
                  YOU MAY ALSO <em className="not-italic gold-text">LIKE</em>
                </h2>
              </div>
              <Link href="/shop" className="pill-cta pill-cta-light">
                View All <ArrowUpRight size={14} strokeWidth={1.6} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
