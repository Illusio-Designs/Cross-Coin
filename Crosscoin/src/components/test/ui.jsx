// Shared bits for the /test preview: icons, the product card, and a tiny toast.
import { useRouter } from 'next/router';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon, ShoppingCart01Icon, FavouriteIcon, Search01Icon, UserIcon,
  Menu01Icon, Cancel01Icon, Tick02Icon, DeliveryTruck01Icon, ArrowTurnBackwardIcon,
  CreditCardIcon, Shield01Icon, PackageIcon, SquareLock02Icon, Delete02Icon, Sun03Icon,
} from '@hugeicons/core-free-icons';
import { addItem } from './store';
import { toggleWish, isWished } from './wishlist';
import { inr } from './data';
import { R } from './routes';
import { colorToCss } from './real';
import { ikTransform, ikSrcSet } from '../../utils/imageUtils';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* ---- icons: Hugeicons (free Stroke-Rounded pack via @hugeicons/react), the
   "huge round" library chosen for the new Mint storefront. Each entry keeps the
   I.name(size) call signature so every /test call site is unchanged; the icons
   inherit currentColor, so they recolour with the surrounding text. */
function HIcon({ icon, size }) {
  return <HugeiconsIcon icon={icon} size={size} color="currentColor" strokeWidth={2} />;
}
export const I = {
  arrow: (s = 18) => <HIcon icon={ArrowRight01Icon} size={s} />,
  cart: (s = 22) => <HIcon icon={ShoppingCart01Icon} size={s} />,
  heart: (s = 18) => <HIcon icon={FavouriteIcon} size={s} />,
  search: (s = 22) => <HIcon icon={Search01Icon} size={s} />,
  user: (s = 22) => <HIcon icon={UserIcon} size={s} />,
  menu: (s = 24) => <HIcon icon={Menu01Icon} size={s} />,
  close: (s = 22) => <HIcon icon={Cancel01Icon} size={s} />,
  sun: (s = 22) => <HIcon icon={Sun03Icon} size={s} />,
  check: (s = 18) => <HIcon icon={Tick02Icon} size={s} />,
  truck: (s = 26) => <HIcon icon={DeliveryTruck01Icon} size={s} />,
  ret: (s = 26) => <HIcon icon={ArrowTurnBackwardIcon} size={s} />,
  card: (s = 26) => <HIcon icon={CreditCardIcon} size={s} />,
  shield: (s = 26) => <HIcon icon={Shield01Icon} size={s} />,
  box: (s = 26) => <HIcon icon={PackageIcon} size={s} />,
  lock: (s = 20) => <HIcon icon={SquareLock02Icon} size={s} />,
  trash: (s = 18) => <HIcon icon={Delete02Icon} size={s} />,
};

export function toast(msg) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cc-test-toast', { detail: msg }));
}

/* ---- Loading skeletons: one kit for the whole Mint store. ---------------
   Draw placeholders WHERE the content will land, in the real component's
   frame (.cc-card, .cattile, .post, .order, .addr …), so nothing jumps when
   the data arrives. Shimmer = `.sk` (styles/common/skeleton.css, Mint palette
   in TestLayout). Keep page titles, crumbs and filters on screen; replace only
   the part that is loading. On a refresh with data already shown, dim the old
   data (className "sk-dim") instead of flashing skeletons.

     <Sk w="60%" h={14} />                       one bar
     <SkBusy label="Loading products…" className="pgrid"><SkeletonCards n={8} /></SkBusy>
*/
const LINE_W = ['92%', '78%', '86%', '64%', '88%', '71%'];

