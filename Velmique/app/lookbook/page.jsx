import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

const lookbookItems = [
  { image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1000&q=85', title: 'Noir Absolu', col: 'md:col-span-2 md:row-span-2' },
  { image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=85', title: 'Velvet Oud', col: '' },
  { image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=800&q=85', title: 'Lumière', col: '' },
  { image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=85', title: 'Phantom', col: '' },
  { image: 'https://images.unsplash.com/photo-1615529162924-f8605388461d?w=800&q=85', title: 'Obsidian Rose', col: '' },
  { image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=1000&q=85', title: 'Céleste Ambre', col: 'md:col-span-2' },
];

export default function LookbookPage() {
  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Editorial"
        title="LOOK"
        accent="BOOK 2026"
        intro="Fragrance editorial — bottles, notes, moods. A visual chronicle of the year in scent."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[260px] md:auto-rows-[300px]">
          {lookbookItems.map((item, i) => (
            <div key={i} className={`relative group overflow-hidden rounded-xl ${item.col}`}>
              <img src={item.image} alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="font-display text-white text-2xl md:text-3xl uppercase tracking-tight">{item.title}</h3>
                <Link href="/shop" className="inline-flex items-center gap-1.5 text-[var(--gold-light)] text-[10px] tracking-[0.3em] uppercase font-body mt-2">
                  Shop Fragrance <ArrowUpRight size={11} strokeWidth={1.6} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/shop" className="pill-cta">
            Shop the Fragrances <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
      </div>
    </div>
  );
}
