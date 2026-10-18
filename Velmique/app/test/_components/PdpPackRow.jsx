'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

/* PDP "Build your own pack" — select scents first (no cart popping open per
   click), watch the after-discount total climb, then one "Add to cart" commits
   all of them tagged with the shared pack_group so checkout applies the %. */
export default function PdpPackRow({ products = [], tiers = [], maxOff = 0 }) {
  const { addToCart } = useStore();
  const [sel, setSel] = useState(() => new Set());
  if (!products.length) return null;

  const chosen = products.filter((p) => sel.has(String(p.id)));
  const count = chosen.length;
  const off = tiers.reduce((a, t) => (count >= t.pairs ? Math.max(a, t.off) : a), 0);
  const subtotal = chosen.reduce((a, p) => a + Number(p.price || 0), 0);
  const total = Math.round(subtotal * (1 - off / 100));
  const next = tiers.find((t) => count < t.pairs);

  const toggle = (id) => setSel((prev) => {
    const n = new Set(prev);
    const k = String(id);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });

  const addPack = () => {
    if (!count) return;
    chosen.forEach((p) => addToCart({
      id: `${p.id}:${p.defaultVariationId || 'v'}:pack`,
      productId: p.id,
      variationId: p.defaultVariationId || null,
      name: p.name,
      price: Number(p.price || 0),
      size: p.sizes?.[0] || '',
      image: p.images?.[0] || '',
      quantity: 1,
      packGroup: 'byp',
    }));
    setSel(new Set());
  };

  return (
    <div className="m-cpack m-pdppack">
      <div className="m-cpack__h">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
        <span><b>Build your own pack</b><small>Pick any 2+ scents &amp; save up to {maxOff}%</small></span>
        <Link href="/test/pack" className="m-cpack__all">View all →</Link>
      </div>
      <div className="m-cprow">
        {products.map((p) => {
          const on = sel.has(String(p.id));
          return (
            <div className={`m-cprod ${on ? 'on' : ''}`} key={p.id}>
              <span className="m-cprod__img">{p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : null}</span>
              <span className="m-cprod__n">{p.name}</span>
              <span className="m-cprod__pr">{inr(p.price)}</span>
              <button type="button" className={`m-cprod__add ${on ? 'on' : ''}`} onClick={() => toggle(p.id)}>{on ? '✓ Picked' : '+ Pick'}</button>
            </div>
          );
        })}
      </div>
      {count > 0 && (
        <div className="m-cpack__bar">
          <span className="m-cpack__tot">
            {off > 0 ? <s>{inr(subtotal)}</s> : null}
            <b>{inr(total)}</b>
            {off > 0 ? <em>{off}% off</em> : null}
          </span>
          <span className="m-cpack__nx">{next ? `Pick ${next.pairs - count} more for ${next.off}% off` : 'Max saving unlocked'}</span>
          <button type="button" className="m-cpack__cta" onClick={addPack}>Add {count} to cart · {inr(total)}</button>
        </div>
      )}
    </div>
  );
}
