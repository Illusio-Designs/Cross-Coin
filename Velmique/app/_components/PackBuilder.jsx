'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { ik } from '@/lib/imagekit';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const check = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const star = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.8.8-5 4.6 1.3 6.7L12 18l-6 3.4 1.3-6.7-5-4.6 6.8-.8L12 2Z" /></svg>
);

export default function PackBuilder({ products = [], tiers = [] }) {
  const { addToCart } = useStore();
  // Quantities per product (id → n) so the same scent can go in the pack
  // more than once via the card's − / + stepper.
  const [qty, setQty] = useState({});
  const [added, setAdded] = useState(false);

  const discountFor = (c) => tiers.filter((t) => c >= t.pairs).reduce((a, t) => Math.max(a, t.off), 0);
  const nextTier = (c) => tiers.find((t) => c < t.pairs);
  const maxThreshold = tiers.length ? tiers[tiers.length - 1].pairs : 0;

  const count = products.reduce((a, p) => a + (qty[String(p.id)] || 0), 0);
  const subtotal = products.reduce((a, p) => a + Number(p.price || 0) * (qty[String(p.id)] || 0), 0);
  const off = discountFor(count);
  const total = subtotal * (1 - off / 100);
  const saved = subtotal - total;

  const bump = (id, d) => setQty((prev) => {
    const k = String(id);
    const n = (prev[k] || 0) + d;
    const next = { ...prev };
    if (n <= 0) delete next[k]; else next[k] = n;
    return next;
  });

  const addPack = () => {
    if (!count) return;
    products.forEach((p) => {
      const n = qty[String(p.id)] || 0;
      if (!n) return;
      addToCart({
        id: `${p.id}:${p.defaultVariationId || 'v'}:pack`,
        productId: p.id,
        variationId: p.defaultVariationId || null,
        name: p.name,
        price: Number(p.price || 0),
        size: p.sizes?.[0] || '',
        image: p.images?.[0] || '',
        slug: p.slug,
        quantity: n,
        // One shared group for every mix-pack line, so items added from the
        // pack page, the PDP row and the tier cards all count together.
        packGroup: 'byp',
      });
    });
    setAdded(true);
    setTimeout(() => { setAdded(false); setQty({}); }, 1600);
  };

  const hint = count === 0
    ? (tiers[0] ? `Select ${tiers[0].pairs} scents to unlock ${tiers[0].off}% off.` : 'Add scents to build your pack.')
    : (() => { const nt = nextTier(count); return nt ? `Add ${nt.pairs - count} more to unlock ${nt.off}% off.` : `Maximum saving unlocked — ${off}% off your pack.`; })();

  const savePct = (p) => (p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0);

  // Tier stepper rows: a "Start" rung plus the admin's store-wide tiers.
  const tierRows = tiers.length ? [{ pairs: 1, off: 0, label: 'Start', badge: '' }, ...tiers] : [];
  const reachedIdx = tierRows.reduce((a, t, i) => (count >= t.pairs ? i : a), -1);
  const fill = tierRows.length > 1 ? (Math.max(0, reachedIdx) / (tierRows.length - 1)) * 100 : 0;

  return (
    <>
      <section className="m-section" style={{ paddingBottom: 'clamp(20px,3vw,34px)' }}>
        <div className="m-wrap">
          <div className="m-packhero">
            <span className="m-eyebrow">Build Your Pack</span>
            <h1>Create Your <em>Fragrance Set</em></h1>
            <p>Mix any scents you love into one pack — watch the stepper unlock bigger savings as you add.</p>
            <div className="m-packsteps">
              <div className={`m-pstep ${count > 0 ? 'done' : 'now'}`}><i>1</i> Pick your scents</div>
              <span className={`m-plink ${count > 0 ? 'on' : ''}`} />
              <div className={`m-pstep ${off > 0 ? 'done' : count > 0 ? 'now' : ''}`}><i>2</i> Unlock savings</div>
              <span className={`m-plink ${off > 0 ? 'on' : ''}`} />
              <div className={`m-pstep ${count >= (tiers[0]?.pairs || 2) ? 'now' : ''}`}><i>3</i> Add to bag</div>
            </div>

            {tierRows.length ? (
              <>
                <div className="m-packtiers" style={{ gridTemplateColumns: `repeat(${tierRows.length},1fr)` }}>
                  {tierRows.map((t) => {
                    const reached = count >= t.pairs;
                    const applied = reached && t.off > 0 && t.off === off;
                    return (
                      <div key={t.pairs} className={`m-ptier ${reached ? 'on' : ''}`}>
                        {t.badge ? <span className="m-ptier__tag">{t.badge}</span> : null}
                        <span className="m-ptier__name">{t.off ? (t.label || `Any ${t.pairs}`) : 'Start'}</span>
                        <span className="m-ptier__sub">{t.off ? `${t.pairs}+ scents` : '1 scent'}</span>
                        <span className="m-ptier__imgs">
                          {products.slice(0, Math.min(t.pairs, 3)).map((p) => (
                            p.images?.[0] ? <img key={p.id} src={ik(p.images[0], 120)} alt="" loading="lazy" /> : null
                          ))}
                        </span>
                        <b className={`m-ptier__off ${t.off ? '' : 'mut'}`}>{t.off ? `${t.off}% OFF` : 'Full price'}</b>
                        {applied ? <span className="m-ptier__savepill">You save {inr(saved)}</span>
                          : reached ? <span className="m-ptier__savepill">Unlocked ✓</span> : null}
                      </div>
                    );
                  })}
                </div>
                <div className="m-ttrack">
                  <div className="m-ttrack__line" style={{ left: `${50 / tierRows.length}%`, right: `${50 / tierRows.length}%` }}>
                    <i style={{ width: `${fill}%` }} />
                  </div>
                  {tierRows.map((t, i) => (
                    <div key={t.pairs} className={`m-tnode ${count >= t.pairs ? 'on' : ''}`} style={{ left: `${((i + 0.5) / tierRows.length) * 100}%` }}>
                      <b>{t.pairs}</b><span>{t.off ? `${t.off}% off` : 'Start'}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="m-packshead">Choose your fragrances</div>
          {products.length ? null : (
            <div className="m-empty"><h3>Fragrances are being bottled</h3><p>Pack building opens as soon as scents are back in stock.</p></div>
          )}
          <div className="m-packgrid">
            {products.map((p) => {
              const n = qty[String(p.id)] || 0;
              const on = n > 0;
              const img = p.images?.[0] || '';
              const sp = savePct(p);
              const rating = Number(p.rating || 0);
              const reviews = Number(p.reviews || 0);
              const defVar = (p.variations || []).find((v) => String(v.id) === String(p.defaultVariationId)) || p.variations?.[0] || null;
              const noteLine = (defVar?.noteItems?.length
                ? defVar.noteItems.map((x) => x.name)
                : (p.notes || []).map((x) => (typeof x === 'string' ? x : x?.name))
              ).filter(Boolean).slice(0, 3).join(' · ');
              return (
                <article key={p.id} className={`m-card m-pkcard ${on ? 'sel' : ''}`}>
                  <button type="button" className="m-card__fig m-pkcard__figbtn" onClick={() => bump(p.id, 1)} aria-label={`Add ${p.name} to pack`}>
                    <span className="m-card__imglink">
                      <span className="m-card__tile">{img ? <img src={ik(img, 600)} alt={p.name} loading="lazy" decoding="async" /> : null}</span>
                      <span className="m-card__shade" />
                    </span>
                    {p.badge ? <span className="m-card__tag">{p.badge}</span> : null}
                    {sp ? <span className="m-pkcard__save">Save {sp}%</span> : null}
                    {rating > 0 ? <span className="m-card__rbadge">{star}{rating.toFixed(1)}/5</span> : null}
                    <span className="m-pkcard__check">{check}</span>
                  </button>
                  <div className="m-card__body">
                    <div className="m-card__top">
                      <span className="m-card__name">{p.name}</span>
                      <span className="m-card__price"><b>{inr(p.price)}</b>{p.originalPrice && p.originalPrice > p.price ? <s>{inr(p.originalPrice)}</s> : null}</span>
                    </div>
                    {noteLine ? <div className="m-card__notes">{noteLine}</div> : null}
                    {reviews > 0 ? <div className="m-card__rc">{reviews.toLocaleString('en-IN')} review{reviews === 1 ? '' : 's'}</div> : null}
                    {on ? (
                      <span className="m-pkqty">
                        <button type="button" onClick={() => bump(p.id, -1)} aria-label={`Remove one ${p.name}`}>−</button>
                        <output>{n} in pack<small>{inr(Number(p.price || 0) * n)}</small></output>
                        <button type="button" onClick={() => bump(p.id, 1)} aria-label={`Add one more ${p.name}`}>+</button>
                      </span>
                    ) : (
                      <button type="button" className="m-pkcard__add" onClick={() => bump(p.id, 1)}>+ Add to pack</button>
                    )}
                  </div>
                </article>
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
            {added ? 'Pack added ✓' : `Add pack · ${count} item${count === 1 ? '' : 's'}${count ? ` · ${inr(total)}` : ''}`}
          </button>
        </div>
      </div>
    </>
  );
}
