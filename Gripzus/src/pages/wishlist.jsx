import Head from 'next/head';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import ProductCard from '../components/products/ProductCard';

const ITEMS = [
  { id: '1', name: 'Performance Trail', slug: 'performance-trail', collection: 'Athletic', price: 599, salePrice: 449, badge: 'Bestseller', images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=900&q=80&auto=format&fit=crop'] },
  { id: '4', name: 'Merino Forest',     slug: 'merino-forest',     collection: 'Wool',     price: 899, salePrice: 649, badge: 'Limited', images: ['https://images.unsplash.com/photo-1577538928305-3807c3993047?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1583500178690-f0d24cb16eaf?w=900&q=80&auto=format&fit=crop'] },
  { id: '7', name: 'Mountain Wool',     slug: 'mountain-wool',     collection: 'Wool',     price: 999, images: ['https://images.unsplash.com/photo-1583500178690-f0d24cb16eaf?w=900&q=80&auto=format&fit=crop'] },
];

export default function WishlistPage() {
  const empty = ITEMS.length === 0;
  return (
    <>
      <Head><title>Your Wishlist — Gripzus</title></Head>
      <main className="bg-paper">
        <PageHero
          chapter="06"
          eyebrow="Saved for later"
          title="Your"
          accent="wishlist."
          intro={empty ? 'Tap the heart on any pair to keep it here for later.' : `${ITEMS.length} pair${ITEMS.length === 1 ? '' : 's'} kept aside.`}
        />

        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-16">
          {empty ? (
            <div className="text-center py-24 border border-line max-w-xl mx-auto">
              <p className="h-display text-3xl uppercase mb-3">Nothing saved yet</p>
              <p className="prose-body text-sm mb-7">Start with a pair from the catalogue.</p>
              <Link href="/products" className="cta inline-flex">Open the catalogue</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
              {ITEMS.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
