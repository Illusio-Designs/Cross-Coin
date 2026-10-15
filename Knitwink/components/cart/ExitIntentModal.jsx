'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { getPublicCoupons } from '@/lib/api/orders';

/* Exit-intent cart recovery — desktop only, once per browser session.
 *
 * Shows a single tasteful modal when a shopper with items in their cart moves
 * the cursor out of the top edge of the viewport. It reads cart state from the
 * existing useCart hook (no cart logic duplicated) and reuses the brand's REAL
 * public coupons (never a fabricated code). Mobile has no reliable exit-intent
 * signal, so it simply never shows there. */

const SESSION_KEY = 'knitwink_exit_intent_shown';
const BRAND_INK = '#0a0a0a';

function seenThisSession() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage may throw */ }
}

// Human label for the coupon's real discount (never a fabricated number).
function offerText(c) {
  if (!c) return '';
  const v = Number(c.value) || 0;
  if (c.type === 'percentage') return `${v}% off your order`;
  if (c.type === 'fixed') return `₹${v} off your order`;
  return c.description || 'Special offer on your order';
}

export default function ExitIntentModal() {
  const { itemCount, openDrawer } = useCart();
  const [visible, setVisible] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [copied, setCopied] = useState(false);

  const hasItemsRef = useRef(false);
  hasItemsRef.current = itemCount > 0;
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse) return undefined;
    if (seenThisSession()) { firedRef.current = true; return undefined; }

    const onLeave = (e) => {
      if (firedRef.current) return;
      if (e.clientY > 0) return;            // only the TOP edge counts
      if (!hasItemsRef.current) return;     // items-in-cart gate
      firedRef.current = true;
      markSeen();
      setVisible(true);
    };

    const root = document.documentElement;
    root.addEventListener('mouseleave', onLeave);
    return () => root.removeEventListener('mouseleave', onLeave);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    getPublicCoupons()
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : (data?.coupons || []);
        const pick = list.find((c) => c?.code?.toUpperCase() === 'CART10') || list.find((c) => c && c.code);
        if (pick) setCoupon(pick);
      })
      .catch(() => { /* no coupon → free-shipping message only */ });
    return () => { alive = false; };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;

  const close = () => setVisible(false);
  const complete = () => { setVisible(false); openDrawer(); };
  const copyCode = () => {
    const code = coupon?.code;
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
      }
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="eim-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="eim-card" role="dialog" aria-modal="true" aria-labelledby="eim-title">
        <button type="button" className="eim-close" aria-label="Close" onClick={close}>×</button>
        <h2 id="eim-title" className="eim-title">Leaving so soon?</h2>
        <p className="eim-msg">Your cart is saved — use the code below to complete your order and save.</p>

        {coupon && (
          <div className="eim-coupon">
            <div className="eim-coupon-main">
              <span className="eim-coupon-code">{coupon.code}</span>
              <span className="eim-coupon-desc">{offerText(coupon)}</span>
            </div>
            <button type="button" className="eim-copy" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        )}

        <button type="button" className="eim-cta" onClick={complete}>Complete my order</button>
      </div>

      <style jsx>{`
        .eim-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(10,10,10,.5); animation: eimFade .25s ease; }
        .eim-card { position: relative; width: 100%; max-width: 380px; background: #fffdfa; border-radius: 12px; box-shadow: 0 20px 60px rgba(10,10,10,.28); padding: 30px 26px 26px; text-align: center; animation: eimPop .3s cubic-bezier(.34,1.4,.64,1); }
        .eim-close { position: absolute; top: 10px; right: 12px; border: none; background: transparent; color: #9ca3af; font-size: 26px; line-height: 1; cursor: pointer; padding: 2px 6px; }
        .eim-close:hover { color: #404040; }
        .eim-title { margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${BRAND_INK}; font-family: var(--font-playfair), Georgia, serif; }
        .eim-msg { margin: 0 0 18px; font-size: 14.5px; line-height: 1.5; color: #525252; }
        .eim-coupon { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1.5px dashed ${BRAND_INK}; border-radius: 8px; padding: 10px 12px; margin: 0 0 18px; background: #f5f5f5; text-align: left; }
        .eim-coupon-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .eim-coupon-code { font-weight: 700; font-size: 15px; letter-spacing: .5px; color: ${BRAND_INK}; }
        .eim-coupon-desc { font-size: 12px; color: #737373; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eim-copy { flex: 0 0 auto; border: 1px solid ${BRAND_INK}; background: #fff; color: ${BRAND_INK}; font-weight: 600; font-size: 12.5px; padding: 7px 14px; border-radius: 6px; cursor: pointer; }
        .eim-copy:hover { background: ${BRAND_INK}; color: #fff; }
        .eim-cta { width: 100%; border: none; background: ${BRAND_INK}; color: #fff; font-weight: 600; font-size: 15px; padding: 13px 18px; border-radius: 8px; cursor: pointer; letter-spacing: .3px; }
        .eim-cta:hover { filter: brightness(1.25); }
        @keyframes eimFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes eimPop { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .eim-backdrop, .eim-card { animation: none; } }
      `}</style>
    </div>
  );
}
