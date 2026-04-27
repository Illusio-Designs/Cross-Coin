'use client';
import Link from 'next/link';
import { Heart, ShoppingBag, X, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import PageHeader from '@/components/layout/PageHeader';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useStore();

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Saved Items"
        title="YOUR"
        accent="WISHLIST"
        intro="Fragrances you've saved to revisit. Move them to your bag whenever the moment is right."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 bg-white border border-[var(--border)] rounded-2xl">
            <Heart size={52} className="text-[var(--ink-muted)]" />
            <p className="font-display text-3xl text-[var(--ink)] uppercase tracking-tight">Your wishlist is empty</p>
            <p className="text-[var(--ink-soft)] text-sm font-body">Save fragrances you love to revisit them later.</p>
            <Link href="/shop" className="pill-cta mt-2">
              Browse the Shop <ArrowUpRight size={14} strokeWidth={1.6} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {wishlist.map(item => (
              <div key={item.id} className="group relative">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--surface-2)]">
                  <img src={item.image} alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <button onClick={() => toggleWishlist(item)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-all shadow">
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, image: item.image, slug: item.slug })}
                      className="pill-cta w-full justify-center !py-3 !text-[10px]">
                      <ShoppingBag size={11} /> Add to Bag
                    </button>
                  </div>
                </div>
                <div className="pt-4">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="font-serif italic text-[var(--ink)] text-lg hover:text-[var(--gold-deep)] transition-colors">{item.name}</h3>
                  </Link>
                  <p className="text-[var(--ink-soft)] text-base font-body mt-1">₹{Number(item.price).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
