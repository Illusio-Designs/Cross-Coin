import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

/* "Hand-Picked" — a featured-product spotlight, modelled on the other
   Cross-Coin brands' Exclusive section. Pick a product from the switcher
   rail, browse ONLY the selected colour's images on the left, choose a
   colour and add straight to the cart. */

const FALLBACK_IMG = '/assets/Gripzus.JPG.jpeg';

function normalize(p) {
  const imgs = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  return {
    id:    p.id,
    name:  p.name || 'Gripzus Pair',
    slug:  p.slug || p.handle || String(p.id),
    category: p.collection || p.collectionName || 'Gripzus',
    sku:   p.sku || '',
    price: Number(p.salePrice ?? p.price ?? 0),
    oldPrice: p.compareAtPrice ? Number(p.compareAtPrice) : (p.oldPrice ? Number(p.oldPrice) : null),
    badge: p.badge || '',
    images: imgs.length ? imgs : [p.image || FALLBACK_IMG],
    colors: Array.isArray(p.colors) ? p.colors.filter((c) => c?.name) : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    description: p.description || '',
  };
}

export default function ExclusiveSection({ products = [] }) {
  const list = (Array.isArray(products) ? products : []).slice(0, 4).map(normalize);

  const [active, setActive] = useState(0);
  const [thumb, setThumb]   = useState(0);
  const [color, setColor]   = useState(0);
  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);
  const { addItem } = useCart();
  const thumbsRef = useRef(null);
  const mainRef   = useRef(null);
  const [railH, setRailH] = useState(0);

  const activeIndex = list.length ? Math.min(active, list.length - 1) : 0;
  const product = list[activeIndex];

  // ONLY the selected colour's images (fall back to product images).
  const gallery = useMemo(() => {
    if (!product) return [];
    const perColor = product.colors[color]?.images;
    const g = (Array.isArray(perColor) && perColor.length ? perColor : product.images) || [];
    return g.length ? g : [FALLBACK_IMG];
  }, [product, color]);

  const thumbIndex = Math.min(thumb, gallery.length - 1);

  // Match the vertical thumb rail height to the main image.
  useEffect(() => {
    const el = mainRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setRailH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-advance the spotlight image through the selected colour's gallery.
  useEffect(() => {
    if (gallery.length <= 1) return;
    const t = setInterval(() => setThumb((i) => (i + 1) % gallery.length), 3000);
    return () => clearInterval(t);
  }, [gallery.length, activeIndex, color]);

  // Keep the active thumbnail centred by scrolling only the rail.
  useEffect(() => {
    const rail = thumbsRef.current;
    if (!rail) return;
    const el = rail.querySelector(`[data-thumb="${thumbIndex}"]`);
    if (!el) return;
    const railRect = rail.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (rail.scrollHeight > rail.clientHeight + 1) {
      rail.scrollBy({ top: (elRect.top - railRect.top) - (rail.clientHeight - el.clientHeight) / 2, behavior: 'smooth' });
    }
  }, [thumbIndex]);

  if (!product) return null;

  const activeCol = product.colors[Math.min(color, Math.max(0, product.colors.length - 1))];
  const colorLabel = activeCol?.packColors ? `Pack of ${activeCol.packColors.length}` : (activeCol?.name || '');
  const mainSrc = gallery[thumbIndex] || product.images[0];
  const off = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const pick = (i) => { setActive(i); setThumb(0); setColor(0); setQty(1); setAdded(false); };
  const pickColor = (i) => { setColor(i); setThumb(0); };

  const onAdd = () => {
    addItem({
      id: product.id, name: product.name, slug: product.slug,
      image: gallery[0] || product.images[0],
      price: product.price, collection: product.category, qty,
      size: product.sizes[0] || '', color: activeCol?.name || '',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <section className="section-y">
      <div className="wrap">
        <div className="rounded-2xl border border-line bg-paper-warm/50 p-5 md:p-8 lg:p-10">

          {/* Head */}
          <div className="flex flex-col gap-3 mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="eyebrow text-ink-muted">Currently obsessed</span>
              <h2 className="h-display text-2xl md:text-4xl mt-2.5">The pair on repeat.</h2>
            </div>
            <p className="text-ink-soft text-[13px] max-w-sm leading-relaxed">
              The one we keep reaching for — swatched, styled and ready to slip into the bag.
            </p>
          </div>

          {/* Gallery + Info */}
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12 items-start">

            {/* Gallery */}
            <div className="flex gap-3">
              {gallery.length > 1 && (
                <div
                  ref={thumbsRef}
                  className="flex shrink-0 flex-col gap-2.5 overflow-y-auto no-scrollbar"
                  style={railH ? { maxHeight: railH } : undefined}
                >
                  {gallery.map((src, i) => (
                    <button
                      key={src + i}
                      data-thumb={i}
                      type="button"
                      onClick={() => setThumb(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-all ${
                        i === thumbIndex ? 'border-ink' : 'border-line opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div ref={mainRef} className="relative flex-1 overflow-hidden rounded-xl border border-line bg-paper">
                <div className="aspect-[4/5]">
                  <img key={mainSrc} src={mainSrc} alt={product.name} className="h-full w-full object-cover animate-[fadeIn_0.4s_ease-out]" />
                </div>
                {product.badge && <span className="eyebrow absolute top-3 left-3 text-ink z-10">{product.badge}</span>}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <span className="eyebrow text-ink-muted">{product.category}</span>
              <h3 className="h-display text-xl md:text-2xl mt-2 leading-snug">{product.name}</h3>

              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-[17px] text-ink">₹{product.price.toLocaleString('en-IN')}</span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-[14px] text-ink-muted line-through">₹{product.oldPrice.toLocaleString('en-IN')}</span>
                )}
                {off > 0 && <span className="eyebrow text-ink-soft">{off}% off</span>}
              </div>

              {/* Colour swatches — swap the gallery */}
              {product.colors.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow text-ink-muted mb-2.5">Colour{colorLabel ? ` — ${colorLabel}` : ''}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((c, i) =>
                      c.packColors ? (
                        <button key={c.name} type="button" onClick={() => pickColor(i)} title={c.name} aria-label={`Pack of ${c.packColors.length}`}
                          className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 transition-colors ${i === color ? 'border-ink' : 'border-line hover:border-ink-muted'}`}>
                          {c.packColors.map((pc) => (
                            <span key={pc.name} className="h-4 w-4 rounded-full ring-1 ring-line" style={{ backgroundColor: pc.hex || '#ddd' }} />
                          ))}
                        </button>
                      ) : (
                        <button key={c.name} type="button" onClick={() => pickColor(i)} title={c.name} aria-label={c.name}
                          className={`h-7 w-7 rounded-full ring-1 ring-offset-2 ring-offset-paper transition-all ${i === color ? 'ring-ink' : 'ring-line hover:ring-ink-muted'}`}
                          style={{ backgroundColor: c.hex || '#ddd' }} />
                      )
                    )}
                  </div>
                </div>
              )}

              {product.description && <p className="text-ink-soft text-[13px] leading-relaxed mt-6 line-clamp-3">{product.description}</p>}

              {/* Qty + Add + View */}
              <div className="flex items-center gap-3 mt-7">
                <div className="flex shrink-0 items-center gap-3 rounded-lg border border-line px-3.5 py-3">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="text-ink-soft hover:text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                  <span className="w-5 text-center text-[13px]">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase" className="text-ink-soft hover:text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>
                <button type="button" onClick={onAdd} className="btn flex-1 justify-center whitespace-nowrap">
                  {added ? 'Added ✓' : 'Add to Bag'}
                </button>
                <Link href={`/products/${product.slug}`} className="btn-outline whitespace-nowrap">View</Link>
              </div>
            </div>
          </div>

          {/* Other products switcher */}
          {list.length > 1 && (
            <div className="mt-8 pt-6 border-t border-line">
              <p className="eyebrow text-ink-muted mb-3">Other products</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {list.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(i)}
                    title={p.name}
                    aria-label={p.name}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-all ${
                      i === activeIndex ? 'border-ink' : 'border-line opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={p.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
