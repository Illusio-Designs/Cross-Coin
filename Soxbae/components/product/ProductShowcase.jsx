'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';
import { fbTrack } from '@/utils/pixel';
import { checkServiceability } from '@/lib/api/serviceability';
import { SIZE_GUIDE } from '@/lib/sizeGuide';
import SizeChartModal from '@/components/product/SizeChartModal';

// Right-size ImageKit images per slot with f-auto (same as the CrossCoin gallery).
function ik(src, w) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
}

// Soxbae PDP — an editorial layout: a large image with a horizontal thumbnail
// strip beneath it (left), a calm serif buy panel (right, sticky), then a
// full-width "details" band pairing the story with a specifications card.
// Gallery + colour + size share one selection so price, SKU and stock always
// reflect the exact variation, and Add to cart sends that variation.
export default function ProductShowcase({ product, initialColor, bundleTiers = [] }) {
  const { add, addPack, open: cartOpen } = useCart();
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
  const [lightbox, setLightbox] = useState(false);
  const [qty, setQty] = useState(1);
  const [pack, setPack] = useState(0); // selected pack option (0 = 1 pair)
  const [packColors, setPackColors] = useState([]); // per-pair colour indexes for a multi-pair pack
  const [added, setAdded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const actionsRef = useRef(null);

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

  // Pack / bundle pricing — per-product, admin-set exact prices. When a product
  // has packs, the selector replaces the qty stepper. The backend re-prices the
  // chosen pack server-side at checkout from the same figure.
  const rawPacks = Array.isArray(bundleTiers) ? bundleTiers : [];
  const hasPacks = rawPacks.length > 0;
  const packOptions = hasPacks
    ? [{ pairs: 1, price: Number(price), label: '1 Pair', badge: null, base: true },
       ...rawPacks.map((t) => ({ pairs: t.pairs, price: Number(t.price), label: t.label || `${t.pairs} Pairs`, badge: t.badge }))]
    : [];
  const activePack = hasPacks ? packOptions[Math.min(pack, packOptions.length - 1)] : null;
  const packPairs = activePack ? activePack.pairs : 1;
  const packTotal = activePack ? activePack.price : Number(price);
  const packUnit = packPairs > 0 ? packTotal / packPairs : Number(price);
  const packMrp = Number(price) * packPairs;
  const packHasDiscount = !!activePack && !activePack.base && packTotal < packMrp;
  const packOff = packHasDiscount ? Math.round((1 - packTotal / packMrp) * 100) : 0;

  // Keep the per-pair colour list sized to the chosen pack; new slots default to
  // the currently-selected colour, existing picks are preserved.
  useEffect(() => {
    if (!hasPacks || packPairs <= 1) return;
    setPackColors((prev) => {
      const next = prev.slice(0, packPairs);
      while (next.length < packPairs) next.push(color);
      return next;
    });
  }, [packPairs, hasPacks, color]);

  // Resolve a colour index → its variation (matching the current size), image and name.
  const resolvePairVariant = (colorIdx) => {
    const name = colorNames[colorIdx] || null;
    const v = variants.find((vv) => vv.color === name && vv.size === effectiveSize)
      || variants.find((vv) => vv.color === name) || null;
    const imgs = product.colorImages?.[colorIdx];
    const image = (Array.isArray(imgs) && imgs[0]) || product.image || null;
    return { variationId: v?.id ?? null, color: name, image };
  };
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

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

  // Auto-advance the main image through the strip every 3.5s — paused while the
  // zoom lightbox is open.
  useEffect(() => {
    if (shown.length <= 1 || lightbox) return;
    const t = setInterval(() => setActive((a) => (a + 1) % shown.length), 3500);
    return () => clearInterval(t);
  }, [shown.length, color, lightbox]);

  // Close the zoom lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

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

  const addToCart = () => {
    const variationMainImage = shown[0] || product.image || null;
    // Multi-pair pack with per-pair colours → one line per colour, pack-priced.
    if (hasPacks && packPairs > 1 && product.colors?.length > 0) {
      const chosen = (packColors.length ? packColors : Array.from({ length: packPairs }, () => color)).slice(0, packPairs);
      const perPair = chosen.map((ci) => resolvePairVariant(ci));
      addPack(
        { ...product, oldPrice: packHasDiscount ? Number(price) : (oldPrice || null) },
        effectiveSize || 'M', perPair, packUnit, packPairs,
      );
      return;
    }
    const useQty = hasPacks ? packPairs : qty;
    const useUnit = hasPacks ? packUnit : price;
    const useOld = hasPacks ? (packHasDiscount ? Number(price) : (oldPrice || null)) : (oldPrice || null);
    add(
      { ...product, price: useUnit, oldPrice: useOld, image: variationMainImage, color: selectedColorName || null, sku },
      effectiveSize || 'M',
      useQty,
      activeVariant?.id ?? null
    );
  };

  const onAdd = () => {
    if (!inStock) return;
    addToCart();
    toast.cart(`${product.name} added to cart`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  // Soxbae's cart drawer is the checkout, so Buy now adds the selection and
  // opens it straight away (no "added" toast in between).
  const onBuyNow = () => {
    if (!inStock) return;
    addToCart();
  };

  // Show the sticky buy bar once the main buy buttons have scrolled out of view.
  useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hasSizeGuide = SIZE_GUIDE.rows.length > 0;

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
                  <img src={ik(src, 160)} alt={`${product.name} view ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}

          <div className="pdx-main" ref={mainRef}>
            {mainSrc ? (
              <button type="button" className="pdx-main-zoom" onClick={() => setLightbox(true)} aria-label="Zoom image">
                <img src={ik(mainSrc, 900)} alt={product.name} loading="eager" fetchPriority="high" decoding="async" />
                {sku && <span className="pdx-style-badge">Style: #{sku}</span>}
                <span className="pdx-zoom-hint" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </span>
              </button>
            ) : (
              <span aria-hidden style={{ color: 'var(--accent-600)', opacity: .5 }}><Icon name="Footprints" size={80} /></span>
            )}
            {product.badge === 'new' && <span className="pdx-badge">New</span>}
            {off > 0 && <span className="pdx-badge pdx-badge-off">{off}% off</span>}
          </div>
        </div>

        {lightbox && mainSrc && (
          <div className="pdx-lightbox" role="dialog" aria-modal="true" aria-label="Product image"
            onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false); }}>
            <button type="button" className="pdx-lb-close" onClick={() => setLightbox(false)} aria-label="Close">×</button>
            {shown.length > 1 && (
              <button type="button" className="pdx-lb-nav prev" aria-label="Previous"
                onClick={() => setActive((a) => (a - 1 + shown.length) % shown.length)}>‹</button>
            )}
            <img className="pdx-lb-img" src={ik(shown[Math.min(active, shown.length - 1)] || mainSrc, 1200)} alt={product.name} />
            {shown.length > 1 && (
              <button type="button" className="pdx-lb-nav next" aria-label="Next"
                onClick={() => setActive((a) => (a + 1) % shown.length)}>›</button>
            )}
          </div>
        )}

        {/* Buy panel */}
        <div className="pdx-buy">
          <h1 className="pdx-title">{product.name}</h1>

          <div className="pdx-rating">
            <span className="pdx-stars" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="Star" size={15} color={i < Math.round(product.rating || 0) ? 'var(--star)' : 'var(--line)'} />
              ))}
            </span>
            <span>{Number(product.rating || 0).toFixed(1)}</span>
            <a href="#reviews" className="pdx-rating-link">{product.reviews} reviews</a>
          </div>

          <div className="pdx-price">
            <span className="pdx-price-now">₹{Number(hasPacks ? packTotal : price).toFixed(0)}</span>
            {hasPacks
              ? (packHasDiscount ? <span className="pdx-price-old">₹{Number(packMrp).toFixed(0)}</span> : null)
              : (oldPrice ? <span className="pdx-price-old">₹{Number(oldPrice).toFixed(0)}</span> : null)}
            {hasPacks
              ? (packHasDiscount && <span className="pdx-price-off">−{packOff}% OFF</span>)
              : (off > 0 && <span className="pdx-price-off">−{off}% OFF</span>)}
          </div>
          <p className="pdx-price-tax">MRP incl. of all taxes</p>

          {/* Free shipping + delivery ETA */}
          <div className="pdx-ship">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <span><strong>Free shipping</strong> on all orders</span>
            <span className="pdx-ship-eta">· Delivered by {eta.day}{eta.suffix} {eta.month}</span>
          </div>

          {/* Honest low-stock — only when the selected variant is genuinely low */}
          {inStock && stock != null && stock <= 5 && (
            <div className="pdx-low"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Only <strong>{stock}</strong> left</div>
          )}



          {(product.colors?.length > 0 || sizesForColor.length > 0) && (
            <div className="pdx-opts-row">
              {product.colors?.length > 0 && (
                <div className="pdx-opt">
                  <span className="pdx-opt-label">Colour{selectedColorName ? <em> — {selectedColorName}</em> : null}</span>
                  <div className="pdx-colors" role="radiogroup" aria-label="Colour">
                    {product.colors.map((c, i) => (
                      <button key={i} type="button" role="radio" aria-checked={i === color}
                        className={`pdx-color${i === color ? ' active' : ''}`}
                        onClick={() => pickColor(i)} aria-label={colorNames[i] || `Colour ${i + 1}`}
                        title={colorNames[i] || `Colour ${i + 1}`}>
                        <span className="pdx-color-dot" style={{ background: c }} />
                      </button>
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
                  {hasSizeGuide && (
                    <p className="pdx-sizeguide">Not sure about your size?{' '}
                      <button type="button" onClick={() => setShowChart(true)}>Size chart</button>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {hasPacks && (
            <div className="pdx-opt pdx-packs">
              <span className="pdx-opt-label">Choose your pack</span>
              <div className="pdx-pack-list">
                {packOptions.map((t, i) => {
                  const per = t.pairs > 0 ? t.price / t.pairs : t.price;
                  const mrp = Number(price) * t.pairs;
                  const disc = !t.base && t.price < mrp;
                  return (
                    <button type="button" key={i} className={`pdx-pack${i === pack ? ' active' : ''}`} onClick={() => setPack(i)} aria-pressed={i === pack}>
                      <span className="pdx-pack-radio" aria-hidden="true" />
                      <span className="pdx-pack-body">
                        <span className="pdx-pack-name">{t.label}{t.badge ? <span className="pdx-pack-badge">{t.badge}</span> : null}</span>
                        <span className="pdx-pack-per">₹{per.toFixed(2)} / pair</span>
                      </span>
                      <span className="pdx-pack-price">
                        <span className="pdx-pack-now">₹{t.price.toFixed(0)}</span>
                        {disc ? <span className="pdx-pack-mrp">₹{mrp.toFixed(0)}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasPacks && packPairs > 1 && product.colors?.length > 0 && (
            <div className="pdx-opt pdx-packcolors">
              <span className="pdx-opt-label">Choose a colour for each pair</span>
              <div className="pdx-packcolor-list">
                {Array.from({ length: packPairs }).map((_, idx) => {
                  const sel = packColors[idx] ?? color;
                  return (
                    <div className="pdx-packcolor-row" key={idx}>
                      <span className="pdx-packcolor-tag">Pair {idx + 1}{colorNames[sel] ? <em>{colorNames[sel]}</em> : null}</span>
                      <div className="pdx-packcolor-swatches">
                        {product.colors.map((c, ci) => (
                          <button key={ci} type="button" className={`pdx-packcolor-dot${ci === sel ? ' active' : ''}`}
                            style={{ background: c }} title={colorNames[ci] || ''} aria-label={colorNames[ci] || `Colour ${ci + 1}`}
                            onClick={() => setPackColors((prev) => {
                              const n = prev.slice(0, packPairs);
                              while (n.length < packPairs) n.push(color);
                              n[idx] = ci;
                              return n;
                            })} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pdx-actions" ref={actionsRef}>
            {!hasPacks && (
              <div className="pdx-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
              </div>
            )}
            <button type="button" className="pdx-add" onClick={onAdd} disabled={!inStock}>
              {!inStock ? 'Out of stock'
                : added ? <>Added to cart <Icon name="ShieldCheck" size={17} /></>
                : <>Add to cart · ₹{Number(hasPacks ? packTotal : price * qty).toFixed(0)} <Icon name="ShoppingBag" size={17} /></>}
            </button>
          </div>

          {inStock && (
            <div className="pdx-buy-wrap">
              <button type="button" className="pdx-buy-now" onClick={onBuyNow}>
                <Icon name="ShoppingBag" size={17} /> BUY NOW · Cash On Delivery
              </button>
            </div>
          )}

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
            <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> 7-Day Returns</div>
            <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><polyline points="9 12 11 14 15 10"/></svg> 100% Genuine</div>
          </div>

          {/* Delivery / pincode serviceability — below the trust row */}
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
        </div>
      </div>

      {showChart && <SizeChartModal onClose={() => setShowChart(false)} />}

      {/* Sticky buy bar — appears when the main buy buttons scroll out of view */}
      <div className={`pdx-sticky${showSticky && !lightbox && !cartOpen ? ' show' : ''}`} aria-hidden={!(showSticky && !lightbox && !cartOpen)}>
        <div className="pdx-sticky-info">
          {mainSrc && <img src={ik(mainSrc, 120)} alt="" loading="lazy" />}
          <div>
            <b>{product.name}</b>
            <span>₹{Number(price).toFixed(0)}{selectedColorName ? ` · ${selectedColorName}` : ''}{effectiveSize ? ` · ${effectiveSize}` : ''}</span>
          </div>
        </div>
        <div className="pdx-sticky-btns">
          <button type="button" className="pdx-sticky-buy" onClick={onBuyNow} disabled={!inStock} tabIndex={showSticky ? 0 : -1}>
            {inStock ? 'Buy Now' : 'Out of stock'}
          </button>
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
