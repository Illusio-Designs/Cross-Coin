import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageHero from '../components/common/PageHero';
import ProductCard from '../components/products/ProductCard';

const CATALOG = [
  { id: '1', name: 'Performance Trail',  slug: 'performance-trail',  collection: 'Athletic', category: 'athletic', price: 599, salePrice: 449, badge: 'Bestseller', images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=900&q=80&auto=format&fit=crop'] },
  { id: '2', name: 'Heritage Charcoal',  slug: 'heritage-charcoal',  collection: 'Dress',    category: 'dress',    price: 799, badge: 'New', images: ['https://images.unsplash.com/photo-1589810635657-232948472d98?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1607793483011-d10bb1d8be0c?w=900&q=80&auto=format&fit=crop'] },
  { id: '3', name: 'Weekend Oat',        slug: 'weekend-oat',        collection: 'Casual',   category: 'casual',   price: 549, images: ['https://images.unsplash.com/photo-1542219550-37153d387c27?w=900&q=80&auto=format&fit=crop'] },
  { id: '4', name: 'Merino Forest',      slug: 'merino-forest',      collection: 'Wool',     category: 'wool',     price: 899, salePrice: 649, badge: 'Limited', images: ['https://images.unsplash.com/photo-1577538928305-3807c3993047?w=900&q=80&auto=format&fit=crop'] },
  { id: '5', name: 'Atelier Ribbed',     slug: 'atelier-ribbed',     collection: 'Dress',    category: 'dress',    price: 749, images: ['https://images.unsplash.com/photo-1607793483011-d10bb1d8be0c?w=900&q=80&auto=format&fit=crop'] },
  { id: '6', name: 'Court Crew',         slug: 'court-crew',         collection: 'Athletic', category: 'athletic', price: 499, images: ['https://images.unsplash.com/photo-1567010892083-3b2e2b6cd24c?w=900&q=80&auto=format&fit=crop'] },
  { id: '7', name: 'Mountain Wool',      slug: 'mountain-wool',      collection: 'Wool',     category: 'wool',     price: 999, images: ['https://images.unsplash.com/photo-1583500178690-f0d24cb16eaf?w=900&q=80&auto=format&fit=crop'] },
  { id: '8', name: 'Studio Slip',        slug: 'studio-slip',        collection: 'Casual',   category: 'casual',   price: 449, images: ['https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=900&q=80&auto=format&fit=crop'] },
];

const POPULAR = ['Athletic', 'Dress', 'Wool', 'Merino', 'Trail'];

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState((router.query.q || '').toString());

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return CATALOG.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.collection.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }, [q]);

  return (
    <>
      <Head><title>{q ? `"${q}"` : 'Search'} — Gripzus</title></Head>
      <main className="bg-paper">
        <PageHero
          chapter="05"
          eyebrow="Find a pair"
          title={q ? 'Results' : 'Search'}
          accent={q ? `"${q}"` : 'the archive.'}
          intro={q ? `${results.length} pair${results.length === 1 ? '' : 's'} match your search.` : 'Type a name, chapter or material — like "merino" or "trail".'}
        />

        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-14">

          {/* Search field */}
          <div className="relative max-w-3xl mx-auto mb-14">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full bg-transparent border-b-2 border-ink focus:border-clay outline-none pb-4 pr-10 font-serif italic text-3xl md:text-5xl text-ink placeholder:text-ink-muted transition-colors"
            />
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="absolute right-0 bottom-5 text-ink">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>

          {q.length >= 2 && results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
              {results.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}

          {q.length >= 2 && results.length === 0 && (
            <div className="text-center py-16 border border-line max-w-xl mx-auto">
              <p className="h-display text-3xl uppercase mb-3">No matches</p>
              <p className="prose-body text-sm mb-7">Try a different word, or open the full catalogue.</p>
              <Link href="/products" className="cta inline-flex">Browse all pairs</Link>
            </div>
          )}

          {q.length < 2 && (
            <div className="max-w-2xl mx-auto text-center">
              <p className="eyebrow mb-5">Popular searches</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {POPULAR.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="px-4 py-2 border border-line hover:border-ink font-mono text-[11px] tracking-[0.12em] uppercase text-ink-soft hover:text-ink transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
