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
  const productsList = (products.length ? products : FALLBACK).slice(0, 4);
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const activeIndex = Math.min(active, productsList.length - 1);
  const p = productsList[activeIndex];

  const handleAdd = () => {
    addItem({
      id: p.id, name: p.name, slug: p.slug, image: p.image,
      price: Number(p.price), collection: p.collection, qty: 1,
    }, { openDrawer: false });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const selectItem = (index) => {
    setActive(index);
    setAdded(false);
  };

  return (
    <section className="section-y bg-ink text-paper">
      <div className="wrap">

        <div className="flex flex-col gap-4 mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-px bg-clay" />
              <p className="eyebrow text-clay">The Reserve</p>
            </div>
            <h2 className="h-display text-paper text-3xl md:text-5xl tracking-[-0.03em]">
              A curated edit of rare pairs.
            </h2>
            <p className="mt-5 max-w-2xl text-paper/65 text-sm md:text-base leading-relaxed">
              Limited-run styles selected for seasonless wear. Each pair is shown in its best light with a quiet, premium finish.
            </p>
          </div>

          <Link href="/products?sort=bestsellers" className="hidden sm:inline-flex btn-light">View all</Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr] items-start">

          <div className="relative overflow-hidden rounded-[2rem] border border-paper/10 bg-paper/5 min-h-[520px]">
            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
            <div className="absolute left-6 bottom-6 right-6 text-paper">
              <p className="eyebrow text-paper/70 uppercase tracking-[0.24em] mb-3">Selected drop</p>
              <h3 className="text-5xl md:text-6xl leading-tight">{p.name}</h3>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="rounded-[1.75rem] border border-paper/10 bg-paper/5 p-8">
              <p className="eyebrow text-clay mb-3 uppercase tracking-[0.24em]">{p.collection}</p>
              <h3 className="text-4xl md:text-5xl font-display text-paper leading-tight mb-5">{p.name}</h3>
              <p className="text-paper/65 leading-relaxed mb-8">{p.note}</p>

              <div className="flex flex-wrap items-center gap-5">
                <span className="text-3xl font-semibold text-paper">₹{Number(p.price).toLocaleString('en-IN')}</span>
                <span className="eyebrow text-paper/50 uppercase tracking-[0.25em]">Limited quantity</span>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleAdd}
                  className={`btn-light w-full sm:w-auto ${added ? '!bg-clay !border-clay !text-paper' : ''}`}
                >
                  {added ? 'Added to bag ✓' : 'Add to bag'}
                </button>
                <Link
                  href={`/products/${p.slug}`}
                  className="btn-outline w-full sm:w-auto text-center"
                  style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.35)' }}
                >
                  View details
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {productsList.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => selectItem(index)}
                  className={`flex items-center gap-4 rounded-3xl border px-5 py-4 text-left transition-all ${
                    index === activeIndex ? 'border-clay bg-paper/5' : 'border-paper/10 hover:border-paper/40'
                  }`}
                >
                  <div className="h-16 w-16 overflow-hidden rounded-3xl border border-paper/10">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm text-paper leading-tight">{item.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-paper/50 mt-1">{item.collection}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
