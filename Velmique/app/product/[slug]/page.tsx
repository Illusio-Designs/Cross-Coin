'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Heart, Share2, ChevronRight, Star, Minus, Plus, ArrowRight } from 'lucide-react';
import { products } from '@/lib/data';
import { useStore } from '@/lib/store';
import ProductCard from '@/components/shop/ProductCard';

export default function ProductPage() {
  const params = useParams();
  const product = products.find(p => p.slug === params.slug);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0]?.name || '');
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description');
  const [added, setAdded] = useState(false);

  if (!product) return (
    <div className="pt-32 text-center min-h-screen">
      <p className="font-serif text-2xl text-cream/40">Product not found</p>
      <Link href="/shop" className="text-[#C9A84C] text-xs uppercase tracking-wider mt-4 inline-block font-body">← Back to Shop</Link>
    </div>
  );

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    addToCart({ id: product.id, name: product.name, price: product.price, image: product.images[0], size: selectedSize, color: selectedColor, slug: product.slug });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="pt-20 min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-2 text-xs text-cream/30 font-body">
        <Link href="/" className="hover:text-[#C9A84C] transition-colors">Home</Link>
        <ChevronRight size={10} />
        <Link href="/shop" className="hover:text-[#C9A84C] transition-colors">Shop</Link>
        <ChevronRight size={10} />
        <span className="text-cream/60">{product.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Images */}
          <div className="flex gap-4">
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex flex-col gap-3 w-16">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`aspect-square overflow-hidden rounded-sm border-2 transition-all ${activeImg === i ? 'border-[#C9A84C]' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main image */}
            <div className="flex-1 aspect-[3/4] overflow-hidden rounded-sm bg-[#1a1a1a] relative">
              <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              {product.badge && (
                <span className={`absolute top-4 left-4 text-[10px] tracking-wider uppercase px-3 py-1 font-body rounded-sm ${
                  product.badge === 'Sale' ? 'bg-red-900/80 text-red-200' :
                  product.badge === 'New' ? 'bg-[#C9A84C] text-black' :
                  'bg-[#1a1a1a] text-[#C9A84C] border border-[#C9A84C]/40'
                }`}>{product.badge}</span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body">{product.collection} Collection</p>
              <h1 className="font-serif text-3xl md:text-4xl text-cream mt-1">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex">{[1,2,3,4,5].map(s => (
                  <Star key={s} size={12} className={s <= Math.round(product.rating) ? 'fill-[#C9A84C] text-[#C9A84C]' : 'text-cream/20'} />
                ))}</div>
                <span className="text-cream/50 text-xs font-body">{product.rating} ({product.reviews} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-[#C9A84C] text-2xl font-body">${product.price}</span>
                {product.originalPrice && (
                  <span className="text-cream/30 text-base line-through font-body">${product.originalPrice}</span>
                )}
                {product.originalPrice && (
                  <span className="text-red-400 text-xs font-body">
                    Save ${product.originalPrice - product.price}
                  </span>
                )}
              </div>
            </div>

            <div className="gold-divider" />

            {/* Colors */}
            {product.colors && (
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-cream/50 font-body mb-2">
                  Color: <span className="text-cream">{selectedColor}</span>
                </p>
                <div className="flex gap-2">
                  {product.colors.map(c => (
                    <button key={c.name} onClick={() => setSelectedColor(c.name)}
                      title={c.name}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === c.name ? 'border-[#C9A84C] scale-110' : 'border-transparent hover:border-cream/30'}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && (
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-cream/50 font-body mb-2">
                  Size: <span className="text-cream">{selectedSize || 'Select a size'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`w-11 h-11 text-xs font-body border rounded-sm transition-all ${
                        selectedSize === s
                          ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-[#C9A84C]/20 text-cream/60 hover:border-[#C9A84C]/50'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-cream/50 font-body mb-2">Quantity</p>
              <div className="flex items-center gap-0 border border-[#C9A84C]/20 w-fit rounded-sm">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 text-cream/60 hover:text-[#C9A84C] transition-colors border-r border-[#C9A84C]/20">
                  <Minus size={14} />
                </button>
                <span className="px-6 text-cream font-body text-sm">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-4 py-3 text-cream/60 hover:text-[#C9A84C] transition-colors border-l border-[#C9A84C]/20">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Add to cart */}
            <div className="flex gap-3">
              <button onClick={handleAddToCart}
                className={`btn-gold flex-1 py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm transition-all ${added ? 'bg-green-600 text-white' : ''}`}>
                <ShoppingBag size={14} />
                {added ? 'Added to Bag ✓' : 'Add to Bag'}
              </button>
              <button onClick={() => toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
                className={`w-14 flex items-center justify-center border rounded-sm transition-all ${wishlisted ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-[#C9A84C]/20 text-cream/60 hover:border-[#C9A84C]/50 hover:text-[#C9A84C]'}`}>
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
              <button className="w-14 flex items-center justify-center border border-[#C9A84C]/20 text-cream/40 hover:text-[#C9A84C] hover:border-[#C9A84C]/50 rounded-sm transition-all">
                <Share2 size={16} />
              </button>
            </div>

            {/* Shipping note */}
            <p className="text-cream/30 text-xs font-body">
              ✦ Free shipping on orders over $150 · Returns within 30 days
            </p>

            <div className="gold-divider" />

            {/* Tabs */}
            <div>
              <div className="flex gap-6 border-b border-[#C9A84C]/10">
                {(['description', 'details', 'reviews'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-xs tracking-[0.2em] uppercase font-body transition-all ${
                      activeTab === tab ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]' : 'text-cream/40 hover:text-cream/70'
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="pt-4">
                {activeTab === 'description' && (
                  <p className="text-cream/60 text-sm font-body leading-relaxed">{product.description}</p>
                )}
                {activeTab === 'details' && (
                  <ul className="space-y-2">
                    {product.details.map((d, i) => (
                      <li key={i} className="text-cream/60 text-sm font-body flex items-center gap-2">
                        <span className="text-[#C9A84C] text-xs">✦</span> {d}
                      </li>
                    ))}
                  </ul>
                )}
                {activeTab === 'reviews' && (
                  <div className="text-center py-4">
                    <div className="flex justify-center gap-1 mb-2">
                      {[1,2,3,4,5].map(s => <Star key={s} size={20} className="fill-[#C9A84C] text-[#C9A84C]" />)}
                    </div>
                    <p className="font-serif text-2xl text-cream">{product.rating}</p>
                    <p className="text-cream/40 text-xs font-body mt-1">Based on {product.reviews} reviews</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-20 pt-16 border-t border-[#C9A84C]/10">
            <div className="flex items-end justify-between mb-10">
              <h2 className="font-serif text-3xl text-cream">You May Also Like</h2>
              <Link href="/shop" className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-body flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