export function Sk({ w = '100%', h = 12, r, circle = false, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`sk${circle ? ' sk--circle' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: circle ? h : w, height: h, borderRadius: r, ...style }}
    />
  );
}

// The announced wrapper around a skeleton region (screen readers hear the
// label once; the shapes inside are aria-hidden).
export function SkBusy({ label = 'Loading…', className, style, as: Tag = 'div', children }) {
  return (
    <Tag className={className} style={style} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </Tag>
  );
}

// True once the page has hydrated. Pages that read the browser (sign-in token,
// saved wishlist) render a skeleton until then instead of flashing the
// signed-out / empty state.
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// A product card placeholder in the real .cc-card frame: square image,
// brand / title / price lines and the Quick add button.
export function ProductCardSkeleton() {
  return (
    <div className="cc-card sk-frame" aria-hidden="true">
      <div className="sk-card__img"><Sk className="sk-fill" /></div>
      <div className="cc-card__body">
        <Sk w="38%" h={10} />
        <Sk w="86%" h={15} style={{ marginTop: 2 }} />
        <Sk w="52%" h={18} style={{ marginTop: 6 }} />
      </div>
      <Sk className="sk-card__btn" w="auto" h={47} />
    </div>
  );
}

// Product-card skeletons that take grid cells exactly like real cards. Drop
// them straight into a .pgrid / .prail (wrap that grid in <SkBusy>).
export function SkeletonCards({ n = 8 }) {
  return Array.from({ length: n }).map((_, i) => <ProductCardSkeleton key={i} />);
}

// Category tiles (.catgrid cells): square image + name bar.
export function CatTileSkeletons({ n = 8 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div className="cattile sk-frame" key={i} aria-hidden="true">
      <span className="cattile__img"><Sk className="sk-fill" /></span>
      <span className="cattile__bar"><Sk w={`${48 + (i % 3) * 12}%`} h={15} /><Sk w={16} h={16} /></span>
    </div>
  ));
}

// Journal post cards (.jgrid cells): 16:10 image + tag + title.
export function PostCardSkeletons({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div className="post sk-frame" key={i} aria-hidden="true">
      <div className="post__img"><Sk className="sk-fill" /></div>
      <div className="post__b sk-stack"><Sk w="30%" h={10} /><Sk w={LINE_W[i % LINE_W.length]} h={16} /><Sk w="55%" h={16} /></div>
    </div>
  ));
}

// Review cards (.rev): avatar + name, stars, three lines of text.
export function ReviewCardSkeletons({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div className="rev sk-frame" key={i} aria-hidden="true">
      <div className="rev__top"><Sk circle h={40} /><div className="sk-stack" style={{ flex: 1, gap: 6 }}><Sk w="45%" h={12} /><Sk w="28%" h={10} /></div></div>
      <Sk w={90} h={14} style={{ marginBottom: 10 }} />
      <div className="sk-stack"><Sk w="96%" h={11} /><Sk w={LINE_W[i % LINE_W.length]} h={11} /><Sk w="58%" h={11} /></div>
    </div>
  ));
}

// Order / return cards (.order): number + date, status pill, items, total + actions.
export function OrderCardSkeletons({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div className="order sk-frame" key={i} aria-hidden="true">
      <div className="order__top">
        <div className="sk-stack" style={{ gap: 6 }}><Sk w={130} h={14} /><Sk w={110} h={10} /></div>
        <Sk w={82} h={22} r={999} />
      </div>
      <div className="order__items2" style={{ gap: 7 }}><Sk w={LINE_W[i % LINE_W.length]} h={12} /><Sk w="48%" h={12} /></div>
      <div className="order__bot"><Sk w={120} h={14} /><div className="order__acts"><Sk w={64} h={32} /><Sk w={64} h={32} /></div></div>
    </div>
  ));
}

// Saved address cards (.addr).
export function AddressSkeletons({ n = 2 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div className="addr sk-frame" key={i} aria-hidden="true">
      <Sk w="34%" h={14} />
      <div className="sk-stack" style={{ marginTop: 10, gap: 7 }}><Sk w={LINE_W[i % LINE_W.length]} h={11} /><Sk w="40%" h={11} /></div>
    </div>
  ));
}

// Labelled form fields (.ffield) — label line + input box.
export function FieldSkeletons({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div className="ffield" key={i} aria-hidden="true"><Sk w={`${18 + (i % 3) * 7}%`} h={10} /><Sk h={46} /></div>
  ));
}

// Running text (articles, policies): an optional heading then paragraph lines.
export function TextSkeleton({ paras = 3, lines = 4, heading = true }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: paras }).map((_, p) => (
        <div key={p} style={{ marginBottom: 22 }}>
          {heading && p > 0 && <Sk w={`${34 + (p % 3) * 10}%`} h={22} style={{ margin: '6px 0 14px' }} />}
          <div className="sk-stack">
            {Array.from({ length: lines }).map((_, l) => <Sk key={l} h={13} w={l === lines - 1 ? '58%' : LINE_W[(p + l) % LINE_W.length]} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// The ONE image component for the Mint store. Shows the real image, falling
// back to a neutral coin-tile when there is no image (or it fails to load).
//
// No half-drawn pictures: the <img> stays transparent (its box shows the
// skeleton shimmer — see `.ccimg` in TestLayout's CSS) until the file has
// fully downloaded AND decoded, then fades in. Images already in the cache are
// shown at once. The parent box must already have its final size.
//
// ImageKit URLs are requested at the width they are shown (`w`, plus an
// optional `widths` srcSet with `sizes`), WebP/AVIF via f-auto. Other URLs are
// used as-is. `priority` = the LCP image (eager + high fetch priority).
export function Thumb({ src, color, className, style, alt = '', w, widths, sizes, priority = false }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = src ? (w ? ikTransform(src, w) : src) : '';
  const srcSet = src && widths ? ikSrcSet(src, widths) : undefined;

  // New picture → hide until it is ready (or reveal at once if it is cached,
  // e.g. already loaded before hydration).
  useIsoLayoutEffect(() => {
    setFailed(false);
    const img = ref.current;
    setShown(!!(img && img.complete && img.naturalWidth > 0));
  }, [url, srcSet]);

  const reveal = (e) => {
    const img = e.currentTarget;
    const done = () => { if (ref.current === img) setShown(true); };
    if (img.decode) img.decode().then(done, done); else done();
  };

  if (url && !failed) {
    return (
      <img
        ref={ref}
        className={`ccimg${shown ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
        src={url}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'auto' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={reveal}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      />
    );
  }
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
  const open = () => router.push(R.product(p.slug || ''));
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
          ? <Thumb src={p.img} alt={p.name} w={600} widths={[300, 600]} sizes="(max-width: 1000px) 50vw, 300px" />
          : <><span className="mint" style={{ background: 'var(--paper-2)' }} /><span className="ring" /></>}
      </div>
      <div className="cc-card__body">
        <span className="kl">{p.brand}</span>
        <h3 onClick={open} style={{ cursor: 'pointer' }}>{p.name}</h3>
        {p.rating && (
          <div className="rc-box" aria-label={`Rated ${p.rating} out of 5${p.revs > 0 ? ` from ${p.revs} reviews` : ''}`}>
            <span className="rc-box__s">{p.rating}★</span>
            {p.revs > 0 && <span className="rc-box__n">({p.revs})</span>}
          </div>
        )}
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
