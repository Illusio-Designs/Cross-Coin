// Shared bits for the /test preview: icons, the product card, and a tiny toast.
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon, ShoppingCart01Icon, FavouriteIcon, Search01Icon, UserIcon,
  Menu01Icon, Cancel01Icon, Tick02Icon, DeliveryTruck01Icon, ArrowTurnBackwardIcon,
  CreditCardIcon, Shield01Icon, PackageIcon, SquareLock02Icon, Delete02Icon, Sun03Icon,
} from '@hugeicons/core-free-icons';
import { addItem } from './store';
import { toggleWish, isWished } from './wishlist';
import { inr } from './data';
import { colorToCss } from './real';

/* ---- icons: Hugeicons (free Stroke-Rounded pack via @hugeicons/react), the
   "huge round" library chosen for the new Mint storefront. Each entry keeps the
   I.name(size) call signature so every /test call site is unchanged; the icons
   inherit currentColor, so they recolour with the surrounding text. */
const mk = (icon, def) => (s = def) => <HugeiconsIcon icon={icon} size={s} color="currentColor" strokeWidth={2} />;
export const I = {
  arrow: mk(ArrowRight01Icon, 18),
  cart: mk(ShoppingCart01Icon, 22),
  heart: mk(FavouriteIcon, 18),
  search: mk(Search01Icon, 22),
  user: mk(UserIcon, 22),
  menu: mk(Menu01Icon, 24),
  close: mk(Cancel01Icon, 22),
  sun: mk(Sun03Icon, 22),
  check: mk(Tick02Icon, 18),
  truck: mk(DeliveryTruck01Icon, 26),
  ret: mk(ArrowTurnBackwardIcon, 26),
  card: mk(CreditCardIcon, 26),
  shield: mk(Shield01Icon, 26),
  box: mk(PackageIcon, 26),
  lock: mk(SquareLock02Icon, 20),
  trash: mk(Delete02Icon, 18),
};

export function toast(msg) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cc-test-toast', { detail: msg }));
}

// Shimmer skeleton cards shown while the real catalogue loads. Drop them into a
// .pgrid or .prail — they take the grid cells just like real product cards.
export function SkeletonCards({ n = 8 }) {
  return Array.from({ length: n }).map((_, i) => <div className="cc-skel cc-skelcard" key={i} aria-hidden="true" />);
}

// A product thumbnail that shows the real image, falling back to a neutral
// coin-tile (keeps the look intact when a product has no image).
export function Thumb({ src, color, className, style }) {
  if (src) return <img className={className} src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
  const bg = color ? colorToCss(color) : 'var(--paper-2)';
  return <span className={className} style={{ width: '60%', aspectRatio: '1', borderRadius: '50%', background: bg, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.3), inset 0 0 0 10px rgba(0,0,0,.08)', ...style }} />;
}

// Custom open/close dropdown (the "Stamped" A treatment) — replaces native
// <select> so the open state is designed. options: [{ value, label }].
export function Dropdown({ value, options, onChange, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const cur = options.find((o) => o.value === value) || options[0];
  return (
    <div className={`dd dd--a${open ? ' open' : ''}${className ? ` ${className}` : ''}`} ref={ref}>
      <button type="button" className="dd__btn" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <span className="dd__label">{cur?.label}</span><span className="dd__chev" aria-hidden="true">▾</span>
      </button>
      <div className="dd__panel" role="listbox">
        {options.map((o) => (
          <button type="button" key={o.value} role="option" aria-selected={o.value === value} className={`dd__opt${o.value === value ? ' sel' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}>
            {o.label}<span className="tick">✓</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductCard({ p }) {
  const router = useRouter();
  const open = () => router.push(`/test/product?slug=${encodeURIComponent(p.slug || '')}`);
  const quickAdd = (e) => {
    e.stopPropagation();
    const v = (p.variants || []).find((x) => x.pairs === 1) || (p.variants || [])[0] || null;
    addItem({ id: p.id, vid: v?.id || null, name: p.name, brand: p.brand, color: p.colors?.[0]?.name || '', size: v?.size || p.sizes?.[0] || '', pack: v?.label || 'Single', packq: v?.pairs || 1, unit: v?.price || p.now, was: v?.comparePrice || p.was, base: v?.price || p.now, img: p.img }, 1);
    toast('Added to cart ✓');
    window.dispatchEvent(new CustomEvent('cc-test-opencart'));
  };
  return (
    <article className="cc-card">
      <div className="cc-card__img" onClick={open} style={{ background: 'var(--paper-2)', cursor: 'pointer', overflow: 'hidden' }}>
        {(p.badge || p.off > 0) && (
          <span className="flags">
            {p.badge ? <span className="flag">{String(p.badge).toUpperCase()}</span> : null}
            {p.off > 0 ? <span className="flag sale">−{p.off}%</span> : null}
          </span>
        )}
        <button className={`cc-card__wish${isWished(p.id) ? ' on' : ''}`} aria-label="Wishlist" onClick={(e) => { e.stopPropagation(); const added = toggleWish(p); e.currentTarget.classList.toggle('on', added); toast(added ? 'Saved to wishlist ♥' : 'Removed from wishlist'); }}>{I.heart(16)}</button>
        {p.img
          ? <img src={p.img} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <><span className="mint" style={{ background: 'var(--paper-2)' }} /><span className="ring" /></>}
      </div>
      <div className="cc-card__body">
        <span className="kl">{p.brand}</span>
        <h3 onClick={open} style={{ cursor: 'pointer' }}>{p.name}</h3>
        {p.rating && <div className="stars">★★★★★ <small>{p.rating} ({p.revs})</small></div>}
        <div className="price">
          <span className="now">{inr(p.now)}</span>
          {p.was > p.now && <span className="was">{inr(p.was)}</span>}
          {p.off > 0 && <span className="off">{p.off}% off</span>}
        </div>
      </div>
      <button className="btn add" onClick={quickAdd}>Quick add</button>
    </article>
  );
}
