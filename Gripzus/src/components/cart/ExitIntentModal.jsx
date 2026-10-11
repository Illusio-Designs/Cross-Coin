import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { getPublicCoupons } from '../../services/publicindex';

/* Exit-intent cart recovery — desktop only, once per browser session.
 *
 * Shows a single tasteful modal when a shopper with items in their cart moves
 * the cursor out of the top edge of the viewport. It reads cart state from the
 * existing cart context (no cart logic duplicated) and reuses the brand's REAL
 * public coupons (never a fabricated code). Mobile has no reliable exit-intent
 * signal, so it simply never shows there. Monochrome / square to match the
 * Gripzus design system. */

const SESSION_KEY = 'gripzus_exit_intent_shown';
const INK = '#121212';

function seenThisSession() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage may throw */ }
}

export default function ExitIntentModal() {
  const { count, openCart } = useCart();
  const [visible, setVisible] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [copied, setCopied] = useState(false);

  const hasItemsRef = useRef(false);
  hasItemsRef.current = count > 0;
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
        const first = list.find((c) => c && c.code);
        if (first) setCoupon(first);
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
  const complete = () => { setVisible(false); openCart(); };
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
        <p className="eim-msg">Your cart is saved — complete your order and enjoy free shipping on all orders.</p>

        {coupon && (
          <div className="eim-coupon">
            <div className="eim-coupon-main">
              <span className="eim-coupon-code">{coupon.code}</span>
              {coupon.description && <span className="eim-coupon-desc">{coupon.description}</span>}
            </div>
            <button type="button" className="eim-copy" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        )}

        <button type="button" className="eim-cta" onClick={complete}>Complete my order</button>
      </div>

      <style jsx>{`
        .eim-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(18,18,18,.55); animation: eimFade .25s ease; }
        .eim-card { position: relative; width: 100%; max-width: 380px; background: #F4F2EC; border: 1px solid #E2DDD2; box-shadow: 0 20px 60px rgba(18,18,18,.3); padding: 32px 26px 26px; text-align: center; animation: eimPop .3s cubic-bezier(.34,1.4,.64,1); }
        .eim-close { position: absolute; top: 10px; right: 12px; border: none; background: transparent; color: #9A968F; font-size: 26px; line-height: 1; cursor: pointer; padding: 2px 6px; }
        .eim-close:hover { color: ${INK}; }
        .eim-title { margin: 0 0 8px; font-size: 23px; font-weight: 700; color: ${INK}; letter-spacing: -.3px; }
        .eim-msg { margin: 0 0 20px; font-size: 14.5px; line-height: 1.5; color: #575552; }
        .eim-coupon { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px dashed ${INK}; padding: 11px 13px; margin: 0 0 20px; background: #ECE9E1; text-align: left; }
        .eim-coupon-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .eim-coupon-code { font-weight: 700; font-size: 15px; letter-spacing: 1px; color: ${INK}; }
        .eim-coupon-desc { font-size: 12px; color: #575552; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eim-copy { flex: 0 0 auto; border: 1px solid ${INK}; background: transparent; color: ${INK}; font-weight: 700; font-size: 11.5px; letter-spacing: .5px; text-transform: uppercase; padding: 8px 14px; cursor: pointer; }
        .eim-copy:hover { background: ${INK}; color: #F4F2EC; }
        .eim-cta { width: 100%; border: none; background: ${INK}; color: #F4F2EC; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; padding: 14px 18px; cursor: pointer; }
        .eim-cta:hover { background: #000; }
        @keyframes eimFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes eimPop { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .eim-backdrop, .eim-card { animation: none; } }
      `}</style>
    </div>
  );
}
