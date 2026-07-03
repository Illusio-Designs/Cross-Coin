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
        eyebrow="Your Saved Pieces"
        title="The"
        titleAccent="Wishlist"
        description={
          hydrated
            ? items.length === 0
              ? 'Save what speaks to you. Return whenever the moment is right.'
              : `${items.length} piece${items.length === 1 ? '' : 's'} you are dreaming of.`
            : 'Gathering your saved pieces…'
        }
      />

      <section className="px-4 pb-24 sm:px-6 md:px-10">
        {hydrated && items.length === 0 ? (
          <Reveal delay={0.12}>
            <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
              <span className="vq-diamond" aria-hidden />
              <p className="font-display text-2xl italic text-brand-black/75">Your wishlist awaits.</p>
              <p className="max-w-sm text-sm leading-relaxed text-brand-black/55">
                Tap the heart on any piece to keep it here, quietly, for later.
              </p>
              <Link
                href="/collections/all"
                className="vq-lift mt-2 inline-flex items-center justify-center rounded-full bg-brand-black px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:bg-brand-black/90"
              >
                Explore the Collection
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