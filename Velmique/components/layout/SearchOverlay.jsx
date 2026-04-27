'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { products } from '@/lib/data';

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const results = query.length > 1
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  useEffect(() => {
    if (searchOpen) { setTimeout(() => inputRef.current?.focus(), 100); }
    else { setQuery(''); }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#080808]/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#C9A84C]/20">
        <span className="font-serif text-xl gold-text">Search Velmique</span>
        <button onClick={() => setSearchOpen(false)} className="text-[#1A1612]/60 hover:text-[#8B6914] transition-colors">
          <X size={22} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full px-6 pt-10 pb-6">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B6914]/60" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for pieces, collections..."
            className="w-full bg-transparent border-b-2 border-[#C9A84C]/30 focus:border-[#C9A84C] outline-none pl-10 pr-4 py-3 text-xl font-serif text-[#1A1612] placeholder-cream/20 transition-colors"
          />
        </div>

        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            {results.map(p => (
              <Link key={p.id} href={`/product/${p.slug}`}
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-4 p-3 rounded-sm hover:bg-[#C9A84C]/5 border border-transparent hover:border-[#C9A84C]/20 transition-all group">
                <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-sm" />
                <div className="flex-1">
                  <p className="text-[#1A1612] text-sm font-body">{p.name}</p>
                  <p className="text-[#1A1612]/40 text-xs">{p.category} · ₹{p.price}</p>
                </div>
                <ArrowRight size={14} className="text-[#8B6914]/40 group-hover:text-[#8B6914] transition-colors" />
              </Link>
            ))}
            <Link href={`/search?q=${query}`} onClick={() => setSearchOpen(false)}
              className="block text-center text-[#8B6914] text-xs tracking-[0.2em] uppercase py-3 font-body hover:underline">
              View All Results →
            </Link>
          </div>
        )}

        {query.length > 1 && results.length === 0 && (
          <p className="text-[#1A1612]/40 text-sm mt-8 text-center font-body">No results for "{query}"</p>
        )}

        {!query && (
          <div className="mt-10">
            <p className="text-xs tracking-[0.2em] uppercase text-[#1A1612]/30 font-body mb-4">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {['Silk Blouse', 'Evening Gown', 'Velvet Blazer', 'New Arrivals', 'Luminara'].map(t => (
                <button key={t} onClick={() => setQuery(t)}
                  className="btn-outline-gold text-xs px-4 py-2 rounded-full font-body">
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
