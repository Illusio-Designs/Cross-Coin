'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';

// Soxbae PDP — an editorial layout: a large image with a horizontal thumbnail
// strip beneath it (left), a calm serif buy panel (right, sticky), then a
// full-width "details" band pairing the story with a specifications card.
// Gallery + colour + size share one selection so price, SKU and stock always
// reflect the exact variation, and Add to cart sends that variation.
export default function ProductShowcase({ product, initialColor }) {
  const { add } = useCart();
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const colorNames = product.colorNames || [];

  const initialColorIndex = (() => {
    if (!initialColor) return 0;
    const want = String(initialColor).trim().toLowerCase();
    const i = colorNames.findIndex((c) => String(c).trim().toLowerCase() === want);
    return i >= 0 ? i : 0;
  })();
  const [color, setColor] = useState(initialColorIndex);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const stripRef = useRef(null);

  const selectedColorName = colorNames[color] || '';

  const sizesForColor = useMemo(() => {
    const list = variants
      .filter((v) => !selectedColorName || v.color === selectedColorName)
      .map((v) => v.size)
      .filter(Boolean);
    const uniq = [...new Set(list)];
    return uniq.length ? uniq : (product.sizes || []);
  }, [variants, selectedColorName, product.sizes]);

  const [size, setSize] = useState(product.sizes?.[1] || product.sizes?.[0] || '');
  const effectiveSize = sizesForColor.includes(size) ? size : (sizesForColor[0] || size);

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
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  const perColor = product.colorImages?.[color];
  const gallery = (Array.isArray(perColor) && perColor.length ? perColor : product.images) || [];
  const shown = gallery.length ? gallery : (product.image ? [product.image] : []);
  const mainSrc = shown[Math.min(active, shown.length - 1)] || product.image || null;

  // Preload every gallery image once so switching colour/thumbnail is instant.
  useEffect(() => {
    const urls = new Set();
    (product.images || []).forEach((u) => urls.add(u));
    (product.colorImages || []).forEach((arr) => (arr || []).forEach((u) => urls.add(u)));
    urls.forEach((u) => { const im = new Image(); im.src = u; });
  }, [product]);

  // Auto-advance the main image through the strip every 3.5s.
  useEffect(() => {
    if (shown.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % shown.length), 3500);
    return () => clearInterval(t);
  }, [shown.length, color]);

  // Keep the active thumbnail in view by scrolling ONLY the strip (horizontal).
  useEffect(() => {
    const rail = stripRef.current;
    if (!rail) return;
    const el = rail.querySelector(`[data-thumb="${active}"]`);
    if (!el || rail.scrollWidth <= rail.clientWidth + 1) return;
    const railRect = rail.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta = (elRect.left - railRect.left) - (rail.clientWidth - el.clientWidth) / 2;
    rail.scrollBy({ left: delta, behavior: 'smooth' });
  }, [active]);

  const pickColor = (i) => { setColor(i); setActive(0); };

  const onAdd = () => {
    if (!inStock) return;
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

  const specs = [
    ['Colour', selectedColorName],
    ['Size', effectiveSize],
    ['Material', activeVariant?.material || product.material],
    ['Care', product.care],
    ['Fit', product.fit],
    ['Cushioning', product.cushioning],
    ['Category', product.category],
    ['SKU', sku],
    ['Origin', product.origin],
  ].filter(([, v]) => v);

  const ASSURANCES = [
    ['Truck', 'Free shipping over ₹999'],
    ['RefreshCw', '14-day easy returns'],
    ['ShieldCheck', '100% authentic'],
  ];

  return (
    <>
      <div className="pdx">
        {/* Gallery */}
        <div className="pdx-gallery">
          <div className="pdx-main">
            {mainSrc
              ? <img src={mainSrc} alt={product.name} />
              : <span aria-hidden style={{ color: 'var(--accent-600)', opacity: .5 }}><Icon name="Footprints" size={80} /></span>}
            {product.badge === 'new' && <span className="pdx-badge">New</span>}
            {off > 0 && <span className="pdx-badge pdx-badge-off">{off}% off</span>}
          </div>

          {shown.length > 1 && (
            <div className="pdx-strip" ref={stripRef} data-lenis-prevent>
              {shown.map((src, i) => (
                <button key={src + i} type="button" data-thumb={i}
                  className={`pdx-thumb${i === active ? ' active' : ''}`}
                  onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}>
                  <img src={src} alt={`${product.name} view ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy panel */}
        <div className="pdx-buy">
          <span className="pdx-cat">{product.category}</span>
          <h1 className="pdx-title">{product.name}</h1>

          <div className="pdx-rating">
            <span className="pdx-stars" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="Star" size={15} className={i < Math.round(product.rating || 0) ? 'on' : ''} />
              ))}
            </span>
            <span>{Number(product.rating || 0).toFixed(1)}</span>
            <a href="#reviews" className="pdx-rating-link">{product.reviews} reviews</a>
          </div>

          <div className="pdx-price">
            <span className="pdx-price-now">₹{Number(price).toFixed(0)}</span>
            {oldPrice ? <span className="pdx-price-old">₹{Number(oldPrice).toFixed(0)}</span> : null}
            {off > 0 && <span className="pdx-price-off">Save {off}%</span>}
          </div>

          {product.description && <p className="pdx-lead">{product.description}</p>}

          <div className="pdx-rule" />

          {product.colors?.length > 0 && (
            <div className="pdx-opt">
              <span className="pdx-opt-label">Colour{selectedColorName ? <em> — {selectedColorName}</em> : null}</span>
              <div className="pdx-swatches">
                {product.colors.map((c, i) => (
                  <button key={i} type="button" className={`pdx-swatch${i === color ? ' active' : ''}`}
                    style={{ background: c }} onClick={() => pickColor(i)}
                    aria-label={colorNames[i] || `Colour ${i + 1}`} title={colorNames[i] || ''} />
                ))}
              </div>
            </div>
          )}

          {sizesForColor.length > 0 && (
            <div className="pdx-opt">
              <span className="pdx-opt-label">Size</span>
              <div className="pdx-sizes">
                {sizesForColor.map((s) => (
                  <button key={s} type="button" className={`pdx-size${s === effectiveSize ? ' active' : ''}`}
                    onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="pdx-actions">
            <div className="pdx-qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
            </div>
            <button type="button" className="pdx-add" onClick={onAdd} disabled={!inStock}>
              {!inStock ? 'Out of stock'
                : added ? <>Added to cart <Icon name="ShieldCheck" size={17} /></>
                : <>Add to cart · ₹{Number(price * qty).toFixed(0)} <Icon name="ShoppingBag" size={17} /></>}
            </button>
          </div>

          <div className="pdx-stock">
            {inStock
              ? <span className="on"><span className="dot" /> {stock != null && stock <= 5 ? `Only ${stock} left in stock` : 'In stock, ready to ship'}</span>
              : <span className="off"><Icon name="X" size={13} /> Out of stock</span>}
          </div>

          <ul className="pdx-assure">
            {ASSURANCES.map(([icon, text]) => (
              <li key={text}><Icon name={icon} size={17} /> {text}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Details band */}
      <section className="pdx-details">
        <div className="pdx-details-head">
          <span className="eyebrow">The details</span>
          <h2>Made to disappear on your feet</h2>
        </div>
        <div className="pdx-details-grid">
          <div className="pdx-story">
            <p>{product.description || 'A considered everyday sock — cushioned where it counts, breathable through the day and built to keep its shape wash after wash.'}</p>
            {product.features?.length > 0 && (
              <ul className="pdx-features">
                {product.features.map((f) => (
                  <li key={f.text}><span className="pdx-feature-ic"><Icon name={f.icon} size={18} /></span>{f.text}</li>
                ))}
              </ul>
            )}
          </div>

          <aside className="pdx-specs">
            <h3>Specifications</h3>
            <dl>
              {specs.map(([k, v]) => (
                <div className="pdx-spec-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </aside>
        </div>
      </section>
    </>
  );
}
