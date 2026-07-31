import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

/* "The Reserve" — Gripzus exclusive showcase.
   Structured dark band: a single large rounded image of the SELECTED
   variation on the left, the pair's info + a numbered pair-list on the
   right. Selecting a colour swaps the one image; it auto-rotates through
   colours then rolls on to the next pair. Pauses on hover. */

const FALLBACK_IMG = '/assets/Gripzus.JPG.jpeg';

function normalize(p) {
  const imgs = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  return {
    id:    p.id,
    name:  p.name || 'Gripzus Pair',
    slug:  p.slug || p.handle || String(p.id),
    collection: p.collection || p.collectionName || 'The Reserve',
    sku:   p.sku || '',
    price: Number(p.salePrice ?? p.price ?? 0),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    badge: p.badge || '',
    images: imgs.length ? imgs : [p.image || FALLBACK_IMG],
    colors: Array.isArray(p.colors) ? p.colors.filter((c) => c?.name) : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    description: p.description || p.note || '',
  };
}

export default function ExclusiveSection({ products = [] }) {
  const list = (Array.isArray(products) ? products : []).slice(0, 4).map(normalize);

  const [active, setActive] = useState(0);
  const [color, setColor]   = useState(0);
  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);
  const [paused, setPaused] = useState(false);
  const { addItem } = useCart();

  const activeIndex = list.length ? Math.min(active, list.length - 1) : 0;
  const p = list[activeIndex];
  const colorIndex = p && p.colors.length ? Math.min(color, p.colors.length - 1) : 0;
  const activeCol = p && p.colors.length ? p.colors[colorIndex] : null;
  // ONE image for the selected variation: its own image if it has one, else
  // the product image at the colour's index, else the first image. Never a
  // rail of every image.
  const mainImg = activeCol?.images?.[0]
    || (p ? (p.images[Math.min(colorIndex, p.images.length - 1)] || p.images[0]) : '');

  // Auto-rotate through the pair's colours, then roll to the next pair.
  useEffect(() => {
    if (list.length === 0 || paused) return;
    const id = setTimeout(() => {
      const colorCount = list[activeIndex]?.colors?.length || 0;
      if (colorIndex + 1 < colorCount) {
        setColor(colorIndex + 1);
      } else if (list.length > 1) {
        setActive((activeIndex + 1) % list.length);
        setColor(0); setQty(1);
      } else {
        setColor(0);
      }
    }, 3200);
    return () => clearTimeout(id);
  }, [list, activeIndex, colorIndex, paused]);

  // Skeleton until the API products arrive.
  if (list.length === 0) {
    return (
      <section className="section-y bg-ink">
        <div className="wrap">
          <div className="mb-10 h-3 w-44 rounded bg-paper/10 animate-pulse" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="aspect-[4/5] rounded-2xl bg-paper/10 animate-pulse" />
            <div className="space-y-4 pt-4">
              <div className="h-3 w-1/3 rounded bg-paper/10 animate-pulse" />
              <div className="h-9 w-3/4 rounded bg-paper/10 animate-pulse" />
              <div className="h-7 w-1/4 rounded bg-paper/10 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-paper/10 animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const discount = p.compareAtPrice && p.compareAtPrice > p.price
    ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;

  const colorLabel = activeCol?.packColors
    ? `Pack of ${activeCol.packColors.length}`
    : (activeCol?.name || '');

  const selectProduct = (i) => { setActive(i); setColor(0); setQty(1); setAdded(false); };
  const num = (n) => String(n + 1).padStart(2, '0');

  const handleAdd = () => {
    addItem({
      id: p.id, name: p.name, slug: p.slug, image: mainImg || p.images[0],
      price: p.price, collection: p.collection, qty,
      size: p.sizes[0] || '', color: activeCol?.name || '',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <section
      className="section-y bg-ink text-paper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="wrap">

        {/* Heading */}
        <div className="flex items-end justify-between mb-8 md:mb-12 border-b border-paper/15 pb-6">
          <div>
            <p className="kicker kicker-light mb-3">The Reserve</p>
            <h2 className="h-display text-paper text-2xl md:text-4xl">A curated edit of rare pairs.</h2>
          </div>
          <Link href="/products?sort=bestsellers" className="link-line hidden sm:inline-flex"
            style={{ color: 'var(--paper)', borderColor: 'var(--paper)' }}>
            View all
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14 items-start">

          {/* LEFT — single large rounded image of the selected variation */}
          <div className="relative overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.04]">
            <div className="aspect-[4/5]">
              <img
                key={mainImg}
                src={mainImg}
                alt={p.name}
                className="h-full w-full object-cover animate-[fadeIn_0.5s_ease-out]"
              />
            </div>
            {p.badge && <span className="eyebrow absolute top-4 left-4 text-paper z-10">{p.badge}</span>}
          </div>

          {/* RIGHT — info + numbered pair list */}
          <div className="flex flex-col">
            <span className="eyebrow text-paper/50 mb-2.5">{p.collection}</span>
            <h3 className="h-display text-paper text-xl md:text-2xl leading-tight line-clamp-2">{p.name}</h3>
            {p.sku && <p className="text-[11px] tracking-[0.1em] text-paper/40 mt-2">SKU / {p.sku}</p>}

            <div className="flex items-baseline gap-3 mt-4 mb-6 border-t border-paper/15 pt-4">
              <span className="text-paper text-[15px]">₹{p.price.toLocaleString('en-IN')}</span>
              {p.compareAtPrice && p.compareAtPrice > p.price && (
                <span className="text-paper/40 text-[13px] line-through">₹{p.compareAtPrice.toLocaleString('en-IN')}</span>
              )}
              {discount > 0 && <span className="eyebrow text-paper/60">-{discount}%</span>}
            </div>

            {/* Colour selector — swaps the single image */}
            {p.colors.length > 0 && (
              <div className="mb-6">
                <p className="eyebrow text-paper/50 mb-3">Colour — <span className="text-paper">{colorLabel}</span></p>
                <div className="flex flex-wrap gap-2.5">
                  {p.colors.map((c, i) =>
                    c.packColors ? (
                      <button key={c.name} title={c.name} onClick={() => setColor(i)} aria-label={`Pack of ${c.packColors.length}`}
                        className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 transition-all ${
                          i === colorIndex ? 'border-paper' : 'border-paper/25 hover:border-paper/60'
                        }`}>
                        {c.packColors.map((pc) => (
                          <span key={pc.name} title={pc.name} className="h-4 w-4 rounded-full" style={{ backgroundColor: pc.hex || '#ddd' }} />
                        ))}
                      </button>
                    ) : (
                      <button key={c.name} title={c.name} onClick={() => setColor(i)}
                        className={`h-6 w-6 rounded-full transition-all ${
                          i === colorIndex ? 'ring-1 ring-paper ring-offset-2 ring-offset-ink' : 'opacity-55 hover:opacity-90'
                        }`}
                        style={{ backgroundColor: c.hex || '#ddd' }} />
                    )
                  )}
                </div>
              </div>
            )}

            {p.description && <p className="text-paper/60 text-[13px] leading-relaxed mb-7 line-clamp-3">{p.description}</p>}

            {/* Qty + CTA */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex shrink-0 items-center gap-3 rounded-lg border border-paper/25 px-4 py-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="text-paper/60 hover:text-paper">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <span className="w-5 text-center text-[13px] text-paper">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase" className="text-paper/60 hover:text-paper">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
              <button onClick={handleAdd} className={`btn-light flex-1 justify-center whitespace-nowrap ${added ? 'opacity-70' : ''}`}>
                {added ? 'Added' : 'Add to Bag'}
              </button>
            </div>
            <Link href={`/products/${p.slug}`} className="link-line" style={{ color: 'var(--paper)', borderColor: 'var(--paper)' }}>
              View details
            </Link>

            {/* Numbered pair list */}
            <div className="mt-10 border-t border-paper/15">
              {list.map((item, i) => (
                <button key={item.id} onClick={() => selectProduct(i)}
                  className="group flex w-full items-center gap-4 border-b border-paper/10 py-4 text-left">
                  <span className={`text-[11px] tracking-[0.12em] tabular-nums transition-colors ${i === activeIndex ? 'text-paper' : 'text-paper/35'}`}>{num(i)}</span>
                  <span className={`flex-1 truncate text-[13px] transition-colors ${i === activeIndex ? 'text-paper' : 'text-paper/45 group-hover:text-paper/80'}`}>{item.name}</span>
                  <span className={`text-[13px] tabular-nums transition-colors ${i === activeIndex ? 'text-paper' : 'text-paper/35'}`}>₹{item.price.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
