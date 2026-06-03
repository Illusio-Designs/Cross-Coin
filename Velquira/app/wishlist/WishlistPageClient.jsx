'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/store/wishlistStore';
import { ProductCard } from '@/components/collection/ProductCard';
import { Reveal } from '@/components/ui/Reveal';

export function WishlistPageClient() {
  const items = useWishlistStore((s) => s.items);
  const hydrated = useWishlistStore((s) => s.hydrated);

  return (
    <main className="min-h-screen bg-ivory">
      {/* Refined page header */}
      <section className="px-4 pt-36 pb-10 text-center sm:px-6 md:px-10">
        <Reveal>
          <span className="vq-diamond mx-auto block" aria-hidden />
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Your Saved Pieces</p>
        </Reveal>
        <Reveal delay={0.16}>
          <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
            The Wishlist
          </h1>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
            {hydrated
              ? items.length === 0
                ? 'Save what speaks to you. Return whenever the moment is right.'
                : `${items.length} piece${items.length === 1 ? '' : 's'} you are dreaming of.`
              : 'Gathering your saved pieces…'}
          </p>
        </Reveal>
        <Reveal delay={0.32}>
          <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
        </Reveal>
      </section>

      {/* Content */}
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