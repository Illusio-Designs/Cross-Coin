import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { collections } from '@/lib/data';

export default function CollectionsPage() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="py-12 text-center">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Curated Worlds</p>
          <h1 className="font-serif text-5xl text-cream">Our Collections</h1>
          <div className="gold-divider w-24 mx-auto mt-4" />
          <p className="text-cream/50 font-body text-sm mt-4 max-w-md mx-auto">Each collection tells a story. Discover the world of Velmique through our four distinct universes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {collections.map((col, i) => (
            <Link key={col.id} href={`/collections/${col.slug}`}
              className={`relative group overflow-hidden rounded-sm ${i === 0 ? 'md:col-span-2' : ''}`}>
              <div className={`${i === 0 ? 'aspect-[16/7]' : 'aspect-[4/3]'} overflow-hidden`}>
                <img src={col.image} alt={col.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className={`font-serif text-cream ${i === 0 ? 'text-5xl' : 'text-3xl'}`}>{col.name}</h2>
                    <p className="text-cream/50 font-body text-sm mt-2 max-w-md">{col.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-cream/40 text-xs font-body">{col.productCount} pieces</span>
                    <span className="inline-flex items-center gap-2 text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-body opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      Explore <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-[#C9A84C]/0 group-hover:border-[#C9A84C]/25 transition-all duration-300 rounded-sm" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
