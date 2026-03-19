import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const lookbookItems = [
  { image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', title: 'Evening Noir', col: 'md:col-span-2 md:row-span-2' },
  { image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80', title: 'Golden Hour', col: '' },
  { image: 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=600&q=80', title: 'Obsidian', col: '' },
  { image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', title: 'Lumière', col: '' },
  { image: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=600&q=80', title: 'Reverie', col: '' },
  { image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&q=80', title: 'Phantom', col: 'md:col-span-2' },
];

export default function LookbookPage() {
  return (
    <div className="pt-20 min-h-screen">
      {/* Hero */}
      <div className="relative h-80 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80" alt="Lookbook" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <p className="text-[#C9A84C]/80 text-xs tracking-[0.4em] uppercase font-body mb-3">Editorial</p>
            <h1 className="font-serif text-6xl text-cream">Lookbook</h1>
            <p className="text-cream/50 text-sm font-body mt-3">Spring / Summer 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[280px]">
          {lookbookItems.map((item, i) => (
            <div key={i} className={`relative group overflow-hidden rounded-sm ${item.col}`}>
              <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 group-hover:translate-y-0 transition-transform">
                <h3 className="font-serif text-2xl text-cream">{item.title}</h3>
                <Link href="/shop" className="inline-flex items-center gap-1 text-[#C9A84C] text-xs tracking-wider uppercase font-body mt-2 opacity-0 group-hover:opacity-100 transition-all">
                  Shop Look <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/shop" className="btn-gold inline-flex items-center gap-2 px-12 py-4 text-xs tracking-[0.2em] uppercase font-body rounded-sm">
            Shop the Lookbook <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
