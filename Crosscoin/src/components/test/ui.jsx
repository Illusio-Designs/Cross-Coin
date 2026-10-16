// Shared bits for the /test preview: icons, the product card, and a tiny toast.
import { useRouter } from 'next/router';
import {
  PiArrowRightBold, PiShoppingCartBold, PiHeartBold, PiMagnifyingGlassBold,
  PiUserBold, PiListBold, PiXBold, PiCheckBold, PiTruckBold, PiArrowUUpLeftBold,
  PiCreditCardBold, PiShieldCheckBold, PiPackageBold, PiLockBold, PiTrashBold, PiSunBold,
} from 'react-icons/pi';
import { addItem } from './store';
import { toggleWish, isWished } from './wishlist';
import { inr } from './data';
import { colorToCss } from './real';

/* ---- icons: Phosphor (react-icons/pi), a rounded icon library chosen for the
   new Mint storefront (distinct from the Lucide set the legacy site uses). The
   Bold weight gives the big, round, friendly look. Each entry keeps the
   I.name(size) call signature so every /test call site is unchanged; Phosphor
   icons inherit currentColor, so they recolour with the surrounding text. */
const mk = (Icon, def) => (s = def) => <Icon size={s} />;
export const I = {
  arrow: mk(PiArrowRightBold, 18),
  cart: mk(PiShoppingCartBold, 22),
  heart: mk(PiHeartBold, 18),
  search: mk(PiMagnifyingGlassBold, 22),
  user: mk(PiUserBold, 22),
  menu: mk(PiListBold, 24),
  close: mk(PiXBold, 22),
  sun: mk(PiSunBold, 22),
  check: mk(PiCheckBold, 18),
  truck: mk(PiTruckBold, 26),
  ret: mk(PiArrowUUpLeftBold, 26),
  card: mk(PiCreditCardBold, 26),
  shield: mk(PiShieldCheckBold, 26),
  box: mk(PiPackageBold, 26),
  lock: mk(PiLockBold, 20),
  trash: mk(PiTrashBold, 18),
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
