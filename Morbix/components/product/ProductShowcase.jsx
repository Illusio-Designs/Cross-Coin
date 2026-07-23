'use client';

import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';

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

  const pickColor = (i) => { setColor(i); setActive(0); };

  const onAdd = () => {
    if (!inStock) return;
    // Merge the variation's price/image/sku onto the product so the guest cart
    // line shows the right combo; authed carts recompute from variationId.
    add(
      { ...product, price, oldPrice: oldPrice || null, image: mainSrc || product.image, sku },
      effectiveSize || 'M',
      qty,
      activeVariant?.id ?? null
    );
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
    <div className="pdp">
      <div className="pdp-gallery">
        {shown.length > 1 && (
          <div className="pdp-thumbs">
            {shown.map((src, i) => (
              <button
                key={src + i}
                type="button"
                className={`pdp-thumb${i === active ? ' active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
              >
                <img src={src} alt={`${product.name} view ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="pdp-main">
          {mainSrc
            ? <img src={mainSrc} alt={product.name} />
            : <span aria-hidden style={{ color: '#c3ccd2' }}><Icon name="Footprints" size={72} /></span>}
          {product.badge === 'new' && <span className="pcard-badge new" style={{ top: 16, left: 16 }}>New</span>}
        </div>
      </div>

      <div className="pdp-info">
        <span className="eyebrow">{product.category}</span>
        <h1>{product.name}</h1>
        <div className="pdp-meta">
          <span className="rating"><Icon name="Star" size={14} /> {product.rating}</span>
          <a href="#reviews" className="muted">{product.reviews} reviews</a>
          {sku && <span className="muted">SKU: {sku}</span>}
        </div>
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
    </div>

    {/* ── About + Specifications (specs track the selected variation) ── */}
    <section className="pdp-details">
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
    </section>
    </>
  );
}
