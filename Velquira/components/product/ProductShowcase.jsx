'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';

// Gallery + buy panel share one colour + size selection, so the whole panel —
// images, price, SKU, stock — reflects the exact variation the customer picked,
// and Add to cart sends that precise variation to the backend.
export default function ProductShowcase({ product }) {
  const { add } = useCart();
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const colorNames = product.colorNames || [];

  const [color, setColor] = useState(0);           // index into product.colors
  const [active, setActive] = useState(0);         // active gallery image
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Match the thumbnail rail's height to the main image so it never runs longer
  // than the photo — extra thumbnails scroll inside it instead.
  const mainRef = useRef(null);
  const thumbsRef = useRef(null);
  const [railH, setRailH] = useState(0);
  useEffect(() => {
    const el = mainRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setRailH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedColorName = colorNames[color] || '';

  // Sizes actually available for the selected colour (fall back to all sizes).
  const sizesForColor = useMemo(() => {
    const list = variants
      .filter((v) => !selectedColorName || v.color === selectedColorName)
      .map((v) => v.size)
      .filter(Boolean);
    const uniq = [...new Set(list)];
    return uniq.length ? uniq : (product.sizes || []);
  }, [variants, selectedColorName, product.sizes]);

  const [size, setSize] = useState(product.sizes?.[1] || product.sizes?.[0] || '');

  // Keep the chosen size valid whenever the colour changes.
  const effectiveSize = sizesForColor.includes(size) ? size : (sizesForColor[0] || size);

  // The variation matching the current colour + size (price/SKU/stock source).
  const activeVariant = useMemo(() => {
    if (!variants.length) return null;
    return (
      variants.find((v) => v.color === selectedColorName && v.size === effectiveSize) ||
      variants.find((v) => v.color === selectedColorName) ||
      variants[0]
    );
  }, [variants, selectedColorName, effectiveSize]);

  const price = activeVariant?.price ?? product.price;
  const oldPrice = activeVariant?.oldPrice ?? product.oldPrice;
  const sku = activeVariant?.sku || product.sku;
  const stock = activeVariant?.stock;
  const inStock = stock == null || stock > 0;

  // Images for the selected colour (fall back to all product images).
  const perColor = product.colorImages?.[color];
  const gallery = (Array.isArray(perColor) && perColor.length ? perColor : product.images) || [];
  const shown = gallery.length ? gallery : (product.image ? [product.image] : []);
  const mainSrc = shown[Math.min(active, shown.length - 1)] || product.image || null;

  // Preload every gallery image once so switching colour/thumbnail is instant
  // (no network wait, no shimmer flash — the swap looks immediate).
  useEffect(() => {
    const urls = new Set();
    (product.images || []).forEach((u) => urls.add(u));
    (product.colorImages || []).forEach((arr) => (arr || []).forEach((u) => urls.add(u)));
    urls.forEach((u) => { const im = new Image(); im.src = u; });
  }, [product]);

  // Auto-advance the main image through the thumbnails, one by one, every 3s.
  useEffect(() => {
    if (shown.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % shown.length), 3000);
    return () => clearInterval(t);
  }, [shown.length, color]);

  // Keep the active thumbnail in view by scrolling ONLY the rail — never the
  // page. (el.scrollIntoView scrolls every ancestor, so on mobile it yanked the
  // whole page back to the top each time the autoplay advanced the image.)
  useEffect(() => {
    const rail = thumbsRef.current;
    if (!rail) return;
    const el = rail.querySelector(`[data-thumb="${active}"]`);
    if (!el) return;
    const railRect = rail.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const vertical = rail.scrollHeight > rail.clientHeight + 1;
    if (vertical) {
      const delta = (elRect.top - railRect.top) - (rail.clientHeight - el.clientHeight) / 2;
      rail.scrollBy({ top: delta, behavior: 'smooth' });
    } else if (rail.scrollWidth > rail.clientWidth + 1) {
      const delta = (elRect.left - railRect.left) - (rail.clientWidth - el.clientWidth) / 2;
      rail.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }, [active]);

  const pickColor = (i) => { setColor(i); setActive(0); };

  const onAdd = () => {
    if (!inStock) return;
    // Use the SELECTED variation's main image (its first photo — stable, not the
    // auto-rotating one), and pass the colour so the cart line shows it.
    const variationMainImage = shown[0] || product.image || null;
    add(
      { ...product, price, oldPrice: oldPrice || null, image: variationMainImage, color: selectedColorName || null, sku },
      effectiveSize || 'M',
      qty,
      activeVariant?.id ?? null
    );
    toast.cart(`${product.name} added to cart`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  // Specification rows reflect the SELECTED variation (colour / size / SKU /
  // material change as you pick), then fall back to product-level details.
  const specs = [
    ['Color', selectedColorName],
    ['Size', effectiveSize],
    ['Material', activeVariant?.material || product.material],
    ['Care', product.care],
    ['Fit', product.fit],
    ['Cushioning', product.cushioning],
    ['Category', product.category],
    ['SKU', sku],
    ['Origin', product.origin],
  ].filter(([, v]) => v);

  return (
    <>
    {/* Editorial title band — sits full-width above the gallery/buy split. */}
    <div className="pdp-head">
      <span className="eyebrow">{product.category}</span>
      <h1>{product.name}</h1>
      <div className="pdp-meta">
        <span className="rating"><Icon name="Star" size={14} /> {product.rating}</span>
        <a href="#reviews" className="muted">{product.reviews} reviews</a>
        {sku && <span className="muted">SKU: {sku}</span>}
      </div>
    </div>

    <div className="pdp">
      <div className="pdp-gallery" style={railH ? { '--rail-h': `${railH}px` } : undefined}>
        {shown.length > 1 && (
          <div
            className="pdp-thumbs"
            ref={thumbsRef}
            tabIndex={0}
            data-lenis-prevent
            aria-label="Product image thumbnails"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.currentTarget.scrollBy({ top: 120, behavior: 'smooth' }); e.preventDefault(); }
              if (e.key === 'ArrowUp') { e.currentTarget.scrollBy({ top: -120, behavior: 'smooth' }); e.preventDefault(); }
            }}
          >
            {shown.map((src, i) => (
              <button
                key={src + i}
                type="button"
                data-thumb={i}
                className={`pdp-thumb${i === active ? ' active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
              >
                <img src={src} alt={`${product.name} view ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="pdp-main" ref={mainRef}>
          {mainSrc
            ? <img src={mainSrc} alt={product.name} />
            : <span aria-hidden style={{ color: '#c3ccd2' }}><Icon name="Sparkles" size={72} /></span>}
          {product.badge === 'new' && <span className="pcard-badge new" style={{ top: 16, left: 16 }}>New</span>}
        </div>
      </div>

      <div className="pdp-info">
        <div className="pdp-buycard">
        <div className="pdp-price">
          ₹{Number(price).toFixed(0)}
          {oldPrice ? <span className="old">₹{Number(oldPrice).toFixed(0)}</span> : null}
        </div>

        {/* Stock reflects the selected variation */}
        <div className="pdp-stock" style={{ marginBottom: 14 }}>
          {inStock
            ? <span className="in-stock"><Icon name="ShieldCheck" size={13} /> {stock != null && stock <= 5 ? `Only ${stock} left` : 'In stock'}</span>
            : <span className="muted" style={{ color: 'var(--sale)' }}><Icon name="X" size={13} /> Out of stock</span>}
        </div>

        <div className="buy">
          {product.colors?.length > 0 && (
            <div className="opt">
              <span className="opt-label">Color{selectedColorName ? ` — ${selectedColorName}` : ''}</span>
              <div className="swatches">
                {product.colors.map((c, i) => (
                  <button key={i} type="button" className={`swatch${i === color ? ' active' : ''}`}
                    style={{ background: c }} onClick={() => pickColor(i)}
                    aria-label={colorNames[i] || `Color ${i + 1}`} title={colorNames[i] || ''} />
                ))}
              </div>
            </div>
          )}

          {sizesForColor.length > 0 && (
            <div className="opt">
              <span className="opt-label">Size</span>
              <div className="size-row">
                {sizesForColor.map((s) => (
                  <button key={s} type="button" className={`size-btn${s === effectiveSize ? ' active' : ''}`}
                    onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="buy-row">
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
            </div>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onAdd} disabled={!inStock}>
              {!inStock ? 'Out of stock'
                : added ? <>Added to cart <Icon name="ShieldCheck" size={16} /></>
                : <>Add to cart <Icon name="ShoppingBag" size={16} /></>}
            </button>
          </div>
        </div>

        <div className="pdp-trust">
          <div><Icon name="Truck" size={16} /> Free shipping over ₹999</div>
          <div><Icon name="RefreshCw" size={16} /> 14-day returns</div>
          <div><Icon name="ShieldCheck" size={16} /> Authentic</div>
        </div>
        </div>

        {/* About + Specs live in the buy column now, so the right side fills out
            beside the tall gallery instead of being just price + options. */}
        <div className="pdp-about">
          <span className="eyebrow">Details</span>
          <h2>About this product</h2>
          {product.description
            ? <p>{product.description}</p>
            : <p className="muted">No description available for this product yet.</p>}

          {product.features?.length > 0 && (
            <ul className="pdp-features">
              {product.features.map((f) => (
                <li key={f.text}><span className="ic"><Icon name={f.icon} size={18} /></span>{f.text}</li>
              ))}
            </ul>
          )}
        </div>

        <aside className="pdp-specs">
          <h3>Specifications</h3>
          <dl>
            {specs.map(([k, v]) => (
              <div className="spec-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
    </>
  );
}
