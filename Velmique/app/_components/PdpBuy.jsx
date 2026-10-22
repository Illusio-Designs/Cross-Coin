'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getPublicCoupons } from '@/lib/api/orders';
import { shiprocketEnabled, openShiprocketCheckout } from '@/lib/api/shiprocketCheckout';
import ShiprocketButton from '@/components/checkout/ShiprocketButton';
import { fbTrack } from '@/utils/pixel';
import { ik } from '@/lib/imagekit';
import SkImg from './SkImg';

const PREPAID_INSTANT_DISCOUNT_INR = Math.max(0, parseFloat(process.env.NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR || '0') || 0);
const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const check = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

export default function PdpBuy({ product, packs = [], mixTiers = [], scents = [] }) {
  const { addToCart, openCheckout } = useStore();

  // Build selectable options from real variations. Each variation has a size +
  // price + image; fall back to a single synthetic option for simple products.
  const options = useMemo(() => {
    const vs = (product.variations || []).filter(Boolean);
    if (!vs.length) {
      return [{ id: product.defaultVariationId || product.id, label: product.sizes?.[0] || 'One Size', price: product.price, image: product.images?.[0] || '', inStock: product.inStock !== false, stock: null }];
    }
    return vs.map((v) => ({
      id: v.id,
      label: v.size || v.sku || 'Default',
      price: v.price,
      image: v.images?.[0]?.url || product.images?.[0] || '',
      inStock: v.inStock !== false,
      stock: Number.isFinite(v.stock) ? v.stock : null,
    }));
  }, [product]);

  // Start on the default (first in-stock) variation, not blindly the first.
  const [selVar, setSelVar] = useState(() => Math.max(0, options.findIndex((o) => String(o.id) === String(product.defaultVariationId))));
  const [qty, setQty] = useState(1);
  const [packIdx, setPackIdx] = useState(0);
  const opt = options[selVar] || options[0];

  // "Select Pack" choices for products with their own admin packs (exact
  // totals; checkout re-prices a qty-N line via bundlePerUnit server-side).
  const packChoices = useMemo(() => {
    if (!packs.length) return [];
    const base = Number(opt.price) || 0;
    return [
      { pairs: 1, total: base, label: 'Pack of 1', badge: '' },
      ...packs.map((t) => ({ pairs: t.pairs, total: t.price, label: t.label, badge: t.badge })),
    ];
  }, [packs, opt.price]);
  const pack = packChoices.length ? (packChoices[packIdx] || packChoices[0]) : null;

  // "Build Your Pack" (store-wide mix tiers): checkbox scent cards — the
  // checked count drives the tier % the server applies to the shared group.
  const isMix = !packs.length && mixTiers.length > 0;
  const scentOpts = useMemo(() => {
    if (!isMix) return [];
    return [
      { pid: product.id, vid: opt.id, name: product.name, price: Number(opt.price) || 0, image: opt.image, size: opt.label, slug: product.slug },
      ...scents.filter((s) => String(s.id) !== String(product.id) && s.inStock !== false).slice(0, 8).map((s) => ({
        pid: s.id, vid: s.defaultVariationId || null, name: s.name, price: Number(s.price) || 0, image: s.images?.[0] || '', size: s.sizes?.[0] || '', slug: s.slug,
      })),
    ];
  }, [isMix, product.id, product.name, opt, scents]);
  const [picked, setPicked] = useState(() => new Set([0]));
  const togglePick = (i) => setPicked((prev) => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const mixCount = isMix ? picked.size : 0;
  const mixOff = isMix ? mixTiers.reduce((a, t) => (mixCount >= t.pairs ? Math.max(a, t.off) : a), 0) : 0;
  const mixSub = isMix ? [...picked].reduce((a, i) => a + (scentOpts[i]?.price || 0), 0) : 0;
  const mixTotal = mixSub * (1 - mixOff / 100);
  const nextT = isMix ? mixTiers.find((t) => mixCount < t.pairs) : null;
  const mixHint = mixCount === 0
    ? `Tick ${mixTiers[0]?.pairs || 2} scents to unlock ${mixTiers[0]?.off || 0}% off`
    : nextT ? `Tick ${nextT.pairs - mixCount} more to unlock ${nextT.off}% off`
      : 'Maximum saving unlocked on your pack';
  const nodes = isMix ? [{ pairs: 1, off: 0 }, ...mixTiers] : [];
  const reachedIdx = nodes.reduce((a, t, i) => (mixCount >= t.pairs ? i : a), -1);
  const fill = nodes.length > 1 ? (Math.max(0, reachedIdx) / (nodes.length - 1)) * 100 : 0;

  const unitPrice = pack ? pack.total / pack.pairs : Number(opt.price) || 0;
  const lineQty = pack ? pack.pairs : qty;
  const lineTotal = pack && pack.pairs > 1 ? pack.total : unitPrice * lineQty;

  // An admin pack (2+ bottles at the pack price) is its own bag line, marked
  // packPrice: Shiprocket would charge each bottle at the catalogue price, so a
  // bag holding one stays on our own checkout.
  const isPackLine = !!(pack && pack.pairs > 1);
  const line = () => ({
    id: isPackLine ? `${product.id}:${opt.id}:pk${pack.pairs}` : `${product.id}:${opt.id}`,
    ...(isPackLine ? { packPrice: true } : {}),
    productId: product.id,
    variationId: opt.id,
    name: product.name,
    price: Math.round(unitPrice * 100) / 100,
    size: opt.label,
    image: opt.image,
    slug: product.slug,
    quantity: lineQty,
  });

  // Mix picks submit FULL unit prices with a shared pack_group — the server
  // applies the tier % to the group, so pre-discounted prices would double-dip.
  const addMix = () => {
    [...picked].forEach((i) => {
      const o = scentOpts[i];
      if (!o) return;
      addToCart({
        id: mixCount > 1 ? `${o.pid}:${o.vid || 'v'}:pack` : `${o.pid}:${o.vid || 'v'}`,
        productId: o.pid,
        variationId: o.vid,
        name: o.name,
        price: Math.round(o.price * 100) / 100,
        size: o.size || '',
        image: o.image,
        slug: o.slug,
        quantity: 1,
        ...(mixCount > 1 ? { packGroup: 'byp' } : {}),
      });
    });
  };
  // The selected size must be in stock (a mix pack only needs one ticked scent).
  const soldOut = !opt.inStock;
  const add = () => {
    if (soldOut) return false;
    if (isMix) { if (!mixCount) return false; addMix(); } else addToCart(line());
    return true;
  };

  // Prepaid offer ribbon over Buy now — the brand's real prepaid-only coupon,
  // else the configured instant prepaid discount; nothing when neither exists.
  const [prepaidOffer, setPrepaidOffer] = useState(PREPAID_INSTANT_DISCOUNT_INR > 0 ? `₹${PREPAID_INSTANT_DISCOUNT_INR} off on prepaid` : '');
  useEffect(() => {
    let alive = true;
    getPublicCoupons().then((list) => {
      const c = (list || []).find((x) => x?.code && x.paymentModeRestriction === 'prepaid');
      if (alive && c) setPrepaidOffer(`Prepaid: use ${c.code}`);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Sticky buy-now bar: appears once the main buy area scrolls out of view.
  const buyRef = useRef(null);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setBarOn(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Buy now: add, then open the bag straight on delivery & payment.
  const buy = () => { if (add()) openCheckout(); };

  // Shiprocket Checkout (when it is set up for the store): Buy now opens it
  // straight away with just this selection, leaving the bag alone. Packs
  // (an admin pack, or 2+ ticked scents) keep using our own checkout, because
  // Shiprocket prices each bottle from the catalog and wouldn't apply the
  // pack price.
  const [srOn, setSrOn] = useState(false);
  const [srBusy, setSrBusy] = useState(false);
  useEffect(() => { let live = true; shiprocketEnabled().then((on) => { if (live) setSrOn(on); }); return () => { live = false; }; }, []);
  const useShiprocket = srOn && !(pack && pack.pairs > 1) && !(isMix && mixCount > 1);

  // The selection as checkout lines (a simple product without variations
  // has no variant id, so it can't go to Shiprocket).
  const buyNowLine = () => {
    if (isMix) {
      const o = scentOpts[[...picked][0]];
      return o ? { productId: o.pid, variationId: o.vid ?? null, quantity: 1, price: o.price, name: o.name } : null;
    }
    const vid = (product.variations || []).length ? opt.id : (product.defaultVariationId ?? null);
    return { productId: product.id, variationId: vid, quantity: lineQty, price: unitPrice, name: product.name };
  };

  const onBuyNow = async (e) => {
    if (soldOut || srBusy) return;
    const l = useShiprocket ? buyNowLine() : null;
    if (!l || l.variationId == null) { buy(); return; }
    fbTrack('InitiateCheckout', {
      content_ids: [String(l.productId)], content_type: 'product', content_name: l.name || undefined,
      contents: [{ id: String(l.productId), quantity: l.quantity }],
      num_items: l.quantity, value: l.price * l.quantity, currency: 'INR',
    });
    setSrBusy(true);
    try {
      await openShiprocketCheckout(e, [l], 'buy-now');
    } catch {
      // Shiprocket couldn't start: fall back to our own checkout.
      buy();
    } finally {
      setSrBusy(false);
    }
  };

  return (
    <>
      {options.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h">Select Size</div>
          <div className="m-sizes">
            {options.map((o, i) => (
              <button key={o.id} type="button" aria-pressed={i === selVar} className={`m-size ${i === selVar ? 'on' : ''} ${o.inStock ? '' : 'is-out'}`} onClick={() => setSelVar(i)}>
                <b>{o.label}</b><span>{o.inStock ? inr(o.price) : 'Sold out'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {packChoices.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h">Select Pack</div>
          <div className="m-packsel">
            {packChoices.map((p, i) => {
              const saveAmt = Math.max(0, Math.round((Number(opt.price) || 0) * p.pairs - p.total));
              return (
                <button key={p.pairs} type="button" className={`m-packopt ${i === packIdx ? 'on' : ''}`} onClick={() => setPackIdx(i)}>
                  {p.badge ? <span className="m-packopt__tag">{p.badge}</span> : null}
                  <span className="m-packopt__name">{p.pairs === 1 ? '1 Bottle' : p.label}</span>
                  <span className="m-packopt__sub">{p.pairs} × {opt.label}</span>
                  {opt.image ? (
                    <span className="m-packopt__imgs">
                      {Array.from({ length: Math.min(p.pairs, 3) }).map((_, k) => (
                        <img key={k} src={ik(opt.image, 160)} alt="" loading="lazy" />
                      ))}
                    </span>
                  ) : null}
                  <b className="m-packopt__total">{inr(p.total)}</b>
                  <span className="m-packopt__each">{p.pairs > 1 ? `${inr(p.total / p.pairs)} each` : 'per bottle'}</span>
                  {saveAmt > 0 ? <span className="m-packopt__savepill">You save {inr(saveAmt)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isMix && scentOpts.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h m-byph">Build Your Pack <small>— tick any scents</small><Link href="/pack" className="m-byph__all">View all →</Link></div>
          <div className="m-bypgrid">
            {scentOpts.map((o, i) => {
              const on = picked.has(i);
              return (
                <button key={`${o.pid}`} type="button" role="checkbox" aria-checked={on} className={`m-byp ${on ? 'on' : ''}`} onClick={() => togglePick(i)}>
                  {i === 0 ? <span className="m-byp__this">This page</span> : null}
                  <span className="m-byp__box">{check}</span>
                  <span className="m-byp__img">{o.image ? <SkImg src={ik(o.image, 240)} alt={o.name} loading="lazy" /> : null}</span>
                  <span className="m-byp__n">{o.name}</span>
                  <span className="m-byp__p">{inr(o.price)}</span>
                </button>
              );
            })}
          </div>

          <div className="m-bypbox">
            <div className="m-bypbox__row">
              <div className="m-bypcnt"><span><b>{mixCount}</b><em>in pack</em></span></div>
              <div className="m-bypinfo">
                <div className="m-bypoff">{mixOff > 0 ? <>{mixOff}% OFF <small>applied</small></> : 'Full price'}</div>
                <div className="m-bypnext">{mixHint}</div>
              </div>
            </div>
            <div className="m-ttrack m-ttrack--pdp">
              <div className="m-ttrack__line" style={{ left: `${50 / nodes.length}%`, right: `${50 / nodes.length}%` }}>
                <i style={{ width: `${fill}%` }} />
              </div>
              {nodes.map((t, i) => (
                <div key={t.pairs} className={`m-tnode ${mixCount >= t.pairs ? 'on' : ''}`} style={{ left: `${((i + 0.5) / nodes.length) * 100}%` }}>
                  <b>{t.pairs}</b><span>{t.off ? `${t.off}% off` : 'Start'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="m-bypsum">
            <b>{inr(mixCount ? mixTotal : 0)}</b>
            {mixOff > 0 ? <s>{inr(mixSub)}</s> : null}
            {mixOff > 0 ? <span className="m-bypsave">You save {inr(mixSub - mixTotal)}</span> : null}
          </div>
        </div>
      )}

      <div className="m-buybar" ref={buyRef}>
        {!pack && !isMix && (
          <div className="m-qty">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        )}
        <button type="button" className="m-btn m-btn--fill m-addbtn" onClick={add} disabled={soldOut || (isMix && !mixCount)}>
          {soldOut ? 'Sold out' : isMix
            ? (mixCount ? `Add ${mixCount} to cart · ${inr(mixTotal)}` : 'Tick a scent to start')
            : `Add to cart · ${inr(lineTotal)}`}
        </button>
      </div>
      {opt.inStock && opt.stock != null && opt.stock > 0 && opt.stock <= 5 ? <p className="m-lowstock">Only {opt.stock} left in {opt.label}</p> : null}
      {/* Our prepaid offer doesn't apply inside Shiprocket Checkout. */}
      {prepaidOffer && !useShiprocket ? <div className="m-prepaidchip">{prepaidOffer}</div> : null}
      {useShiprocket ? (
        <div style={{ marginTop: 12 }}>
          <ShiprocketButton label="BUY NOW" onClick={onBuyNow} busy={srBusy} disabled={soldOut || (isMix && !mixCount)} />
        </div>
      ) : (
        <button type="button" className="m-btn m-buynow" onClick={buy} disabled={soldOut || (isMix && !mixCount)}>Buy now</button>
      )}

      {barOn && (
        <div className="m-buynowbar" data-sticky-atc="">
          <div className="m-wrap m-buynowbar__in">
            <span className="m-buynowbar__n"><b>{product.name}</b><small>{opt.label}</small></span>
            <span className="m-buynowbar__p">{inr(isMix ? (mixCount ? mixTotal : Number(opt.price) || 0) : lineTotal)}</span>
            <button type="button" className="m-btn m-btn--fill m-buynowbar__cta" onClick={add} disabled={soldOut || (isMix && !mixCount)}>{soldOut ? 'Sold out' : 'Add to cart'}</button>
          </div>
        </div>
      )}
    </>
  );
}
