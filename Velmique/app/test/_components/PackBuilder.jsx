'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const check = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

export default function PackBuilder({ products = [], tiers = [] }) {
  const { addToCart } = useStore();
  const [sel, setSel] = useState(() => new Set());
  const [added, setAdded] = useState(false);

  const discountFor = (count) => tiers.filter((t) => count >= t.pairs).reduce((a, t) => Math.max(a, t.off), 0);
  const nextTier = (count) => tiers.find((t) => count < t.pairs);
  const maxThreshold = tiers.length ? tiers[tiers.length - 1].pairs : 0;

  const chosen = useMemo(() => products.filter((p) => sel.has(String(p.id))), [products, sel]);
  const count = chosen.length;
  const subtotal = chosen.reduce((a, p) => a + Number(p.price || 0), 0);
  const off = discountFor(count);
  const total = subtotal * (1 - off / 100);
  const saved = subtotal - total;

  const toggle = (id) => setSel((prev) => {
    const next = new Set(prev);
    const k = String(id);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const addPack = () => {
    if (!count) return;
    const pg = `byp-${Date.now()}`;
    chosen.forEach((p) => addToCart({
      id: `${p.id}:${p.defaultVariationId || 'v'}:pack`,
      productId: p.id,
      variationId: p.defaultVariationId || null,
      name: p.name,
      price: Number(p.price || 0),
      size: p.sizes?.[0] || '',
      image: p.images?.[0] || '',
      quantity: 1,
      packGroup: pg,
    }));
    setAdded(true);
    setTimeout(() => { setAdded(false); setSel(new Set()); }, 1600);
  };

  const hint = count === 0
    ? (tiers[0] ? `Select ${tiers[0].pairs} scents to unlock ${tiers[0].off}% off.` : 'Add scents to build your pack.')
    : (() => { const nt = nextTier(count); return nt ? `Add ${nt.pairs - count} more to unlock ${nt.off}% off.` : `Maximum saving unlocked — ${off}% off your pack.`; })();

  const savePct = (p) => (p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0);

  return (
    <>
      <section className="m-section" style={{ paddingBottom: 'clamp(20px,3vw,34px)' }}>
        <div className="m-wrap">
          <div className="m-packhero">
            <span className="m-eyebrow">Build Your Pack</span>
            <h1>Create Your <em>Fragrance Set</em></h1>
            <p>Mix any scents you love into one pack — the more you add, the more you save.</p>
            <div className="m-packsteps">
              <div><i>1</i> Pick your scents</div>
              <div><i>2</i> Watch the price drop</div>
              <div><i>3</i> Add the pack to bag</div>
            </div>
            {tiers.length ? (
              <div className="m-packladder">
                {tiers.map((t) => (
                  <div key={t.pairs} className={`m-rung ${count >= t.pairs ? 'on' : ''}`}><b>{t.pairs}</b><span>{t.off}% off</span></div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="m-packshead">Choose your fragrances</div>
          <div className="m-packgrid">
            {products.map((p) => {
              const on = sel.has(String(p.id));
              const img = p.images?.[0] || '';
              const sp = savePct(p);
              return (
                <button type="button" key={p.id} className={`m-packcard ${on ? 'sel' : ''}`} onClick={() => toggle(p.id)}>
                  <span className="m-packcard__img">
                    {img ? <img src={img} alt={p.name} loading="lazy" /> : null}
                    {p.badge ? <span className="m-packcard__badge">{p.badge}</span> : null}
                    {sp ? <span className="m-packcard__save">Save {sp}%</span> : null}
                    <span className="m-packcard__check">{check}</span>
                  </span>
                  <span className="m-packcard__b">
                    <span className="m-packcard__n">{p.name}</span>
                    <span className="m-packcard__pr">{inr(p.price)}{p.originalPrice && p.originalPrice > p.price ? <s>{inr(p.originalPrice)}</s> : null}</span>
                    <span className="m-packcard__add">{on ? 'In pack ✓' : 'Add to pack'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* clearance for the fixed pack bar */}
      <div aria-hidden style={{ height: 150 }} />

      <div className="m-packbar">
        {maxThreshold > 0 && <div className="m-packtrack"><i style={{ width: `${Math.min(100, (count / maxThreshold) * 100)}%` }} /></div>}
        <div className="m-wrap m-packbar__in">
          <div className="m-packbar__hint">{hint}</div>
          <div className="m-packbar__price">
            <b>{inr(total)}</b>
            {off ? <s>{inr(subtotal)}</s> : null}
            {off ? <span className="m-packbar__save">Save {off}% · {inr(saved)}</span> : null}
          </div>
          <button type="button" className="m-btn m-btn--fill m-packbar__cta" onClick={addPack} disabled={!count}>
            {added ? 'Pack added ✓' : `Add pack · ${count} item${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </>
  );
}
