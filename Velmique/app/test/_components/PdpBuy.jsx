'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

export default function PdpBuy({ product, packs = [], mixTiers = [] }) {
  const { addToCart, setCartOpen } = useStore();
  const router = useRouter();

  // Build selectable options from real variations. Each variation has a size +
  // price + image; fall back to a single synthetic option for simple products.
  const options = useMemo(() => {
    const vs = (product.variations || []).filter(Boolean);
    if (!vs.length) {
      return [{ id: product.defaultVariationId || product.id, label: product.sizes?.[0] || 'One Size', price: product.price, image: product.images?.[0] || '' }];
    }
    return vs.map((v) => ({
      id: v.id,
      label: v.size || v.sku || 'Default',
      price: v.price,
      image: v.images?.[0]?.url || product.images?.[0] || '',
    }));
  }, [product]);

  const [sel, setSel] = useState(0);
  const [qty, setQty] = useState(1);
  const [packIdx, setPackIdx] = useState(0);
  const opt = options[sel] || options[0];

  // "Build Your Pack" choices from two sources:
  //  • per-product packs (exact totals; checkout re-prices via bundlePerUnit)
  //  • store-wide mix tiers (% off by item count; checkout applies the % to
  //    lines sharing a pack_group) — used when the product has no packs of
  //    its own, so every product still gets the tier cards.
  const isMix = !packs.length && mixTiers.length > 0;
  const packChoices = useMemo(() => {
    const base = Number(opt.price) || 0;
    if (packs.length) {
      return [
        { pairs: 1, total: base, label: 'Pack of 1', badge: '' },
        ...packs.map((t) => ({ pairs: t.pairs, total: t.price, label: t.label, badge: t.badge })),
      ];
    }
    if (mixTiers.length) {
      return [
        { pairs: 1, total: base, label: '1 Bottle', badge: '' },
        ...mixTiers.map((t) => ({
          pairs: t.pairs,
          total: Math.round(base * t.pairs * (1 - t.off / 100)),
          label: `${t.pairs} Bottles`,
          badge: t.badge,
        })),
      ];
    }
    return [];
  }, [packs, mixTiers, opt.price]);
  const pack = packChoices.length ? (packChoices[packIdx] || packChoices[0]) : null;

  const unitPrice = pack ? pack.total / pack.pairs : Number(opt.price) || 0;
  const lineQty = pack ? pack.pairs : qty;
  const lineTotal = pack && pack.pairs > 1 ? pack.total : unitPrice * lineQty;

  // Mix packs submit the FULL unit price and a shared pack_group — the server
  // applies the tier % to the group, so a pre-discounted price would double-dip.
  const mixSel = isMix && pack && pack.pairs > 1;
  const line = () => ({
    id: mixSel ? `${product.id}:${opt.id}:pack` : `${product.id}:${opt.id}`,
    productId: product.id,
    variationId: opt.id,
    name: product.name,
    price: Math.round((mixSel ? Number(opt.price) || 0 : unitPrice) * 100) / 100,
    size: opt.label,
    image: opt.image,
    quantity: lineQty,
    ...(mixSel ? { packGroup: 'byp' } : {}),
  });

  const add = () => { addToCart(line()); };
  const buy = () => { addToCart(line()); setCartOpen(false); router.push('/checkout'); };

  return (
    <>
      {options.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h">Select Size</div>
          <div className="m-sizes">
            {options.map((o, i) => (
              <button key={o.id} type="button" className={`m-size ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                <b>{o.label}</b><span>{inr(o.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {packChoices.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h">Build Your Pack</div>
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
                        <img key={k} src={opt.image} alt="" loading="lazy" />
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

      <div className="m-buybar">
        {!pack && (
          <div className="m-qty">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        )}
        <button type="button" className="m-btn m-btn--fill m-addbtn" onClick={add}>
          Add to cart · {inr(lineTotal)}
        </button>
      </div>
      <div className="m-prepaidchip">PREPAID10</div>
      <button type="button" className="m-btn m-buynow" onClick={buy}>Buy now</button>
    </>
  );
}
