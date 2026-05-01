'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { ProductCard } from '@/components/collection/ProductCard';

export function WishlistPageClient() {
  const items = useWishlistStore((s) => s.items);
  const hydrated = useWishlistStore((s) => s.hydrated);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* Hero — same shape as /search and /contact */}
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div className="relative">
          <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">Your Wishlist</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/40">
            {hydrated
              ? items.length === 0
                ? 'Save what you love and come back to it any time.'
                : `${items.length} item${items.length === 1 ? '' : 's'} saved`
              : 'Loading your saved items…'}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="px-6 py-8 md:px-10">
        {hydrated && items.length === 0 ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white py-20 text-center shadow-sm">
            <Heart size={48} className="text-gray-200" />
            <div>
              <p className="text-base font-semibold text-brand-black">Your wishlist is empty</p>
              <p className="mt-1 text-sm text-gray-400">Tap the heart on any product to save it here.</p>
            </div>
            <Link
              href="/collections/all"
              className="inline-flex items-center justify-center rounded-full bg-brand-black px-8 py-3 text-xs font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-gray-800"
            >
              Shop the Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
