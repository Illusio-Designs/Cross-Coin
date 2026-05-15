import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

/* "The Reserve" — Gripzus exclusive showcase.
   Same content idea as Crosscoin / Knitwink (a featured-product picker),
   re-designed: a dark band with a big active product on the left and a
   selectable list of pieces on the right. Prop-driven (`products`). */

const FALLBACK = [
  { id: 'r1', name: 'The Obsidian Run', slug: 'obsidian-run', collection: 'Limited edition', price: 1199, note: 'Black-on-black merino with a hand-dyed heel.', image: 'https://images.unsplash.com/photo-1583500178690-f0d24cb16eaf?w=1100&q=85&auto=format&fit=crop' },
  { id: 'r2', name: 'Atelier No. 7',    slug: 'atelier-no-7',  collection: 'Numbered run',    price: 999,  note: 'A ribbed dress pair, numbered and boxed by hand.',  image: 'https://images.unsplash.com/photo-1589810635657-232948472d98?w=1100&q=85&auto=format&fit=crop' },
  { id: 'r3', name: 'The Trail Reserve',slug: 'trail-reserve', collection: 'Members first',   price: 849,  note: 'Our trail sock in a fibre we knit only once a year.', image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1100&q=85&auto=format&fit=crop' },
];

export default function ExclusiveSection({ products = FALLBACK }) {
  const list = products.length ? products : FALLBACK;
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const p = list[active];

  const handleAdd = () => {
    addItem({
      id: p.id, name: p.name, slug: p.slug, image: p.image,
      price: Number(p.price), collection: p.collection, qty: 1,
    }, { openDrawer: false });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <section className="section-y bg-ink text-paper">
      <div className="wrap">

        {/* Heading */}
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-px bg-clay" />
              <p className="eyebrow text-clay">The Reserve</p>
            </div>
            <h2 className="h-display text-paper text-3xl md:text-5xl">
              Pieces kept <span className="h-italic" style={{ color: 'var(--clay)' }}>aside.</span>
            </h2>
          </div>
          <Link href="/products?sort=bestsellers" className="hidden sm:inline-flex btn-light">View all</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-stretch">

          {/* Active product image */}
          <div className="relative">
            <span className="absolute top-4 left-4 z-10 bg-clay text-paper text-[10px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-sm">
              Limited run
            </span>
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full min-h-[320px] overflow-hidden rounded-xl bg-paper/5">
              {list.map((item, i) => (
                <img
                  key={item.id}
                  src={item.image}
                  alt={item.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    i === active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Picker + active detail */}
          <div className="flex flex-col">
            {/* Selectable list */}
            <ol className="border-t border-paper/15">
              {list.map((item, i) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActive(i)}
                    className={`flex w-full items-center gap-4 py-4 border-b border-paper/15 text-left transition-opacity ${
                      i === active ? 'opacity-100' : 'opacity-50 hover:opacity-90'
                    }`}
                  >
                    <span className="font-display text-paper/50 text-sm w-7 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 min-w-0">
                      <span className="h-display text-paper text-xl md:text-2xl block leading-tight">{item.name}</span>
                      <span className="eyebrow text-paper/40">{item.collection}</span>
                    </span>
                    <span className={`h-display text-lg ${i === active ? 'text-clay' : 'text-paper/60'}`}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            {/* Active detail */}
            <div className="mt-7">
              <p className="text-paper/65 text-sm md:text-base leading-relaxed mb-6 max-w-md">{p.note}</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAdd}
                  className={`btn-light ${added ? '!bg-clay !border-clay !text-paper' : ''}`}
                >
                  {added ? 'Added to bag ✓' : `Add to bag · ₹${Number(p.price).toLocaleString('en-IN')}`}
                </button>
                <Link
                  href={`/products/${p.slug}`}
                  className="btn-outline"
                  style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
