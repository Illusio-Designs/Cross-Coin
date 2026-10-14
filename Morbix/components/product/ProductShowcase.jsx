'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';
import { fbTrack } from '@/utils/pixel';
import { checkServiceability } from '@/lib/api/serviceability';
import { SIZE_GUIDE } from '@/lib/sizeGuide';
import SizeChartModal from '@/components/product/SizeChartModal';

// Right-size ImageKit images per slot (thumbnail vs main vs zoom) with f-auto
// so mobile never downloads a full-res original — same as the CrossCoin gallery.
function ik(src, w) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
}

// Gallery + buy panel share one colour + size selection, so the whole panel —
// images, price, SKU, stock — reflects the exact variation the customer picked,
// and Add to cart sends that precise variation to the backend.
// Prepaid incentive is NOT a hard-coded instant discount — it is a real,
// admin-created coupon (paymentModeRestriction === 'prepaid') passed in from the
// page, surfaced above Buy now so the shopper knows the code to apply at checkout.
export default function ProductShowcase({ product, initialColor, bundleTiers = [], prepaidCoupon = null }) {
  const { add, addPack, open: cartOpen } = useCart();
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
  const [lightbox, setLightbox] = useState(false); // full-screen zoom overlay
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false); // sticky buy bar visibility
  const [showChart, setShowChart] = useState(false);   // size chart modal visibility
  const actionsRef = useRef(null);                      // the main buy buttons
  const hasSizeGuide = SIZE_GUIDE.rows.length > 0;

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
  // Discount %, same calc the product card uses for its "-off%" badge.
  const off = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  // Pack / bundle pricing — per-product, admin-set EXACT prices. When a product
  // has packs, the selector replaces the qty stepper: 1 pair = the product's own
  // price, then each configured pack (2 pairs ₹X, 3 pairs ₹Y). The backend
  // re-prices the chosen pack server-side at checkout from the same figure.
  const rawPacks = Array.isArray(bundleTiers) ? bundleTiers : [];
  const hasPacks = rawPacks.length > 0;
  const packOptions = hasPacks
    ? [{ pairs: 1, price: Number(price), label: '1 Pair', badge: null, base: true },
       ...rawPacks.map((t) => ({ pairs: t.pairs, price: Number(t.price), label: t.label || `${t.pairs} Pairs`, badge: t.badge }))]
    : [];
  // Default to the 1-pair option (index 0) so the page opens showing the
  // product's actual single price, not a pre-selected multi-pack.
  const [pack, setPack] = useState(0);
  // Per-pair colour selection for a multi-pair pack (indexes into product.colors).
  const [packColors, setPackColors] = useState([]);
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

  // Auto-advance the main image through the thumbnails, one by one, every 3s —
  // paused while the zoom lightbox is open.
  useEffect(() => {
    if (shown.length <= 1 || lightbox) return;
    const t = setInterval(() => setActive((a) => (a + 1) % shown.length), 3000);
    return () => clearInterval(t);
  }, [shown.length, color, lightbox]);

  // Close the zoom lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

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

  // Send the selected variation to the cart. Use the SELECTED variation's main
  // image (its first photo — stable, not the auto-rotating one), and pass the
  // colour so the cart line shows it. Shared by Add to cart and Buy now.
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

  // Morbix's cart drawer is the checkout (add() opens it), so Buy now adds the
  // selection and lets the drawer open straight away — no "added" toast between.
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
              if (e.key === 'ArrowRight') { e.currentTarget.scrollBy({ left: 120, behavior: 'smooth' }); e.preventDefault(); }
              if (e.key === 'ArrowLeft') { e.currentTarget.scrollBy({ left: -120, behavior: 'smooth' }); e.preventDefault(); }
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
                <img src={ik(src, 160)} alt={`${product.name} view ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="pdp-main" ref={mainRef}>
          {mainSrc ? (
            <button type="button" className="pdp-main-zoom" onClick={() => setLightbox(true)} aria-label="Zoom image">
              <img src={ik(mainSrc, 900)} alt={product.name} loading="eager" fetchPriority="high" decoding="async" />
              {sku && <span className="pdp-style-badge">Style: #{sku}</span>}
              <span className="pdp-zoom-hint" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </span>
            </button>
          ) : (
            <span aria-hidden style={{ color: '#c3ccd2' }}><Icon name="Footprints" size={72} /></span>
          )}
          {product.badge === 'new' && <span className="pcard-badge new" style={{ top: 16, left: 16 }}>New</span>}
        </div>
      </div>

      {/* Full-screen zoom lightbox (same as the CrossCoin gallery) */}
      {lightbox && mainSrc && (
        <div className="pdp-lightbox" role="dialog" aria-modal="true" aria-label="Product image"
          onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false); }}>
          <button type="button" className="pdp-lb-close" onClick={() => setLightbox(false)} aria-label="Close">×</button>
          {shown.length > 1 && (
            <button type="button" className="pdp-lb-nav prev" aria-label="Previous"
              onClick={() => setActive((a) => (a - 1 + shown.length) % shown.length)}>‹</button>
          )}
          <img className="pdp-lb-img" src={ik(shown[Math.min(active, shown.length - 1)] || mainSrc, 1200)} alt={product.name} />
          {shown.length > 1 && (
            <button type="button" className="pdp-lb-nav next" aria-label="Next"
              onClick={() => setActive((a) => (a + 1) % shown.length)}>›</button>
          )}
        </div>
      )}

      <div className="pdp-info">
        <h1>{product.name}</h1>
        <div className="pdp-meta">
          <span className="rating"><Icon name="Star" size={14} color="var(--star)" /> {product.rating}</span>
          <a href="#reviews" className="muted">{product.reviews} reviews</a>
          {sku && <span className="muted">SKU: {sku}</span>}
        </div>
        <div className="pdp-price">
          ₹{Number(hasPacks ? packTotal : price).toFixed(0)}
          {hasPacks
            ? (packHasDiscount ? <span className="old">₹{Number(packMrp).toFixed(0)}</span> : null)
            : (oldPrice ? <span className="old">₹{Number(oldPrice).toFixed(0)}</span> : null)}
          {hasPacks
            ? (packHasDiscount && <span className="pdp-price-off">−{packOff}% OFF</span>)
            : (off > 0 && <span className="pdp-price-off">−{off}% OFF</span>)}
        </div>
        <p className="pdp-price-tax">MRP incl. of all taxes</p>

        {/* Stock badge, then truck joined with the free-shipping line */}
        <div className="pdp-ship">
          {inStock
            ? <span className="pdp-stock-badge"><Icon name="ShieldCheck" size={12} /> {stock != null && stock <= 5 ? `Only ${stock} left` : 'In stock'}</span>
            : <span className="pdp-stock-badge out"><Icon name="X" size={12} /> Out of stock</span>}
          <span className="pdp-ship-free"><Icon name="Truck" size={16} /> <strong>Free shipping</strong> on all orders</span>
        </div>

        <div className="buy">
          <div className="pdp-opts-row">
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
                {hasSizeGuide && (
                  <p className="sc-sizeguide">Not sure about your size?{' '}
                    <button type="button" onClick={() => setShowChart(true)}>Size chart</button>
                  </p>
                )}
              </div>
            )}
          </div>

          {hasPacks && (
            <div className="opt pdp-packs">
              <span className="opt-label">Choose your pack</span>
              <div className="pack-list">
                {packOptions.map((t, i) => {
                  const per = t.pairs > 0 ? t.price / t.pairs : t.price;
                  const mrp = Number(price) * t.pairs;
                  const disc = !t.base && t.price < mrp;
                  return (
                    <button type="button" key={i}
                      className={`pack-card${i === pack ? ' active' : ''}`}
                      onClick={() => setPack(i)} aria-pressed={i === pack}>
                      <span className="pack-radio" aria-hidden="true" />
                      <span className="pack-body">
                        <span className="pack-name">{t.label}
                          {t.badge ? <span className="pack-badge">{t.badge}</span> : null}</span>
                        <span className="pack-per">₹{per.toFixed(2)} / pair</span>
                      </span>
                      <span className="pack-price">
                        <span className="pack-now">₹{t.price.toFixed(0)}</span>
                        {disc ? <span className="pack-mrp">₹{mrp.toFixed(0)}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasPacks && packPairs > 1 && product.colors?.length > 0 && (
            <div className="opt pdp-packcolors">
              <span className="opt-label">Choose a colour for each pair</span>
              <div className="packcolor-list">
                {Array.from({ length: packPairs }).map((_, idx) => {
                  const sel = packColors[idx] ?? color;
                  return (
                    <div className="packcolor-row" key={idx}>
                      <span className="packcolor-tag">Pair {idx + 1}{colorNames[sel] ? <em>{colorNames[sel]}</em> : null}</span>
                      <div className="swatches">
                        {product.colors.map((c, ci) => (
                          <button key={ci} type="button" className={`swatch${ci === sel ? ' active' : ''}`}
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

          <div className="buy-row" ref={actionsRef}>
            {!hasPacks && (
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
              </div>
            )}
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onAdd} disabled={!inStock}>
              {!inStock ? 'Out of stock'
                : added ? <>Added to cart <Icon name="ShieldCheck" size={16} /></>
                : <>Add to cart <Icon name="ShoppingBag" size={16} /></>}
            </button>
          </div>
          {inStock && (
            <div className="pdp-buy-wrap">
              {prepaidCoupon?.code && (
                <div className="pdp-prepaid-ribbon" aria-label={`Use code ${prepaidCoupon.code} for extra off on prepaid orders`}>
                  <span className="pdp-perf" aria-hidden="true"><i /><i /><i /></span>
                  <strong>{prepaidCoupon.code}</strong>
                  <span className="pdp-perf" aria-hidden="true"><i /><i /><i /></span>
                </div>
              )}
              <button type="button" className="btn pdp-buy-now" onClick={onBuyNow}>
                <Icon name="ShoppingBag" size={16} /> BUY NOW – Cash On Delivery
              </button>
            </div>
          )}
        </div>

        <div className="pdp-trust">
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Secure Checkout</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg> Cash on Delivery</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> 7-Day Returns</div>
          <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><polyline points="9 12 11 14 15 10"/></svg> 100% Genuine</div>
        </div>

        {/* Delivery / pincode serviceability (after the trust badges) */}
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
      </div>
    </div>

    {showChart && <SizeChartModal onClose={() => setShowChart(false)} />}

    {/* ── About + Specifications (specs track the selected variation) ── */}
    <section className="pdp-details">
      <div className="pdp-about">
        <span className="eyebrow">Details</span>
        <h2>About this product</h2>
        {product.description
          ? <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
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

    {/* Sticky buy bar — appears on mobile once the main buy buttons scroll out of view */}
    <div className={`pdp-sticky${showSticky && !lightbox && !cartOpen ? ' show' : ''}`} aria-hidden={!(showSticky && !lightbox && !cartOpen)}>
      <div className="pdp-sticky-info">
        {mainSrc && <img src={ik(mainSrc, 120)} alt="" loading="lazy" />}
        <div>
          <b>{product.name}</b>
          <span>₹{Number(price).toFixed(0)}{selectedColorName ? ` · ${selectedColorName}` : ''}{effectiveSize ? ` · ${effectiveSize}` : ''}</span>
        </div>
      </div>
      <div className="pdp-sticky-btns">
        <button type="button" className="pdp-sticky-buy" onClick={onBuyNow} disabled={!inStock} tabIndex={showSticky ? 0 : -1}>
          {inStock ? 'Buy Now' : 'Out of stock'}
        </button>
      </div>
    </div>
    </>
  );
}
