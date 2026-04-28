import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { collections } from '@/lib/data';
import PageHeader from '@/components/layout/PageHeader';

export default function CollectionsPage() {
  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Curated Worlds"
        title="OUR"
        accent="COLLECTIONS"
        intro="Each collection tells a story. Discover the world of Velmique through our distinct fragrance universes."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {collections.map((col, i) => (
            <Link key={col.id} href={`/shop?collection=${col.slug}`}
              className={`relative group overflow-hidden rounded-2xl bg-[var(--surface-2)] ${i === 0 ? 'md:col-span-2' : ''}`}>
              <div className={`${i === 0 ? 'aspect-[16/7]' : 'aspect-[4/3]'} overflow-hidden`}>
                <img src={col.image} alt={col.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/30 to-transparent" />
              <div className="absolute top-5 left-5">
                <p className="text-white/80 text-[10px] tracking-[0.4em] uppercase font-body">{col.tagline}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-7 md:p-9">
                <div className="flex items-end justify-between gap-6 flex-wrap">
                  <div>
                    <h2 className={`font-display text-white uppercase leading-none tracking-tight ${i === 0 ? 'text-5xl md:text-7xl' : 'text-3xl md:text-5xl'}`}>
                      {col.name}
                    </h2>
                    <p className="text-white/75 font-body text-sm md:text-base mt-3 max-w-md leading-relaxed">{col.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className="text-white/70 text-xs font-body tracking-wider">{col.productCount} pieces</span>
                    <span className="pill-cta pill-cta-light">
                      Explore <ArrowUpRight size={13} strokeWidth={1.6} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
