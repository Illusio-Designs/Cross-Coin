'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';
import { fbTrack } from '@/utils/pixel';
import { checkServiceability } from '@/lib/api/serviceability';

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
  const eta = (() => {
    const days = (serviceability?.serviceable && serviceability?.estimated_delivery_days) || 5;
    const d = new Date();
    d.setDate(d.getDate() + days);
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return { day, suffix, month: d.toLocaleString('en-IN', { month: 'long' }) };
  })();

  const stripRef = useRef(null);
  const mainRef = useRef(null);
  const [railH, setRailH] = useState(0);

  // Match the left thumbnail rail's height to the main image so it never runs
  // taller than the photo — extra thumbnails scroll inside it instead.
  useEffect(() => {
    const el = mainRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setRailH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Meta funnel: ViewContent (browser pixel + server CAPI, deduped by eventID).
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

  // Keep the active thumbnail in view by scrolling ONLY the rail (vertical on
  // desktop, horizontal when it wraps to a row on mobile) — never the page.
  useEffect(() => {
    const rail = stripRef.current;
    if (!rail) return;
    const el = rail.querySelector(`[data-thumb="${active}"]`);
    if (!el) return;
    const railRect = rail.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (rail.scrollHeight > rail.clientHeight + 1) {
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

  return (
    <>
      <div className="pdx">
        {/* Gallery — fixed vertical thumbnail rail on the LEFT of the image */}
        <div className="pdx-gallery" style={railH ? { '--pdx-rail-h': `${railH}px` } : undefined}>
          {shown.length > 1 && (
            <div className="pdx-rail" ref={stripRef} data-lenis-prevent>
              {shown.map((src, i) => (
                <button key={src + i} type="button" data-thumb={i}
                  className={`pdx-thumb${i === active ? ' active' : ''}`}
                  onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}>
                  <img src={src} alt={`${product.name} view ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}

          <div className="pdx-main" ref={mainRef}>
            {mainSrc
              ? <img src={mainSrc} alt={product.name} />
              : <span aria-hidden style={{ color: 'var(--accent-600)', opacity: .5 }}><Icon name="Footprints" size={80} /></span>}
            {product.badge === 'new' && <span className="pdx-badge">New</span>}
            {off > 0 && <span className="pdx-badge pdx-badge-off">{off}% off</span>}
          </div>
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

          {/* Free shipping + delivery ETA */}
          <div className="pdx-ship">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <span><strong>Free shipping</strong> over ₹999</span>
            <span className="pdx-ship-eta">· Delivered by {eta.day}{eta.suffix} {eta.month}</span>
          </div>

          {/* Honest low-stock — only when the selected variant is genuinely low */}
          {inStock && stock != null && stock <= 5 && (
            <div className="pdx-low"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Only <strong>{stock}</strong> left</div>
          )}

          {product.description && <p className="pdx-lead">{product.description}</p>}

          <div className="pdx-rule" />

          {/* Delivery / pincode serviceability */}
          <div className="pdx-pin">
            <span className="pdx-pin-label">Delivery Details</span>
            <div className="pdx-pin-row">
              <input
                className="pdx-pin-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                aria-label="Pincode"
              />
              <button type="button" className="pdx-pin-btn" onClick={handlePincodeCheck} disabled={checkingPin}>
                {checkingPin ? '…' : 'CHECK'}
              </button>
            </div>
            {serviceability && (
              <div className={`pdx-pin-result${serviceability.error ? '' : serviceability.serviceable ? ' ok' : ' fail'}`}>
                {serviceability.error ? (
                  <span>{serviceability.error}</span>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Delivery to <strong>{pincode}</strong> in ~{serviceability.estimated_delivery_days || 5} days{serviceability.cod_available && <span className="pdx-cod">COD available</span>}</>
                )}
              </div>
            )}
          </div>

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

          {specs.length > 0 && (
            <div className="pdx-panel-specs">
              <span className="pdx-panel-label">Specifications</span>
              <dl>
                {specs.map(([k, v]) => (
                  <div className="pdx-spec-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </div>
          )}

          <div className="pdx-trust">
            <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Secure Checkout</div>
            <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Cash on Delivery</div>
            <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> 14-Day Returns</div>
            <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><polyline points="9 12 11 14 15 10"/></svg> 100% Genuine</div>
          </div>
        </div>
      </div>

      {/* Highlights — the benefit-led "read more" strip, full width */}
      {product.features?.length > 0 && (
        <section className="pdx-details">
          <span className="eyebrow">Highlights</span>
          <ul className="pdx-features">
            {product.features.map((f) => (
              <li key={f.text}><span className="pdx-feature-ic"><Icon name={f.icon} size={18} /></span>{f.text}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
