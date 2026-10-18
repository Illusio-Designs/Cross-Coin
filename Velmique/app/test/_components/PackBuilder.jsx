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
    // One shared group for every mix-pack line, so items added from the pack
    // page, the PDP row and the tier cards all count toward the same discount.
    const pg = 'byp';
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
              <div className="m-packtiers">
                {tiers.map((t) => {
                  const reached = count >= t.pairs;
                  const applied = reached && off > 0 && t.off === off;
                  return (
                    <div key={t.pairs} className={`m-ptier ${reached ? 'on' : ''}`}>
                      {t.badge ? <span className="m-ptier__tag">{t.badge}</span> : null}
                      <span className="m-ptier__name">{t.label || `Any ${t.pairs}`}</span>
                      <span className="m-ptier__sub">{t.pairs}+ scents</span>
                      <span className="m-ptier__imgs">
                        {products.slice(0, Math.min(t.pairs, 3)).map((p) => (
                          p.images?.[0] ? <img key={p.id} src={p.images[0]} alt="" loading="lazy" /> : null
                        ))}
                      </span>
                      <b className="m-ptier__off">{t.off}% OFF</b>
                      {applied
                        ? <span className="m-ptier__savepill">You save {inr(saved)}</span>
                        : reached ? <span className="m-ptier__savepill">Unlocked ✓</span> : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="m-packshead">Choose your fragrances</div>
          <div className="m-packgrid">
            {products.map((p) => {
              const on = sel.has(String(p.id));
              const img = p.images?.[0] || '';
              const sp = savePct(p);
              const rating = Number(p.rating || 0);
              const reviews = Number(p.reviews || 0);
              const defVar = (p.variations || []).find((v) => String(v.id) === String(p.defaultVariationId)) || p.variations?.[0] || null;
              const noteLine = (defVar?.noteItems?.length
                ? defVar.noteItems.map((n) => n.name)
                : (p.notes || []).map((n) => (typeof n === 'string' ? n : n?.name))
              ).filter(Boolean).slice(0, 3).join(' · ');
              return (
                <button type="button" key={p.id} className={`m-card m-pkcard ${on ? 'sel' : ''}`} onClick={() => toggle(p.id)}>
                  <span className="m-card__fig">
                    <span className="m-card__imglink">
                      <span className="m-card__tile">{img ? <img src={img} alt={p.name} loading="lazy" /> : null}</span>
                      <span className="m-card__shade" />
                    </span>
                    {p.badge ? <span className="m-card__tag">{p.badge}</span> : null}
                    {sp ? <span className="m-pkcard__save">Save {sp}%</span> : null}
                    {rating > 0 ? <span className="m-card__rbadge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.8.8-5 4.6 1.3 6.7L12 18l-6 3.4 1.3-6.7-5-4.6 6.8-.8L12 2Z" /></svg>{rating.toFixed(1)}/5</span> : null}
                    <span className="m-pkcard__check">{check}</span>
                  </span>
                  <span className="m-card__body">
                    <span className="m-card__top">
                      <span className="m-card__name">{p.name}</span>
                      <span className="m-card__price"><b>{inr(p.price)}</b>{p.originalPrice && p.originalPrice > p.price ? <s>{inr(p.originalPrice)}</s> : null}</span>
                    </span>
                    {noteLine ? <span className="m-card__notes">{noteLine}</span> : null}
                    {reviews > 0 ? <span className="m-card__rc">{reviews.toLocaleString('en-IN')} reviews</span> : null}
                    <span className="m-pkcard__add">{on ? `In pack ✓ · ${inr(p.price)}` : 'Add to pack'}</span>
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
