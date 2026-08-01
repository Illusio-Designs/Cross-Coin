import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

/* "Hand-Picked" — a cinematic animated spotlight.
   One large hero image of the SELECTED colour that cross-fades on change,
   staggered text reveals, an auto-advancing progress bar through the
   featured pairs, and a scaling product filmstrip. Pauses on hover. */

const FALLBACK_IMG = '/assets/Gripzus.JPG.jpeg';
const ROTATE_MS = 5200;

function normalize(p) {
  const imgs = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
  return {
    id:    p.id,
    name:  p.name || 'Gripzus Pair',
    slug:  p.slug || p.handle || String(p.id),
    category: p.collection || p.collectionName || 'Gripzus',
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
  const list = (Array.isArray(products) ? products : []).slice(0, 5).map(normalize);

  const [active, setActive] = useState(0);
  const [color, setColor]   = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);
  const [paused, setPaused] = useState(false);
  const [shown, setShown]   = useState(false);
  const { addItem } = useCart();
  const sectionRef = useRef(null);

  const activeIndex = list.length ? Math.min(active, list.length - 1) : 0;
  const product = list[activeIndex];

  // Full image gallery for the selected pair — the colour's own images if the
  // variation has them, otherwise the product's whole gallery. All images show
  // as thumbnails (like the sibling brand), never just one.
  const gallery = useMemo(() => {
    if (!product) return [FALLBACK_IMG];
    const perColor = (product.colors[color]?.images || []).filter(Boolean);
    const all = (product.images || []).filter(Boolean);
    const g = perColor.length ? perColor : all;
    return g.length ? g : [FALLBACK_IMG];
  }, [product, color]);
  const heroImg = gallery[Math.min(imgIdx, gallery.length - 1)] || FALLBACK_IMG;

  // Reset to the first image whenever the pair or colour changes.
  const selectColor = (i) => { setColor(i); setImgIdx(0); };
  const goPair = (n) => {
    const len = list.length || 1;
    setActive(((n % len) + len) % len);
    setColor(0); setImgIdx(0); setQty(1);
  };

  // Reveal on scroll into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-advance through the featured pairs.
  useEffect(() => {
    if (list.length <= 1 || paused) return;
    const t = setTimeout(() => { setActive((i) => (i + 1) % list.length); setColor(0); setImgIdx(0); setQty(1); }, ROTATE_MS);
    return () => clearTimeout(t);
  }, [list.length, activeIndex, paused]);

  if (!product) return null;

  const activeCol = product.colors[Math.min(color, Math.max(0, product.colors.length - 1))];
  const colorLabel = activeCol?.packColors ? `Pack of ${activeCol.packColors.length}` : (activeCol?.name || '');
  const off = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const onAdd = () => {
    addItem({
      id: product.id, name: product.name, slug: product.slug, image: heroImg,
      price: product.price, collection: product.category, qty,
      size: product.sizes[0] || '', color: activeCol?.name || '',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <section
      ref={sectionRef}
      className={`excl3 ${shown ? 'is-shown' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="wrap">
        <div className="excl3-head">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>Hand-Picked</span>
          <h2 className="h-display excl3-title">The pair on repeat.</h2>
        </div>

        <div className="excl3-grid">
          {/* Stage — variation thumbnails + auto-height main image */}
          <div className="excl3-stage">
            <span className="excl3-ghost" aria-hidden>{String(activeIndex + 1).padStart(2, '0')}</span>
            <div className="excl3-stage-row">
              {gallery.length > 1 && (
                <div className="excl3-thumbs">
                  {gallery.map((img, i) => (
                    <button key={img + i} type="button" onClick={() => setImgIdx(i)}
                      className={`excl3-thumb ${i === Math.min(imgIdx, gallery.length - 1) ? 'on' : ''}`}
                      aria-label={`View image ${i + 1}`}>
                      <img src={img} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              <div className="excl3-frame">
                <img key={heroImg} src={heroImg} alt={product.name} className="excl3-img" />
                {product.badge && <span className="excl3-badge">{product.badge}</span>}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="excl3-info" key={product.id}>
            <span className="excl3-cat i0">{product.category}</span>
            <h3 className="h-display excl3-name i1">{product.name}</h3>
            <div className="excl3-price i2">
              <span className="now">₹{product.price.toLocaleString('en-IN')}</span>
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="was">₹{product.oldPrice.toLocaleString('en-IN')}</span>
              )}
              {off > 0 && <span className="off">{off}% OFF</span>}
            </div>

            {product.colors.length > 0 && (
              <div className="excl3-colors i3">
                <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>Colour — <em style={{ color: '#fff', fontStyle: 'normal' }}>{colorLabel}</em></span>
                <div className="excl3-swatches">
                  {product.colors.map((c, i) =>
                    c.packColors ? (
                      <button key={c.name} type="button" onClick={() => selectColor(i)} title={c.name} aria-label={`Pack of ${c.packColors.length}`}
                        className={`excl3-pack ${i === color ? 'on' : ''}`}>
                        {c.packColors.map((pc) => <span key={pc.name} style={{ backgroundColor: pc.hex || '#ddd' }} />)}
                      </button>
                    ) : (
                      <button key={c.name} type="button" onClick={() => selectColor(i)} title={c.name} aria-label={c.name}
                        className={`excl3-dot ${i === color ? 'on' : ''}`} style={{ backgroundColor: c.hex || '#ddd' }} />
                    )
                  )}
                </div>
              </div>
            )}

            {product.description && <p className="excl3-desc i4">{product.description}</p>}

            <div className="excl3-actions i5">
              <div className="excl3-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
              </div>
              <button type="button" className="excl3-add" onClick={onAdd}>{added ? 'Added ✓' : 'Add to Bag'}</button>
              <Link href={`/products/${product.slug}`} className="excl3-view">View</Link>
            </div>
          </div>
        </div>

        {/* Product switcher — thumbnails of the other featured pairs (no counter). */}
        {list.length > 1 && (
          <div className="excl3-pairs">
            {list.map((p, i) => (
              <button key={p.id} type="button" onClick={() => goPair(i)}
                className={`excl3-pairbtn ${i === activeIndex ? 'on' : ''}`} aria-label={p.name} title={p.name}>
                <img src={p.images?.[0]} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .excl3 { background: #0A0A0A; color: #fff; padding: 72px 0; overflow: hidden; }
        @media (min-width: 768px) { .excl3 { padding: 104px 0; } }
        .excl3-head { margin-bottom: 40px; opacity: 0; transform: translateY(16px); transition: opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1); }
        .is-shown .excl3-head { opacity: 1; transform: none; }
        .excl3-title { color: #fff; font-size: clamp(1.8rem, 4vw, 3.2rem); margin: 10px 0 0; }

        .excl3-grid { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center; }
        @media (min-width: 1024px) { .excl3-grid { grid-template-columns: 1.15fr 1fr; gap: 64px; } }

        .excl3-stage { position: relative; }
        .excl3-ghost {
          position: absolute; top: -8%; left: -2%; z-index: 0; font-family: var(--font-display);
          font-weight: 600; font-size: clamp(9rem, 26vw, 22rem); line-height: 1; color: transparent;
          -webkit-text-stroke: 1px rgba(255,255,255,0.08); pointer-events: none; user-select: none;
        }
        .excl3-stage-row { display: flex; gap: 12px; align-items: flex-start; }
        .excl3-thumbs { display: flex; flex-direction: column; gap: 10px; flex: 0 0 auto; }
        .excl3-thumb { width: 58px; height: 58px; border-radius: 10px; overflow: hidden; opacity: .5; box-shadow: 0 0 0 1px rgba(255,255,255,0.15); transition: opacity .25s ease, box-shadow .25s ease, transform .25s ease; }
        .excl3-thumb:hover { opacity: .85; }
        .excl3-thumb.on { opacity: 1; box-shadow: 0 0 0 2px #fff; }
        .excl3-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Auto-height main image (natural ratio), capped so it never dominates. */
        .excl3-frame {
          position: relative; z-index: 1; overflow: hidden; border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03);
          box-shadow: 0 40px 90px -50px rgba(0,0,0,0.8);
          flex: 1; min-width: 0; max-width: 440px;
          opacity: 0; transform: translateY(24px) scale(.98);
          transition: opacity .8s ease, transform .8s cubic-bezier(.22,1,.36,1);
        }
        .is-shown .excl3-frame { opacity: 1; transform: none; }
        .excl3-img { width: 100%; height: auto; display: block; animation: excl3-reveal .8s cubic-bezier(.22,1,.36,1); }
        .excl3-frame:hover .excl3-img { transform: scale(1.04); transition: transform 1s cubic-bezier(.22,1,.36,1); }
        @keyframes excl3-reveal { from { opacity: 0; transform: scale(1.07); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
        .excl3-badge { position: absolute; top: 14px; left: 14px; z-index: 2; font-size: 10px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: #fff; color: #0A0A0A; padding: 5px 11px; border-radius: 999px; box-shadow: 0 6px 20px -8px rgba(0,0,0,0.5); }

        .excl3-info > * { opacity: 0; transform: translateY(14px); animation: excl3-up .6s cubic-bezier(.22,1,.36,1) forwards; }
        .excl3-info .i0 { animation-delay: .05s; } .excl3-info .i1 { animation-delay: .12s; }
        .excl3-info .i2 { animation-delay: .19s; } .excl3-info .i3 { animation-delay: .26s; }
        .excl3-info .i4 { animation-delay: .33s; } .excl3-info .i5 { animation-delay: .4s; }
        @keyframes excl3-up { to { opacity: 1; transform: none; } }

        .excl3-cat { display: block; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
        .excl3-name { color: #fff; font-size: clamp(1.5rem, 3vw, 2.4rem); margin: 12px 0 0; line-height: 1.05; }
        .excl3-price { display: flex; align-items: baseline; gap: 12px; margin: 18px 0 0; }
        .excl3-price .now { font-size: 20px; } .excl3-price .was { color: rgba(255,255,255,0.4); text-decoration: line-through; font-size: 15px; }
        .excl3-price .off { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 3px 8px; }

        .excl3-colors { margin: 26px 0 0; }
        .excl3-swatches { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .excl3-dot { width: 26px; height: 26px; border-radius: 999px; cursor: pointer; transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease; box-shadow: 0 0 0 1px rgba(255,255,255,0.2); }
        .excl3-dot:hover { transform: scale(1.12); }
        .excl3-dot.on { transform: scale(1.15); box-shadow: 0 0 0 2px #0A0A0A, 0 0 0 4px #fff; }
        .excl3-pack { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.25); cursor: pointer; transition: border-color .2s ease, transform .2s ease; }
        .excl3-pack:hover { transform: translateY(-1px); } .excl3-pack.on { border-color: #fff; }
        .excl3-pack span { width: 16px; height: 16px; border-radius: 999px; box-shadow: 0 0 0 1px rgba(255,255,255,0.25); }

        .excl3-desc { color: rgba(255,255,255,0.6); font-size: 13px; line-height: 1.7; margin: 24px 0 0; max-width: 34rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        .excl3-actions { display: flex; align-items: center; gap: 12px; margin: 30px 0 0; flex-wrap: wrap; }
        .excl3-qty { display: inline-flex; align-items: center; gap: 14px; border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; padding: 11px 16px; }
        .excl3-qty button { color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1; } .excl3-qty button:hover { color: #fff; } .excl3-qty span { min-width: 18px; text-align: center; font-size: 14px; }
        .excl3-add { flex: 1; min-width: 160px; background: #fff; color: #0A0A0A; border-radius: 12px; padding: 14px 22px; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; transition: transform .2s ease, opacity .2s ease; }
        .excl3-add:hover { transform: translateY(-2px); } .excl3-add:active { transform: none; }
        .excl3-view { display: inline-flex; align-items: center; border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 14px 20px; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; transition: background .2s ease, color .2s ease; }
        .excl3-view:hover { background: #fff; color: #0A0A0A; }

        .excl3-pairs { display: flex; gap: 10px; margin-top: 40px; flex-wrap: wrap; }
        .excl3-pairbtn { width: 62px; height: 62px; border-radius: 12px; overflow: hidden; opacity: .5; box-shadow: 0 0 0 1px rgba(255,255,255,0.15); transition: opacity .25s ease, box-shadow .25s ease, transform .25s ease; }
        .excl3-pairbtn:hover { opacity: .85; }
        .excl3-pairbtn.on { opacity: 1; box-shadow: 0 0 0 2px #fff; transform: scale(1.04); }
        .excl3-pairbtn img { width: 100%; height: 100%; object-fit: cover; }

        @media (prefers-reduced-motion: reduce) {
          .excl3-head, .excl3-frame, .excl3-info > *, .excl3-img { animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
        }
      `}</style>
    </section>
  );
}
