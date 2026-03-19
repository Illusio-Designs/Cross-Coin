'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { products } from '@/lib/data';
import ProductCard from '@/components/shop/ProductCard';
import QuickViewModal from '@/components/shop/QuickViewModal';
import { Product } from '@/lib/data';
import { Search } from 'lucide-react';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [quickView, setQuickView] = useState<Product | null>(null);

  const results = query
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.collection.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Results for</p>
          <h1 className="font-serif text-4xl text-cream">"{query}"</h1>
          <div className="gold-divider w-16 mt-4" />
          <p className="text-cream/40 text-sm font-body mt-3">{results.length} product{results.length !== 1 ? 's' : ''} found</p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {results.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
          </div>
        ) : (
          <div className="text-center py-24">
            <Search size={48} className="text-cream/10 mx-auto mb-4" />
            <p className="font-serif text-2xl text-cream/40 mb-2">No results found</p>
            <p className="text-cream/30 text-sm font-body">Try a different search term or browse our collections.</p>
          </div>
        )}
      </div>
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
