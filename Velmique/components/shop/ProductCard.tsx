'use client';
import Link from 'next/link';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/data';

interface ProductCardProps {
  product: Product;
  onQuickView?: (p: Product) => void;
  light?: boolean; // white background variant
}

const badgeColors: Record<string, string> = {
  New: 'bg-[#C9A84C] text-black',
  Sale: 'bg-black text-[#C9A84C]',
  Bestseller: 'bg-white text-black border border-black/20',
  Limited: 'bg-black text-white',
};

export default function ProductCard({ product, onQuickView, light }: ProductCardProps) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="product-card group relative">
      {/* Image */}
      <div className={`relative overflow-hidden aspect-[3/4] ${light ? 'bg-[#f5f5f5]' : 'bg-[#1a1a1a]'}`}>
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
        )}

        {/* Badge */}
        {product.badge && (
          <span className={`absolute top-3 left-3 text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 font-body font-semibold ${badgeColors[product.badge]}`}>
            {product.badge}
          </span>
        )}

        {/* Out of stock */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-black/50 text-xs tracking-[0.2em] uppercase font-body">Sold Out</span>
          </div>
        )}

        {/* Actions overlay */}
        <div className="product-overlay absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 flex flex-col justify-between p-3">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
              className={`w-8 h-8 flex items-center justify-center transition-all ${wishlisted ? 'bg-[#C9A84C] text-black' : 'bg-white text-black hover:bg-[#C9A84C]'}`}
            >
              <Heart size={13} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            {onQuickView && (
              <button
                onClick={() => onQuickView(product)}
                className="w-8 h-8 bg-white text-black hover:bg-[#C9A84C] flex items-center justify-center transition-all"
              >
                <Eye size={13} />
              </button>
            )}
          </div>
          {product.inStock && (
            <button
              onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
              className="bg-[#C9A84C] hover:bg-black text-black hover:text-[#C9A84C] w-full py-2.5 text-[10px] tracking-[0.2em] uppercase font-body font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingBag size={12} /> Add to Bag
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="pt-3 pb-1">
        <p className="text-[#C9A84C] text-[9px] tracking-[0.25em] uppercase font-body mb-1">{product.collection}</p>
        <Link href={`/product/${product.slug}`}>
          <h3 className={`font-serif text-sm hover:text-[#C9A84C] transition-colors leading-snug ${light ? 'text-black' : 'text-white'}`}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`font-body text-sm font-semibold ${light ? 'text-black' : 'text-[#C9A84C]'}`}>${product.price}</span>
          {product.originalPrice && (
            <span className="text-black/30 text-xs line-through font-body">${product.originalPrice}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 mt-1">
          {[1,2,3,4,5].map(s => (
            <span key={s} className={`text-[10px] ${s <= Math.round(product.rating) ? 'star-filled' : 'star-empty'}`}>★</span>
          ))}
          <span className="text-black/25 text-[10px] ml-1 font-body">({product.reviews})</span>
        </div>
      </div>
    </div>
  );
}
