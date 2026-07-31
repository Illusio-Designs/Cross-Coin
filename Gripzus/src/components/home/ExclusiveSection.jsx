import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

/* "The Reserve" — Gripzus exclusive showcase.
   Dark editorial band: a vertical thumbnail rail of the active pair's
   images + a crossfading main image on the left, the pair's info and a
   numbered pair-list on the right. The image steps through each thumbnail
   every 3s, then rolls on to the next pair. Pauses on hover. */

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
    description: p.description || p.note || 'A considered pair from the Gripzus atelier.',
  };
}

export default function ExclusiveSection({ products = [] }) {
  const list = (Array.isArray(products) ? products : []).slice(0, 4).map(normalize);

  const [active, setActive] = useState(0);
  const [thumb, setThumb]   = useState(0);
  const [color, setColor]   = useState(0);
  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);
  const [paused, setPaused] = useState(false);
  const { addItem } = useCart();

  const activeIndex = list.length ? Math.min(active, list.length - 1) : 0;
  const p = list[activeIndex];
  // Only the SELECTED variation's images (fall back to the product images
  // if a colour has none of its own) — never all variations mixed together.
  const activeColEarly = p && p.colors.length ? p.colors[Math.min(color, p.colors.length - 1)] : null;
  const displayImages = (activeColEarly?.images?.length ? activeColEarly.images : p?.images) || [];
  const thumbIndex = displayImages.length ? Math.min(thumb, displayImages.length - 1) : 0;

  // Every 3s step to the next image of the selected variation; once past the
  // last image, roll on to the next pair. Pauses on hover.
  useEffect(() => {
    if (list.length === 0 || paused) return;
    const id = setTimeout(() => {
      const count = displayImages.length;
      if (thumbIndex + 1 < count) {
        setThumb(thumbIndex + 1);
      } else if (list.length > 1) {
        setActive((activeIndex + 1) % list.length);
        setThumb(0); setColor(0); setQty(1);
      } else {
        setThumb(0);
      }
    }, 3000);
    return () => clearTimeout(id);
  }, [list, activeIndex, thumbIndex, paused, color, displayImages.length]);

  // Skeleton until the API products arrive.
  if (list.length === 0) {
    return (
      <section className="section-y bg-ink">
        <div className="wrap">
          <div className="mb-10 h-4 w-44 rounded-full bg-paper/10 animate-pulse" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.35fr_1fr]">
            <div className="aspect-[4/3] rounded-[24px] bg-paper/10 animate-pulse" />
            <div className="space-y-4 pt-4">
              <div className="h-3 w-1/3 rounded-full bg-paper/10 animate-pulse" />
              <div className="h-9 w-3/4 rounded-full bg-paper/10 animate-pulse" />
              <div className="h-7 w-1/4 rounded-full bg-paper/10 animate-pulse" />
              <div className="h-20 w-full rounded-[20px] bg-paper/10 animate-pulse" />
              <div className="h-12 w-full rounded-full bg-paper/10 animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const discount = p.compareAtPrice && p.compareAtPrice > p.price
    ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;

  const activeCol  = p.colors[Math.min(color, p.colors.length - 1)];
  const colorLabel = activeCol?.packColors
    ? `Pack of ${activeCol.packColors.length}`
    : (activeCol?.name || '');

  const selectProduct = (i) => { setActive(i); setThumb(0); setColor(0); setQty(1); setAdded(false); };
  const num = (n) => String(n + 1).padStart(2, '0');

  const handleAdd = () => {
    addItem({
      id: p.id, name: p.name, slug: p.slug, image: displayImages[thumbIndex] || displayImages[0] || p.images[0],
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
        <div className="flex flex-col gap-4 mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-px bg-paper/50" />
              <p className="eyebrow text-paper/70">The Reserve</p>
            </div>
            <h2 className="h-display text-paper text-3xl md:text-5xl tracking-[-0.03em]">
              A curated edit of <span className="h-italic">rare pairs.</span>
            </h2>
          </div>
          <Link href="/products?sort=bestsellers" className="hidden sm:inline-flex btn-light">View all</Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12 items-start">

          {/* LEFT — vertical thumbnail rail + crossfading main image */}
          <div className="flex gap-3 sm:gap-4">

            {/* Thumbnail rail — every image of the active pair */}
            <div className="flex shrink-0 flex-col gap-3">
              {displayImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setThumb(i)}
                  aria-label={`Image ${i + 1}`}
                  className={`h-[3.75rem] w-[3.75rem] shrink-0 overflow-hidden rounded-2xl bg-paper/5 transition-all sm:h-[4.75rem] sm:w-[4.75rem] ${
                    i === thumbIndex
                      ? 'ring-1 ring-paper ring-offset-2 ring-offset-ink'
                      : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main image — natural height, never cropped */}
            <div className="relative flex-1 overflow-hidden rounded-[24px] bg-paper/5 border border-paper/10">
              <img
                key={thumbIndex}
                src={displayImages[thumbIndex]}
                alt={p.name}
                className="block w-full h-auto animate-[fadeIn_0.5s_ease-out]"
              />
              {p.badge && (
                <span className="absolute top-4 left-4 bg-paper text-ink text-[10px] tracking-[0.16em] uppercase px-3 py-1 rounded-full">
                  {p.badge}
                </span>
              )}
              {/* Image counter */}
              <span className="absolute bottom-4 right-4 h-display text-paper/85 text-sm tracking-[0.2em]">
                {num(thumbIndex)} <span className="text-paper/40">/ {num(displayImages.length - 1)}</span>
              </span>
            </div>
          </div>

          {/* RIGHT — info + numbered pair list */}
          <div className="flex flex-col">
            <p className="eyebrow text-paper/55 mb-2">{p.collection}</p>
            <h3 className="h-display text-paper text-2xl md:text-3xl leading-tight line-clamp-2">{p.name}</h3>
            {p.sku && <p className="text-xs text-paper/45 mt-1">SKU: {p.sku}</p>}

            <div className="flex items-baseline gap-3 mt-4 mb-5">
              <span className="h-display text-paper text-2xl md:text-3xl">₹{p.price.toLocaleString('en-IN')}</span>
              {p.compareAtPrice && p.compareAtPrice > p.price && (
                <span className="text-paper/45 text-base line-through">₹{p.compareAtPrice.toLocaleString('en-IN')}</span>
              )}
              {discount > 0 && (
                <span className="text-[10px] tracking-[0.14em] uppercase bg-accent text-paper px-2.5 py-1 rounded-full">{discount}% Off</span>
              )}
            </div>

            {/* Colour selector */}
            {p.colors.length > 0 && (
              <div className="mb-5">
                <p className="eyebrow text-paper/55 mb-2">
                  Colour — <span className="normal-case tracking-normal text-paper">{colorLabel}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {p.colors.map((c, i) =>
                    c.packColors ? (
                      // Multi-colour pack — every colour shown together in one box
                      <button
                        key={c.name}
                        title={c.name}
                        onClick={() => { setColor(i); setThumb(0); }}
                        aria-label={`Pack of ${c.packColors.length}`}
                        className={`flex h-9 items-center gap-1.5 rounded-full border px-2.5 transition-all ${
                          i === color
                            ? 'border-paper ring-1 ring-paper ring-offset-2 ring-offset-ink'
                            : 'border-paper/30 hover:border-paper/60'
                        }`}
                      >
                        {c.packColors.map((pc) => (
                          <span
                            key={pc.name}
                            title={pc.name}
                            className="h-5 w-5 rounded-full border border-paper/40"
                            style={{ backgroundColor: pc.hex || '#ddd' }}
                          />
                        ))}
                      </button>
                    ) : (
                      <button
                        key={c.name}
                        title={c.name}
                        onClick={() => { setColor(i); setThumb(0); }}
                        className={`h-6 w-6 rounded-full ring-1 ring-offset-2 ring-offset-ink transition-all ${
                          i === color ? 'ring-paper' : 'ring-paper/25 hover:ring-paper/60'
                        }`}
                        style={{ backgroundColor: c.hex || '#ddd' }}
                      />
                    )
                  )}
                </div>
              </div>
            )}

            <p className="text-paper/65 text-sm md:text-base leading-relaxed mb-7 line-clamp-3">{p.description}</p>

            {/* Qty + CTA — qty + Add on one row, View below */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex shrink-0 items-center gap-3 rounded-full border border-paper/25 px-4 py-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="text-paper/60 hover:text-paper">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <span className="w-5 text-center text-sm text-paper">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase" className="text-paper/60 hover:text-paper">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
              <button
                onClick={handleAdd}
                className={`btn-light flex-1 justify-center whitespace-nowrap ${added ? '!bg-paper/70' : ''}`}
              >
                {added ? 'Added ✓' : 'Add to Bag'}
              </button>
            </div>
            <Link
              href={`/products/${p.slug}`}
              className="btn-outline w-full justify-center text-center whitespace-nowrap"
              style={{ color: 'var(--paper)', borderColor: 'rgba(255,255,255,0.35)' }}
            >
              View details
            </Link>

            {/* Numbered pair list */}
            <div className="mt-8 border-t border-paper/15">
              {list.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => selectProduct(i)}
                  className="group flex w-full items-center gap-4 border-b border-paper/10 py-3.5 text-left"
                >
                  <span className={`h-display text-sm tracking-[0.1em] transition-colors ${
                    i === activeIndex ? 'text-paper' : 'text-paper/35'
                  }`}>
                    {num(i)}
                  </span>
                  <span className={`flex-1 truncate text-sm transition-colors ${
                    i === activeIndex ? 'text-paper' : 'text-paper/45 group-hover:text-paper/80'
                  }`}>
                    {item.name}
                  </span>
                  <span className={`text-sm transition-colors ${
                    i === activeIndex ? 'text-paper' : 'text-paper/35'
                  }`}>
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                  {i === activeIndex && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
