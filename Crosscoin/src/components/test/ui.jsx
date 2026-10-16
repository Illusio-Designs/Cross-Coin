// Shared bits for the /test preview: icons, the product card, and a tiny toast.
import { useRouter } from 'next/router';
import { addItem } from './store';
import { COLOR_HEX, inr, PACKS } from './data';

export const mintStyle = (color) => ({ background: COLOR_HEX[color] || COLOR_HEX.Crimson });

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
};

export function toast(msg) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cc-test-toast', { detail: msg }));
}

export function ProductCard({ p }) {
  const router = useRouter();
  const open = () => router.push(`/test/product?id=${p.id}`);
  const quickAdd = (e) => {
    e.stopPropagation();
    addItem({ id: p.id, name: p.name, brand: p.brand, color: p.colors[0], size: 'M', pack: PACKS[0].label, packq: 1, unit: p.now }, 1);
    toast('Added to cart ✓');
    window.dispatchEvent(new CustomEvent('cc-test-opencart'));
  };
  return (
    <article className="card">
      <div className="card__img" onClick={open} style={{ background: 'var(--paper-2)', cursor: 'pointer' }}>
        {p.flag && <span className="flag">{p.flag}</span>}
        <span className="flag sale" style={p.flag ? { top: 'auto', bottom: 10, left: 10 } : undefined}>−{p.off}%</span>
        <button className="card__wish" aria-label="Wishlist" onClick={(e) => { e.stopPropagation(); e.currentTarget.classList.toggle('on'); toast('Saved to wishlist ♥'); }}>{I.heart(16)}</button>
        <span className="mint" style={mintStyle(p.colors[0])} />
        <span className="ring" />
      </div>
      <div className="card__body">
        <span className="kl">{p.brand}</span>
        <h3 onClick={open} style={{ cursor: 'pointer' }}>{p.name}</h3>
        <div className="stars">★★★★★ <small>{p.rating} ({p.revs})</small></div>
        <div className="price"><span className="now">{inr(p.now)}</span><span className="was">{inr(p.was)}</span><span className="off">{p.off}% off</span></div>
      </div>
      <button className="btn add" onClick={quickAdd}>Quick add</button>
    </article>
  );
}
