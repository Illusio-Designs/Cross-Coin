'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { collections, products } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import { Product } from '@/lib/data';
import Link from 'next/link';

export default function SingleCollectionPage() {
  const { slug } = useParams();
  const collection = collections.find(c => c.slug === slug);
  const [quickView, setQuickView] = useState<Product | null>(null);

  const colProducts = collection
    ? products.filter(p => p.collection.toLowerCase() === collection.name.toLowerCase())
    : products.slice(0, 4);

  return (
    <div className="pt-20 min-h-screen">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <img src={collection?.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600'} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/30" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <p className="text-[#C9A84C]/80 text-xs tracking-[0.4em] uppercase font-body mb-3">Collection</p>
            <h1 className="font-serif text-5xl text-cream">{collection?.name || 'Collection'}</h1>
            <p className="text-cream/60 font-body text-sm mt-3 max-w-md mx-auto">{collection?.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-10">
          <p className="text-cream/40 text-sm font-body">{colProducts.length} pieces</p>
          <Link href="/collections" className="text-[#C9A84C]/60 text-xs tracking-wider uppercase font-body hover:text-[#C9A84C] transition-colors">
            ← All Collections
          </Link>
        </div>
        {colProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {colProducts.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-serif text-2xl text-cream/30">Coming Soon</p>
            <p className="text-cream/20 text-sm font-body mt-2">This collection is being curated for you.</p>
          </div>
        )}
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
