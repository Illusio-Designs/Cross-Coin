'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/store/wishlistStore';
import { ProductCard } from '@/components/collection/ProductCard';
import { PageHero } from '@/components/layout/PageHero'
import { Reveal } from '@/components/ui/Reveal';

export function WishlistPageClient() {
  const items = useWishlistStore((s) => s.items);
  const hydrated = useWishlistStore((s) => s.hydrated);

  return (
    <main className="min-h-screen bg-ivory vq-lattice">
      <PageHero
        variant="cream"
        eyebrow="Wishlist"
        title="Your"
        titleAccent="Wishlist"
        description={
          hydrated
            ? items.length === 0
              ? 'Save the items you love and come back anytime.'
              : `${items.length} item${items.length === 1 ? '' : 's'} saved.`
            : 'Loading your saved items…'
        }
      />

      <section className="vq-container pb-24">
        {hydrated && items.length === 0 ? (
          <Reveal delay={0.12}>
            <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
              <span className="vq-diamond" aria-hidden />
              <p className="font-display text-2xl italic text-brand-black/75">Your wishlist is empty.</p>
              <p className="max-w-sm text-sm leading-relaxed text-brand-black/55">
                Tap the heart on any product to save it here for later.
              </p>
              <Link
                href="/products"
                className="vq-lift mt-2 inline-flex items-center justify-center rounded-full bg-ink px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3a3227]"
              >
                Browse Products
              </Link>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={0.1}>
            <div className="mx-auto grid max-w-site grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Reveal>
        )}
      </section>
    </main>
  );
}