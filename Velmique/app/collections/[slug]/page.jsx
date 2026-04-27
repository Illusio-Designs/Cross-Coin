'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { collections, products } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function SingleCollectionPage() {
  const { slug } = useParams();
  const collection = collections.find(c => c.slug === slug);
  const [quickView, setQuickView] = useState(null);

  const colProducts = collection
    ? products.filter(p => p.collection.toLowerCase() === collection.name.toLowerCase())
    : products.slice(0, 4);

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <header className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-14 md:pt-20 pb-10 md:pb-14 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
        <div className="md:col-span-7">
          <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
            {collection?.tagline || 'Collection'}
          </p>
          <h1 className="font-display text-[var(--ink)] uppercase leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(2.4rem, 7vw, 6rem)' }}>
            {(collection?.name || 'Collection').toUpperCase()}
          </h1>
          <p className="text-[var(--ink-soft)] text-base md:text-lg leading-relaxed font-body mt-6 max-w-xl">
            {collection?.description}
          </p>
        </div>
        <div className="md:col-span-5">
          <div className="aspect-[5/4] overflow-hidden rounded-2xl">
            <img src={collection?.image || 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1200&q=85'} alt={collection?.name}
              className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-[var(--border)]">
          <p className="text-[var(--ink-soft)] text-sm font-body">
            <span className="font-serif italic text-[var(--ink)] text-base">{colProducts.length}</span> pieces in this maison
          </p>
          <Link href="/collections" className="pill-cta pill-cta-light">
            All Collections <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>

        {colProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {colProducts.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="font-display text-3xl text-[var(--ink-muted)] uppercase tracking-tight">Coming Soon</p>
            <p className="text-[var(--ink-soft)] text-sm font-body mt-3">This collection is being curated for you.</p>
          </div>
        )}
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
