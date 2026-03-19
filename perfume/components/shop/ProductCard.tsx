'use client';
import Link from 'next/link';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/data';

interface ProductCardProps {
  product: Product;
  onQuickView?: (p: Product) => void;
}

const badgeColors: Record<string, string> = {
  New: 'bg-[#C9A84C] text-black',
  Sale: 'bg-red-900/80 text-red-200',
  Bestseller: 'bg-[#1a1a1a] text-[#C9A84C] border border-[#C9A84C]/40',
  Limited: 'bg-[#1a1a1a] text-cream/80 border border-cream/20',
};

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="product-card group relative">
      {/* Image */}
      <div className="relative overflow-hidden bg-[#1a1a1a] aspect-[3/4] rounded-sm">
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
          <span className={`absolute top-3 left-3 text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 font-body rounded-sm ${badgeColors[product.badge]}`}>
            {product.badge}
          </span>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-cream/60 text-xs tracking-[0.2em] uppercase font-body">Sold Out</span>
          </div>
        )}

        {/* Actions overlay */}
        <div className="product-overlay absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 flex flex-col justify-between p-3">
          {/* Top actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${wishlisted ? 'bg-[#C9A84C] text-black' : 'bg-black/40 text-cream hover:bg-[#C9A84C]/20 hover:text-[#C9A84C]'}`}
            >
              <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            {onQuickView && (
              <button
                onClick={() => onQuickView(product)}
                className="w-8 h-8 rounded-full bg-black/40 text-cream hover:bg-[#C9A84C]/20 hover:text-[#C9A84C] flex items-center justify-center backdrop-blur-sm transition-all"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
          {/* Bottom add to cart */}
          {product.inStock && (
            <button
              onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug })}
              className="btn-gold w-full py-2.5 text-[10px] tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm"
            >
              <ShoppingBag size={12} /> Add to Bag
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="pt-3 pb-1">
        <p className="text-cream/40 text-[10px] tracking-[0.2em] uppercase font-body mb-1">{product.collection}</p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-serif text-sm text-cream hover:text-[#C9A84C] transition-colors leading-snug">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[#C9A84C] font-body text-sm">${product.price}</span>
          {product.originalPrice && (
            <span className="text-cream/30 text-xs line-through font-body">${product.originalPrice}</span>
          )}
        </div>
        {/* Stars */}
        <div className="flex items-center gap-1 mt-1">
          {[1,2,3,4,5].map(s => (
            <span key={s} className={`text-[10px] ${s <= Math.round(product.rating) ? 'star-filled' : 'star-empty'}`}>★</span>
          ))}
          <span className="text-cream/25 text-[10px] ml-1 font-body">({product.reviews})</span>
        </div>
      </div>
    </div>
  );
}
