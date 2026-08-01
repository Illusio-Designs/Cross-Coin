import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import SeoWrapper from '../components/SeoWrapper';
import ProductCard from '../components/products/ProductCard';
import { useWishlist } from '../context/WishlistContext';

export default function WishlistPage() {
  const { items, count, hydrated, clear } = useWishlist();
  const empty = count === 0;

  return (
    <SeoWrapper pageName="wishlist">
      <main className="bg-paper">
        <PageHero
          eyebrow="Saved for later"
          title="Your"
          accent="wishlist."
          intro={empty
            ? 'Tap the heart on any pair to keep it here for later.'
            : `${count} pair${count === 1 ? '' : 's'} kept aside.`}
        />

        <div className="wrap section-y">
          {!hydrated ? null : empty ? (
            <div className="text-center py-24 border border-line max-w-xl mx-auto">
              <p className="h-display text-3xl uppercase mb-3">Nothing saved yet</p>
              <p className="prose-body text-sm mb-7">Start with a pair from the catalogue.</p>
              <Link href="/products" className="cta inline-flex">Open the catalogue</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <p className="eyebrow">{count} saved</p>
                <button
                  onClick={clear}
                  className="text-[12px] tracking-[0.12em] uppercase text-ink-muted transition-colors hover:text-ink"
                >
                  Clear wishlist
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10">
                {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </SeoWrapper>
  );
}
