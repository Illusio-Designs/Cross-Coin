'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

/* PDP "Build your own pack" — a horizontal scroll of scents to add to a pack,
   same pattern as the cart drawer's build-a-pack row. Each +Add tags the line
   with a shared pack_group so the mix discount applies at checkout. */
export default function PdpPackRow({ products = [], maxOff = 0 }) {
  const { addToCart } = useStore();
  const pg = useRef(null);
  if (!products.length) return null;

  const add = (p) => {
    if (!pg.current) pg.current = `byp-${Date.now()}`;
    addToCart({
      id: `${p.id}:${p.defaultVariationId || 'v'}:${pg.current}`,
      productId: p.id,
      variationId: p.defaultVariationId || null,
      name: p.name,
      slug: p.slug,
      price: Number(p.price || 0),
      size: p.sizes?.[0] || '',
      image: p.images?.[0] || '',
      quantity: 1,
      packGroup: pg.current,
    });
  };

  return (
    <div className="m-cpack m-pdppack">
      <div className="m-cpack__h">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
        <span><b>Build your own pack</b><small>Add any 2+ scents &amp; save up to {maxOff}%</small></span>
        <Link href="/test/pack" className="m-cpack__all">View all →</Link>
      </div>
      <div className="m-cprow">
        {products.map((p) => (
          <div className="m-cprod" key={p.id}>
            <span className="m-cprod__img">{p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : null}</span>
            <span className="m-cprod__n">{p.name}</span>
            <span className="m-cprod__pr">{inr(p.price)}</span>
            <button type="button" className="m-cprod__add" onClick={() => add(p)}>+ Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}
