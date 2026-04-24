'use client';
import Link from 'next/link';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useStore();

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        <div className="mb-10">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Saved Items</p>
          <h1 className="font-serif text-4xl text-[#f3ede0]">Your Wishlist</h1>
          <div className="gold-divider w-16 mt-4" />
        </div>

        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <Heart size={52} className="text-[#f3ede0]/10" />
            <p className="font-serif text-2xl text-[#f3ede0]/40">Your wishlist is empty</p>
            <p className="text-[#f3ede0]/30 text-sm font-body">Save pieces you love to revisit them later.</p>
            <Link href="/shop" className="btn-gold px-10 py-4 text-xs tracking-[0.2em] uppercase font-body rounded-sm mt-2">
              Browse the Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {wishlist.map(item => (
              <div key={item.id} className="group relative">
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#1d1915]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <button onClick={() => toggleWishlist(item)}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-red-400 hover:bg-red-400/20 transition-all">
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, image: item.image, slug: item.slug })}
                      className="btn-gold w-full py-2.5 text-[10px] tracking-[0.2em] uppercase font-body flex items-center justify-center gap-1.5 rounded-sm">
                      <ShoppingBag size={11} /> Add to Bag
                    </button>
                  </div>
                </div>
                <div className="pt-3">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="font-serif text-sm text-[#f3ede0] hover:text-[#d4927f] transition-colors">{item.name}</h3>
                  </Link>
                  <p className="text-[#d4927f] text-sm font-body mt-1">₹{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
