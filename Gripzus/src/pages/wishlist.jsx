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
          chapter="06"
          eyebrow="Saved for later"
          title="Your"
          accent="wishlist."
          intro={empty
            ? 'Tap the heart on any pair to keep it here for later.'
            : `${count} pair${count === 1 ? '' : 's'} kept aside.`}
        />

        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-16">
          {!hydrated ? null : empty ? (
            <div className="text-center py-24 border-2 border-ink max-w-xl mx-auto px-6">
              <p className="h-mark text-3xl md:text-4xl mb-4">Nothing saved yet</p>
              <p className="prose-body text-sm mb-7">Start with a pair from the catalogue.</p>
              <Link href="/products" className="btn inline-flex">Open the catalogue</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8 pb-5 border-b-2 border-ink">
                <p className="kicker">{count} saved</p>
                <button
                  onClick={clear}
                  className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink-muted transition-colors hover:text-ink"
                >
                  Clear wishlist
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </SeoWrapper>
  );
}
