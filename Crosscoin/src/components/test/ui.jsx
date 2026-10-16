// Shared bits for the /test preview: icons, the product card, and a tiny toast.
import { useRouter } from 'next/router';
import { addItem } from './store';
import { inr } from './data';
import { colorToCss } from './real';

/* ---- icons (stroke inherits currentColor) ---- */
const S = (p) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p });
export const I = {
  arrow: (s = 16) => <svg {...S()} width={s} height={s}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  cart: (s = 20) => <svg {...S()} width={s} height={s}><path d="M6 6h15l-1.5 9h-12z" /><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /><path d="M6 6 5 2H2" /></svg>,
  heart: (s = 16) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={s} height={s}><path d="M12 20s-7-4.4-9.2-8.3C1.3 8.9 2.6 5.5 6 5.5c2 0 3.2 1.4 4 2.6.8-1.2 2-2.6 4-2.6 3.4 0 4.7 3.4 3.2 6.2C19 15.6 12 20 12 20z" /></svg>,
  search: (s = 20) => <svg {...S()} width={s} height={s}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  user: (s = 20) => <svg {...S()} width={s} height={s}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>,
  menu: (s = 20) => <svg {...S()} width={s} height={s}><path d="M3 6h18M3 12h18M3 18h18" /></svg>,
  close: (s = 20) => <svg {...S()} width={s} height={s}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  sun: (s = 20) => <svg {...S()} width={s} height={s}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  check: (s = 16) => <svg {...S({ strokeWidth: 2.6 })} width={s} height={s}><path d="M20 6 9 17l-5-5" /></svg>,
  truck: (s = 24) => <svg {...S()} width={s} height={s}><path d="M3 7h13v8H3zM16 10h3l2 3v2h-5" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>,
  ret: (s = 24) => <svg {...S()} width={s} height={s}><path d="M3 12a9 9 0 1 1 3 6.7L3 21" /><path d="M3 21v-4h4" /></svg>,
  card: (s = 24) => <svg {...S()} width={s} height={s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>,
  shield: (s = 24) => <svg {...S()} width={s} height={s}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="m9 12 2 2 4-4" /></svg>,
  box: (s = 24) => <svg {...S()} width={s} height={s}><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" /></svg>,
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
        {p.off > 0 && <span className="flag sale">−{p.off}%</span>}
        <button className="cc-card__wish" aria-label="Wishlist" onClick={(e) => { e.stopPropagation(); e.currentTarget.classList.toggle('on'); toast('Saved to wishlist ♥'); }}>{I.heart(16)}</button>
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
