'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { fbTrack } from '@/utils/pixel';
import { ik } from '@/lib/imagekit';
import { packDiscountPercent, packUnitPrice } from '@/lib/packPricing';
import { openShiprocketCheckout, SHIPROCKET_RETRY_MESSAGE } from '@/lib/api/shiprocketCheckout';
import ShiprocketButton from '@/components/checkout/ShiprocketButton';
import ProductCard from './ProductCard';
import SkImg from './SkImg';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function PackBuilder({ products = [], tiers = [] }) {
  const { addToCart } = useStore();
  // Quantities per product (id → n) so the same scent can go in the pack
  // more than once via the card's − / + stepper.
  const [qty, setQty] = useState({});
  const [added, setAdded] = useState(false);
  const [opening, setOpening] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const nextTier = (c) => tiers.find((t) => c < t.pairs);
  const maxThreshold = tiers.length ? tiers[tiers.length - 1].pairs : 0;

  const count = products.reduce((a, p) => a + (qty[String(p.id)] || 0), 0);
  const subtotal = products.reduce((a, p) => a + Number(p.price || 0) * (qty[String(p.id)] || 0), 0);
  const off = packDiscountPercent(tiers, count);
  const total = products.reduce((sum, product) => (
    sum + packUnitPrice(Number(product.price) || 0, off) * (qty[String(product.id)] || 0)
  ), 0);
  const saved = subtotal - total;

  async function buyPack(event) {
    if (!off || opening) return;
    const lines = products.flatMap((product) => {
      const quantity = qty[String(product.id)];
      return quantity > 0 ? [{ productId: product.id, variationId: product.defaultVariationId, quantity, packGroup: 'selected' }] : [];
    });
    if (lines.some((line) => !line.variationId)) {
      setCheckoutError('One fragrance is unavailable. Update your selection.');
      return;
    }
    setOpening(true);
    setCheckoutError('');
    try {
      const contents = lines.map(({ productId, quantity }) => ({ id: String(productId), quantity }));
      fbTrack('InitiateCheckout', {
        content_ids: contents.map(({ id }) => id),
        content_type: 'product',
        contents,
        num_items: count,
        value: Number(total.toFixed(2)),
        currency: 'INR',
      });
      await openShiprocketCheckout(event, lines);
    } catch (error) {
      setCheckoutError(error.code === 'CHECKOUT_PACK_DISCOUNT_UNAVAILABLE' ? error.message : SHIPROCKET_RETRY_MESSAGE);
    } finally {
      setOpening(false);
    }
  }

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
                            p.images?.[0] ? <SkImg key={p.id} frameClassName="m-pack-tier-photo" src={ik(p.images[0], 128)}
                              alt="" loading="lazy" /> : null
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
              const increase = () => bump(p.id, 1);
              const action = n ? (
                <div className="m-pkqty">
                  <button type="button" onClick={() => bump(p.id, -1)} aria-label={`Remove one ${p.name}`}>−</button>
                  <output>{n} in pack<small>{inr(Number(p.price || 0) * n)}</small></output>
                  <button type="button" onClick={increase} aria-label={`Add one more ${p.name}`}>+</button>
                </div>
              ) : (
                <button type="button" className="m-card__addbody" onClick={increase} aria-label={`Add ${p.name} to pack`}>
                  + Add to Pack
                </button>
              );
              return <ProductCard key={p.id} product={p} selected={n > 0} onImageClick={increase} action={action} />;
            })}
          </div>
        </div>
      </section>

      {/* clearance for the fixed pack bar */}
      <div aria-hidden style={{ height: 150 }} />

      <div className="m-packbar">
        {maxThreshold > 0 && <div className="m-packtrack"><i style={{ width: `${Math.min(100, (count / maxThreshold) * 100)}%` }} /></div>}
        <div className="m-wrap m-packbar__in">
          <div className="m-packbar__hint">{hint}{checkoutError && <div role="alert">{checkoutError}</div>}</div>
          <div className="m-packbar__price">
            <b>{inr(total)}</b>
            {off ? <s>{inr(subtotal)}</s> : null}
            {off ? <span className="m-packbar__save">Save {off}% · {inr(saved)}</span> : null}
          </div>
          <div className="m-packbar__cta">
            <button type="button" className="m-btn" onClick={addPack} disabled={!count || opening}>
              {added ? 'Pack added ✓' : 'Add Pack to Bag'}
            </button>
            <ShiprocketButton label="BUY PACK NOW" onClick={buyPack} busy={opening} disabled={!off} />
          </div>
        </div>
      </div>
    </>
  );
}
