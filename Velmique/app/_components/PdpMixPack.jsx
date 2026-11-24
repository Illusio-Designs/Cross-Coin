'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BrandIcon from '@/components/ui/BrandIcon';
import ShiprocketButton from '@/components/checkout/ShiprocketButton';
import { useStore } from '@/lib/store';
import { packDiscountPercent, packLineId, packUnitPrice } from '@/lib/packPricing';
import { openShiprocketCheckout, PACK_DISCOUNT_UNAVAILABLE, SHIPROCKET_RETRY_MESSAGE } from '@/lib/api/shiprocketCheckout';
import { fbTrack } from '@/utils/pixel';
import ProductCard from './ProductCard';

const inr = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', {
  minimumFractionDigits: paise % 100 ? 2 : 0,
  maximumFractionDigits: 2,
});

export default function PdpMixPack({ current, scents, tiers, placement = 'product' }) {
  const home = placement === 'home';
  const { addToCart } = useStore();
  const [picked, setPicked] = useState(() => new Set(current ? [current.id] : []));
  const rail = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [opening, setOpening] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const openingRef = useRef(false);
  const products = current ? [current, ...scents] : scents;
  const availableTiers = tiers.filter(({ pairs }) => pairs <= products.length);
  const selection = products.filter(({ id }) => picked.has(id));
  const count = selection.length;
  const off = packDiscountPercent(availableTiers, count);
  const subtotal = selection.reduce((sum, { price }) => sum + Math.round(price * 100), 0);
  const total = selection.reduce((sum, { price }) => sum + Math.round(packUnitPrice(price, off) * 100), 0);
  const next = availableTiers.find(({ pairs }) => pairs > count);

  useEffect(() => {
    const track = rail.current;
    if (!track) return undefined;
    const update = () => {
      const start = track.scrollLeft <= 1;
      const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      setEdges((prev) => prev.start === start && prev.end === end ? prev : { start, end });
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      track.removeEventListener('scroll', update);
    };
  }, [products.length, availableTiers.length]);

  const toggle = (id) => {
    setCheckoutError('');
    setPicked((previous) => {
      const nextSelection = new Set(previous);
      if (nextSelection.has(id)) nextSelection.delete(id);
      else nextSelection.add(id);
      return nextSelection;
    });
  };

  const move = (direction) => {
    const track = rail.current;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior });
  };

  const addPack = () => {
    if (!off) return;
    // Each finished selection reaches its own tier, even with another pack in the bag.
    const packGroup = `byp-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    addToCart(selection.map((product) => ({
      id: packLineId(product.id, product.defaultVariationId, packGroup),
      productId: product.id,
      variationId: product.defaultVariationId,
      name: product.name,
      price: product.price,
      size: product.sizes?.[0] || '',
      image: product.images?.[0] || '',
      slug: product.slug,
      quantity: 1,
      packGroup,
    })));
  };

  const buyPack = async (event) => {
    if (!off || openingRef.current) return;
    setCheckoutError('');
    if (selection.some((product) => !product.defaultVariationId)) {
      setCheckoutError('A selected fragrance is unavailable for checkout. Choose another fragrance.');
      return;
    }
    openingRef.current = true;
    setOpening(true);
    try {
      fbTrack('InitiateCheckout', {
        content_ids: selection.map((product) => String(product.id)),
        contents: selection.map((product) => ({ id: String(product.id), quantity: 1 })),
        content_type: 'product',
        num_items: count,
        value: total / 100,
        currency: 'INR',
      });
      const lines = selection.map((product) => ({ variationId: product.defaultVariationId, quantity: 1, packGroup: 'selected' }));
      await openShiprocketCheckout(event, lines, 'buy-now');
    } catch (error) {
      setCheckoutError(error.code === PACK_DISCOUNT_UNAVAILABLE
        ? error.message
        : SHIPROCKET_RETRY_MESSAGE);
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  };

  if (!availableTiers.length) return null;

  const fullBuilder = <Link href="/pack" className="m-byph__all">Full pack builder <BrandIcon name="arrow" size={14} /></Link>;
  const offers = (
    <ul className="v-pdp-pack__offers" aria-label="Pack offers">
      {availableTiers.map(({ pairs, off: percent }, index) => (
        <li key={pairs}>
          {home ? `Any ${pairs}${index === availableTiers.length - 1 ? '+' : ''}` : `${pairs}+ bottles`} · {percent}% off
        </li>
      ))}
    </ul>
  );

  return (
    <section className={`m-opt v-pdp-pack${home ? ' v-home-pack' : ''}`} aria-label="Build your pack" data-layout={home ? 'quick-pick' : undefined}>
      <div className="m-opt__h m-byph">
        <h2>Build Your Pack</h2>
        {home ? offers : fullBuilder}
      </div>
      {!home && offers}
      <div className="v-pdp-pack__rail-head">
        {home ? fullBuilder : <p>Scroll and check the fragrances you want.</p>}
        <div className="v-pdp-pack__arrows">
          <button type="button" aria-label="Previous fragrances" onClick={() => move(-1)} disabled={edges.start}>
            <BrandIcon name="previous" size={17} />
          </button>
          <button type="button" aria-label="Next fragrances" onClick={() => move(1)} disabled={edges.end}>
            <BrandIcon name="arrow" size={17} />
          </button>
        </div>
      </div>
      <div className="v-pdp-pack__cards" ref={rail} role="region" aria-label="Fragrances for your pack"
        tabIndex={0} data-lenis-prevent>
        {products.map((product) => {
          const checked = picked.has(product.id);
          return (
            <ProductCard key={product.id} product={product} selected={checked} showNotes={false} packPicker={home}
              imageSizes={home ? '(max-width: 740px) 42vw, (max-width: 1280px) 30vw, 365px' : '(max-width: 820px) min(43vw, 180px), 180px'}
              onImageClick={() => toggle(product.id)}
              action={!home && (
                <label className="m-card__addbody v-pdp-pack__check">
                  <input type="checkbox" checked={checked} onChange={() => toggle(product.id)} aria-label={`Select ${product.name} for your pack`} />
                  {checked ? 'Selected' : 'Select'}
                </label>
              )}
            />
          );
        })}
      </div>
      <div className="v-pdp-pack__footer">
        <div className="v-pdp-pack__total" aria-live="polite">
          <p>{count} {count === 1 ? 'fragrance' : 'fragrances'} selected{off > 0 && ` · ${off}% off applied`}</p>
          <div className="m-bypsum">
            <span>{off ? 'Pack total' : 'Selected total'}</span>
            <b>{inr(total)}</b>
            {off > 0 && <><s>{inr(subtotal)}</s><span className="m-bypsave">Save {inr(subtotal - total)}</span></>}
          </div>
          {next && (!home || !off) && <p>Choose {next.pairs - count} more to unlock {next.off}% off.</p>}
        </div>
        <div className="v-pdp-pack__actions">
          <button type="button" className="m-btn" onClick={addPack} disabled={!off || opening}>Add Pack to Bag</button>
          <ShiprocketButton label="BUY PACK NOW" onClick={buyPack} busy={opening} disabled={!off} />
        </div>
      </div>
      {checkoutError && <p className="v-pdp-pack__checkout-error" role="alert">{checkoutError}</p>}
    </section>
  );
}
