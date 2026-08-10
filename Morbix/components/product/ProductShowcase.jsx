'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';
import { fbTrack } from '@/utils/pixel';
import { checkServiceability } from '@/lib/api/serviceability';

// Gallery + buy panel share one colour + size selection, so the whole panel —
// images, price, SKU, stock — reflects the exact variation the customer picked,
// and Add to cart sends that precise variation to the backend.
export default function ProductShowcase({ product, initialColor }) {
  const { add } = useCart();
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const colorNames = product.colorNames || [];

  // Preselect the colour named in ?color (when a card linked straight to it).
  const initialColorIndex = (() => {
    if (!initialColor) return 0;
    const want = String(initialColor).trim().toLowerCase();
    const i = colorNames.findIndex((c) => String(c).trim().toLowerCase() === want);
    return i >= 0 ? i : 0;
  })();
  const [color, setColor] = useState(initialColorIndex); // index into product.colors
  const [active, setActive] = useState(0);         // active gallery image
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Delivery / pincode serviceability check.
  const [pincode, setPincode] = useState('');
  const [serviceability, setServiceability] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const handlePincodeCheck = async () => {
    if (!/^\d{6}$/.test(pincode)) { setServiceability({ error: 'Enter a valid 6-digit pincode.' }); return; }
    setCheckingPin(true);
    setServiceability(null);
    try { setServiceability(await checkServiceability(pincode)); }
    catch { setServiceability({ error: 'Unable to check. Please try again.' }); }
    finally { setCheckingPin(false); }
  };
  // Estimated delivery date — uses the serviceable ETA when known, else 5 days.
  const eta = (() => {
    const days = (serviceability?.serviceable && serviceability?.estimated_delivery_days) || 5;
    const d = new Date();
    d.setDate(d.getDate() + days);
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return { day, suffix, month: d.toLocaleString('en-IN', { month: 'long' }) };
  })();

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

  // Meta funnel: ViewContent (browser pixel + server CAPI, deduped by eventID)
  // — fired once when the product loads.
  useEffect(() => {
    if (!product?.id) return;
    fbTrack('ViewContent', {
      content_ids: [String(product.id)],
      content_type: 'product',
      content_name: product.name || undefined,
      value: Number(product.price ?? 0),
      currency: 'INR',
      contents: [{ id: String(product.id), quantity: 1 }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

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

  // Preload the ACTIVE colour's gallery (not every colour's images), and only
  // when the browser is idle — so thumbnail swaps still feel instant without a
  // burst of full-size downloads on PDP load competing with the LCP image.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const perColorImgs = product.colorImages?.[color];
    const urls = ((Array.isArray(perColorImgs) && perColorImgs.length ? perColorImgs : product.images) || []).filter(Boolean);
    if (!urls.length) return;
    const preload = () => urls.forEach((u) => { const im = new Image(); im.src = u; });
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(preload, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, product?.id]);

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

        {/* Free shipping + delivery ETA */}
        <div className="pdp-ship">
          <Icon name="Truck" size={16} />
          <span><strong>Free shipping</strong> over ₹999</span>
          <span className="pdp-ship-eta">· Delivered by {eta.day}{eta.suffix} {eta.month}</span>
        </div>

        {/* Stock reflects the selected variation */}
        <div className="pdp-stock" style={{ marginBottom: 14 }}>
          {inStock
            ? <span className="in-stock"><Icon name="ShieldCheck" size={13} /> {stock != null && stock <= 5 ? `Only ${stock} left` : 'In stock'}</span>
            : <span className="muted" style={{ color: 'var(--sale)' }}><Icon name="X" size={13} /> Out of stock</span>}
        </div>

        {/* Delivery / pincode serviceability */}
        <div className="pdp-pin">
          <span className="pdp-pin-label">Delivery Details</span>
          <div className="pdp-pin-row">
            <input
              className="pdp-pin-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              aria-label="Pincode"
            />
            <button type="button" className="pdp-pin-btn" onClick={handlePincodeCheck} disabled={checkingPin}>
              {checkingPin ? '…' : 'CHECK'}
            </button>
          </div>
          {serviceability && (
            <div className={`pdp-pin-result${serviceability.error ? '' : serviceability.serviceable ? ' ok' : ' fail'}`}>
              {serviceability.error ? (
                <span>{serviceability.error}</span>
              ) : (
                <><Icon name="Check" size={14} /> Delivery to <strong>{pincode}</strong> in ~{serviceability.estimated_delivery_days || 5} days{serviceability.cod_available && <span className="pdp-cod">COD available</span>}</>
              )}
            </div>
          )}
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
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Secure Checkout</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Cash on Delivery</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> 14-Day Returns</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><polyline points="9 12 11 14 15 10"/></svg> 100% Genuine</div>
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
