'use client';
import { X, ShoppingBag, Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Product } from '@/lib/data';
import { useStore } from '@/lib/store';

interface QuickViewProps {
  product: Product | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewProps) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedImg, setSelectedImg] = useState(0);
  if (!product) return null;
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-[#C9A84C]/20 rounded-sm max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-cream/50 hover:text-[#C9A84C] transition-colors">
          <X size={20} />
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Images */}
          <div className="bg-[#1a1a1a] aspect-[3/4] md:aspect-auto relative overflow-hidden">
            <img src={product.images[selectedImg]} alt={product.name} className="w-full h-full object-cover" />
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-3 flex gap-2">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImg(i)}
                    className={`w-10 h-10 border-2 rounded-sm overflow-hidden transition-all ${selectedImg === i ? 'border-[#C9A84C]' : 'border-transparent opacity-60'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <p className="text-[#C9A84C]/60 text-xs tracking-[0.2em] uppercase font-body">{product.collection}</p>
              <h2 className="font-serif text-2xl text-cream mt-1">{product.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[#C9A84C] text-xl font-body">${product.price}</span>
                {product.originalPrice && <span className="text-cream/30 text-sm line-through font-body">${product.originalPrice}</span>}
              </div>
            </div>

            <p className="text-cream/60 text-sm font-body leading-relaxed">{product.description}</p>

            {/* Sizes */}
            {product.sizes && (
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-cream/50 font-body mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`w-10 h-10 text-xs font-body border rounded-sm transition-all ${selectedSize === s ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-[#C9A84C]/20 text-cream/60 hover:border-[#C9A84C]/50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { addToCart({ id: product.id, name: product.name, price: product.price, image: product.images[0], size: selectedSize, slug: product.slug }); onClose(); }}
                className="btn-gold flex-1 py-3 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm"
              >
                <ShoppingBag size={14} /> Add to Bag
              </button>
              <button
                onClick={() => toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
                className={`w-12 flex items-center justify-center border rounded-sm transition-all ${wishlisted ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-[#C9A84C]/20 text-cream/60 hover:border-[#C9A84C]/50 hover:text-[#C9A84C]'}`}
              >
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>
            <Link href={`/product/${product.slug}`} onClick={onClose}
              className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-body flex items-center gap-1 hover:gap-2 transition-all">
              View Full Details <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
