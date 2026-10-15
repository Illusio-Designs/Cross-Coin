import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { getPublicCoupons } from '../../services/publicApi';

/* Exit-intent cart recovery — desktop only, once per browser session.
 *
 * Shows a single tasteful modal when a shopper with items in their cart moves
 * the cursor out of the top edge of the viewport. It reads cart state from the
 * existing cart context (no cart logic duplicated) and reuses the brand's REAL
 * public coupons (never a fabricated code). Mobile has no reliable exit-intent
 * signal, so it simply never shows there.
 *
 * Crosscoin already has a timed phone-lead popup (PhonePopupModal). To avoid
 * ever stacking two modals, this one yields if that overlay is on screen. */

const SESSION_KEY = 'crosscoin_exit_intent_shown';
const CTA = '#CE1E36';
const INK = '#180D3E';

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
  const { cartCount, setIsDrawerOpen } = useCart();
  const [visible, setVisible] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [copied, setCopied] = useState(false);

  const hasItemsRef = useRef(false);
  hasItemsRef.current = cartCount > 0;
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
      // Don't stack on top of the timed phone-lead popup — yield this time.
      if (document.querySelector('.phone-popup-overlay')) return;
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
      .catch(() => { /* API may throw → free-shipping message only */ });
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
  const complete = () => { setVisible(false); setIsDrawerOpen(true); };
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
        .eim-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(24,13,62,.55); animation: eimFade .25s ease; }
        .eim-card { position: relative; width: 100%; max-width: 380px; background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(24,13,62,.3); padding: 30px 26px 26px; text-align: center; animation: eimPop .3s cubic-bezier(.34,1.4,.64,1); }
        .eim-close { position: absolute; top: 10px; right: 12px; border: none; background: transparent; color: #9ca3af; font-size: 26px; line-height: 1; cursor: pointer; padding: 2px 6px; }
        .eim-close:hover { color: ${INK}; }
        .eim-title { margin: 0 0 8px; font-size: 23px; font-weight: 800; color: ${INK}; }
        .eim-msg { margin: 0 0 18px; font-size: 14.5px; line-height: 1.5; color: #4b5563; }
        .eim-coupon { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1.5px dashed ${CTA}; border-radius: 10px; padding: 10px 12px; margin: 0 0 18px; background: #fef2f4; text-align: left; }
        .eim-coupon-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .eim-coupon-code { font-weight: 800; font-size: 15px; letter-spacing: .5px; color: ${CTA}; }
        .eim-coupon-desc { font-size: 12px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eim-copy { flex: 0 0 auto; border: 1px solid ${CTA}; background: #fff; color: ${CTA}; font-weight: 700; font-size: 12.5px; padding: 7px 14px; border-radius: 8px; cursor: pointer; }
        .eim-copy:hover { background: ${CTA}; color: #fff; }
        .eim-cta { width: 100%; border: none; background: ${CTA}; color: #fff; font-weight: 700; font-size: 15px; padding: 13px 18px; border-radius: 10px; cursor: pointer; }
        .eim-cta:hover { background: #a01729; }
        @keyframes eimFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes eimPop { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .eim-backdrop, .eim-card { animation: none; } }
      `}</style>
    </div>
  );
}
