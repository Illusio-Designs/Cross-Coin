'use client';
import Link from 'next/link';
import { Heart, Eye, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

export default function ProductCard({ product, onQuickView, index = 0 }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Badge — top-right */}
      {product.badge && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <span className="inline-block px-3 py-1 bg-[#1f1b16] text-[#f7f2e8] text-[9px] tracking-[0.3em] uppercase">
            {product.badge}
          </span>
        </div>
      )}

      <Link href={`/product/${product.slug}`} className="block relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-[#26211b]">
          <img
            src={product.images[0]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.08]"
          />
          {product.images[1] && (
            <img
              src={product.images[1]}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            />
          )}

          {!product.inStock && (
            <div className="absolute inset-0 bg-[#14110e]/80 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-[#f3ede0] text-[10px] tracking-[0.4em] uppercase border border-[#1f1b16] px-5 py-1.5">Sold Out</span>
            </div>
          )}

          {/* Torn-paper bottom edge */}
          <div
            className="absolute bottom-0 left-0 right-0 h-3 bg-[#14110e]"
            style={{
              clipPath: 'polygon(0 40%, 4% 85%, 9% 50%, 15% 90%, 22% 55%, 30% 92%, 38% 48%, 46% 88%, 54% 55%, 62% 92%, 70% 48%, 78% 88%, 86% 55%, 93% 92%, 100% 55%, 100% 100%, 0 100%)',
            }}
          />

          {/* Quick action icons — slide in from right */}
          <div className="absolute top-1/2 right-3 -translate-y-1/2 z-20 flex flex-col gap-2 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
            <button
              onClick={(e) => { e.preventDefault(); toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug }); }}
              className={`w-8 h-8 flex items-center justify-center border transition-all ${wishlisted ? 'bg-[#b8624f] border-[#b8624f] text-[#f7f2e8]' : 'bg-[#14110e] border-[#1f1b16] text-[#f3ede0] hover:bg-[#1f1b16] hover:text-[#f7f2e8]'}`}
              aria-label="Wishlist"
            >
              <Heart size={12} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            {onQuickView && (
              <button
                onClick={(e) => { e.preventDefault(); onQuickView(product); }}
                className="w-8 h-8 flex items-center justify-center bg-[#14110e] border border-[#1f1b16] text-[#f3ede0] hover:bg-[#1f1b16] hover:text-[#f7f2e8] transition-all"
                aria-label="Quick view"
              >
                <Eye size={12} />
              </button>
            )}
          </div>

          {/* Add to Bag button slides up on hover */}
          {product.inStock && (
            <div className="absolute bottom-3 left-3 right-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out z-10">
              <button
                onClick={(e) => { e.preventDefault(); addToCart({ id: product.id, name: product.name, price: product.price, image: product.images[0], slug: product.slug }); }}
                className="w-full flex items-center justify-between bg-[#1f1b16] text-[#f7f2e8] px-4 py-3 text-[10px] tracking-[0.3em] uppercase font-body hover:bg-[#b8624f] transition-colors"
              >
                Add to Bag
                <ArrowUpRight size={12} />
              </button>
            </div>
          )}
        </div>
      </Link>

      {/* Caption plate */}
      <div className="pt-4 pb-1 flex items-start justify-between gap-4 border-t border-[#2e2821] mt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[#7a7368] text-[9px] tracking-[0.35em] uppercase font-body mb-1.5">
            {product.collection}
          </p>
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-serif text-[#f3ede0] text-base md:text-lg leading-tight hover:italic hover:text-[#d4927f] transition-all">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-0.5 mt-2">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={`text-[10px] ${s <= Math.round(product.rating) ? 'text-[#d4927f]' : 'text-[#dcd4bf]'}`}>●</span>
            ))}
            <span className="text-[#7a7368] text-[10px] ml-1.5 font-body">({product.reviews})</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="font-serif text-[#f3ede0] text-xl italic">₹{product.price}</span>
          {product.originalPrice && (
            <div className="text-[#7a7368] text-xs line-through mt-0.5">₹{product.originalPrice}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
