'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { getPublicCoupons } from '@/lib/api/orders';
import { shiprocketEnabled, shiprocketTakes, openShiprocketCheckout, SHIPROCKET_RETRY_MESSAGE } from '@/lib/api/shiprocketCheckout';
import ShiprocketButton from '@/components/checkout/ShiprocketButton';
import { showError } from '@/lib/toast';
import { fbTrack } from '@/utils/pixel';
import { ik } from '@/lib/imagekit';
import SkImg from './SkImg';

const PREPAID_INSTANT_DISCOUNT_INR = Math.max(0, parseFloat(process.env.NEXT_PUBLIC_PREPAID_INSTANT_DISCOUNT_INR || '0') || 0);
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function PdpBuy({ product, packs = [], notes, mixPack }) {
  const { addToCart, openCheckout } = useStore();

  const opt = useMemo(() => {
    const variations = (product.variations || []).filter(Boolean);
    const variation = variations.find((v) => String(v.id) === String(product.defaultVariationId)) || variations[0];
    return {
      id: variation?.id ?? (product.defaultVariationId || product.id),
      label: variation?.size || variation?.sku || product.sizes?.[0] || 'One Size',
      price: variation?.price ?? product.price,
      image: variation?.images?.[0]?.url || product.images?.[0] || '',
      inStock: variation ? variation.inStock !== false : product.inStock !== false,
      stock: Number.isFinite(variation?.stock) ? variation.stock : null,
    };
  }, [product]);

  const [qty, setQty] = useState(1);
  const [packIdx, setPackIdx] = useState(0);
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

  const unitPrice = pack ? pack.total / pack.pairs : Number(opt.price) || 0;
  const lineQty = pack ? pack.pairs : qty;
  const lineTotal = pack && pack.pairs > 1 ? pack.total : unitPrice * lineQty;

  // Fixed-price packs are repriced from their saved tier at checkout.
  const isPackLine = !!(pack && pack.pairs > 1);
  const line = () => ({
    id: isPackLine ? `${product.id}:${opt.id}:pk${pack.pairs}` : `${product.id}:${opt.id}`,
    ...(isPackLine ? { packPrice: true } : {}),
    productId: product.id,
    variationId: product.variations?.length ? opt.id : product.defaultVariationId,
    name: product.name,
    price: Math.round(unitPrice * 100) / 100,
    size: opt.label,
    image: opt.image,
    slug: product.slug,
    quantity: lineQty,
  });

  const soldOut = !opt.inStock;
  const add = () => {
    if (soldOut) return false;
    addToCart(line());
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

  // Keep the sticky add button in sync even when a jump skips past the buy area.
  const buyRef = useRef(null);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return undefined;
    let frame;
    const update = () => {
      if (frame != null) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        setBarOn(el.getBoundingClientRect().bottom < 0);
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);
  // Buy now: add, then open the bag straight on delivery & payment.
  const buy = () => { if (add()) openCheckout(); };

  // Direct checkout leaves the bag alone.
  const [srOn, setSrOn] = useState(false);
  const [srBusy, setSrBusy] = useState(false);
  useEffect(() => { let live = true; shiprocketEnabled().then((on) => { if (live) setSrOn(on); }); return () => { live = false; }; }, []);
  const checkoutLine = line();
  const eligible = shiprocketTakes([checkoutLine]);
  const useShiprocket = srOn && eligible;

  const onBuyNow = async (e) => {
    if (soldOut || srBusy) return;
    if (!eligible) { buy(); return; }
    setSrBusy(true);
    try {
      const enabled = await shiprocketEnabled();
      setSrOn(enabled);
      if (enabled === false) { buy(); return; }
      if (enabled === null) throw new Error(SHIPROCKET_RETRY_MESSAGE);
      fbTrack('InitiateCheckout', {
        content_ids: [String(product.id)], content_type: 'product', content_name: product.name || undefined,
        contents: [{ id: String(product.id), quantity: lineQty }],
        num_items: lineQty, value: unitPrice * lineQty, currency: 'INR',
      });
      await openShiprocketCheckout(e, [checkoutLine], 'buy-now');
    } catch (error) {
      showError(error.code === 'CHECKOUT_PACK_DISCOUNT_UNAVAILABLE' ? error.message : SHIPROCKET_RETRY_MESSAGE, 'shiprocket-checkout');
    } finally {
      setSrBusy(false);
    }
  };

  return (
    <>
      {notes}

      {packChoices.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h">Select Pack</div>
          <div className="m-packsel">
            {packChoices.map((p, i) => {
              const saveAmt = Math.max(0, Math.round((Number(opt.price) || 0) * p.pairs - p.total));
              return (
                <button key={p.pairs} type="button" className={`m-packopt ${i === packIdx ? 'on' : ''}`} aria-pressed={i === packIdx} onClick={() => setPackIdx(i)}>
                  {p.badge ? <span className="m-packopt__tag">{p.badge}</span> : null}
                  <span className="m-packopt__name">{p.pairs === 1 ? '1 Bottle' : p.label}</span>
                  <span className="m-packopt__sub">{p.pairs} × {opt.label}</span>
                  {opt.image ? (
                    <span className="m-packopt__imgs">
                      {Array.from({ length: Math.min(p.pairs, 3) }).map((_, k) => (
                        <SkImg key={k} frameClassName="m-pack-tier-photo" src={ik(opt.image, 128)} alt="" loading="lazy" />
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

      <div ref={buyRef}>
        <div className="m-buybar">
          {!pack && (
            <div className="m-qty">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          )}
          <button type="button" className="m-btn m-btn--fill m-addbtn" onClick={add} disabled={soldOut}>
            {soldOut ? 'Sold out' : `Add to cart · ${inr(lineTotal)}`}
          </button>
        </div>
        {opt.inStock && opt.stock != null && opt.stock > 0 && opt.stock <= 5 ? <p className="m-lowstock">Only {opt.stock} left in {opt.label}</p> : null}
        {/* Our prepaid offer doesn't apply inside Shiprocket Checkout. */}
        {prepaidOffer && !useShiprocket ? <div className="m-prepaidchip">{prepaidOffer}</div> : null}
        {useShiprocket ? (
          <div style={{ marginTop: 12 }}>
            <ShiprocketButton label="BUY NOW" onClick={onBuyNow} busy={srBusy} disabled={soldOut} />
          </div>
        ) : (
          <button type="button" className="m-btn m-buynow" onClick={onBuyNow} disabled={soldOut || srBusy}>{srBusy ? 'Opening…' : 'Buy now'}</button>
        )}

        {mixPack}
      </div>

      {barOn && (
        <div className="m-buynowbar" data-sticky-atc="">
          <div className="m-wrap m-buynowbar__in">
            <span className="m-buynowbar__n"><b>{product.name}</b><small>{opt.label}</small></span>
            <span className="m-buynowbar__p">{inr(lineTotal)}</span>
            <button type="button" className="m-btn m-btn--fill m-buynowbar__cta" onClick={add} disabled={soldOut}>{soldOut ? 'Sold out' : 'Add to cart'}</button>
          </div>
        </div>
      )}
    </>
  );
}
