import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { MINT_CSS } from './mintCss';
import { useCart, cartCount, cartSubtotal, changeQty, removeItem, clearCart, setLinePack, addItem } from './store';
import { I, Thumb } from './ui';
import { inr } from './data';
import { validateCouponReal, fetchBundleTiers, fetchCoupons, fetchProducts } from './real';
import { placeCodGuest, placePrepaidGuest } from './realCheckout';
import { useWishlist, wishCount } from './wishlist';
import { getConsent, setConsent } from '../../lib/consent';

const FREE_SHIP = 799;

// Buy More, Save More pair stepper for the primary cart line (Morbix-style).
function CartPairStepper({ item, tiers, onSet }) {
  const base = item.base || item.unit;
  const ms = [{ pairs: 1, total: base }, ...tiers.map((t) => ({ pairs: t.pairs, total: t.price }))];
  const n = ms.length; const q = item.qty; const maxP = ms[n - 1].pairs;
  const savedFor = (pairs, total) => Math.max(0, Math.round(base * pairs - total));
  let reached = 0; for (let k = 0; k < n; k++) { if (q >= ms[k].pairs) reached = k; }
  let frac = reached;
  if (reached < n - 1) { const c = ms[reached].pairs, x = ms[reached + 1].pairs; if (x > c) frac += Math.min(1, (q - c) / (x - c)); }
  const fillPct = n > 1 ? (frac / (n - 1)) * 100 : 0;
  const next = tiers.find((t) => t.pairs > q) || null;
  return (
    <div className="ccps">
      <div className="ccps__msg"><span className="ccps__spark">✦</span>
        <span>{next
          ? <>Add <b>{next.pairs - q} pair{next.pairs - q > 1 ? 's' : ''}</b> → {next.pairs}-pair pack{savedFor(next.pairs, next.price) > 0 ? <>, <span className="hi">save {inr(savedFor(next.pairs, next.price))}</span></> : ''}</>
          : <span className="hi">🎉 Best value — {maxP}-pair pack applied!</span>}</span>
      </div>
      <div className="ccps__track">
        <div className="ccps__line"><span style={{ width: `${fillPct}%` }} /></div>
        <div className="ccps__dots">
          {ms.map((m, i) => {
            const on = q >= m.pairs; const sel = q === m.pairs; const sv = m.pairs > 1 ? savedFor(m.pairs, m.total) : 0;
            return (
              <button type="button" key={i} className={`ccps__dot${on ? ' on' : ''}${sel ? ' sel' : ''}`} onClick={() => onSet(m.pairs, m.total)}>
                <span className="d">{on ? I.check(11) : ''}</span>
                <span className="l">{m.pairs} Pair{m.pairs > 1 ? 's' : ''}</span>
                {sv > 0 ? <span className="sv">save {inr(sv)}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TICKER = ['CROSSCOIN ESSENTIALS', 'FREE SHIP ₹799+', 'RETURNS 7-DAY', 'COD AVAILABLE', 'SECURE CHECKOUT'];
const LOGO = '/assets/crosscoin_logo.webp';

// Mobile polish, scoped like the rest of the preview.
const MOBILE_CSS = `
.cc-test-root .cc-logo{ height:30px; width:auto; display:block; }
.cc-test-root footer.site .cc-logo{ height:34px; }
.cc-test-root .brand{ gap:0; }
/* search + account wrapper is a <span>, so make it a flex row — otherwise the
   grid-display icon buttons stack vertically and collide with the cart icon. */
.cc-test-root .nav__extra{ display:inline-flex; align-items:center; gap:4px; }
/* Desktop product rail: fixed card width (no 1fr) so a card never balloons to
   the full width and spills over the section below. */
.cc-test-root .prail{ grid-auto-columns:260px; }
/* The logo artwork is dark, so flip it to white on the dark ("blue") theme
   backgrounds where it would otherwise disappear. */
.cc-test-root[data-theme="dark"] .cc-logo{ filter: brightness(0) invert(1); }
@media (prefers-color-scheme: dark){ .cc-test-root:not([data-theme="light"]) .cc-logo{ filter: brightness(0) invert(1); } }
/* PDP: keep the sticky gallery confined to the product block and make sure the
   "You may also like" section below always paints above it (fixes overlap). */
.cc-test-root .pd{ position: relative; align-items: start; }
.cc-test-root .gallery{ align-self: start; z-index: 0; }
.cc-test-root .pd ~ .block{ position: relative; z-index: 2; background: var(--bg); border-top: 2px solid var(--line); margin-top: 20px; }
/* Reviews auto-scroller (Morbix-style infinite marquee, pause on hover). */
.cc-test-root .revscroll{ overflow:hidden; display:flex; flex-direction:column; gap:14px; -webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent); mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent); }
.cc-test-root .revscroll__track{ display:flex; gap:16px; width:max-content; padding:0 8px; animation:ccRevScroll 48s linear infinite; }
.cc-test-root .revscroll__track--rev{ animation-direction:reverse; }
.cc-test-root .revscroll__track:nth-child(2){ animation-duration:58s; }
.cc-test-root .revscroll__track:nth-child(3){ animation-duration:42s; }
.cc-test-root .revscroll:hover .revscroll__track{ animation-play-state:paused; }
.cc-test-root .revscroll .rev{ width:330px; flex:0 0 auto; align-self:stretch; }
@keyframes ccRevScroll{ from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
@media (prefers-reduced-motion: reduce){ .cc-test-root .revscroll__track{ animation:none; } }
@media (max-width:520px){ .cc-test-root .revscroll .rev{ width:78vw; } }
/* iOS Safari collapses aspect-ratio boxes that contain percentage-height media,
   which made product/journal/gallery image boxes shrink to ~0 and the cards
   float over the next section. Use a robust padding-top ratio box with
   absolutely-filled media instead (applies at all widths). */
.cc-test-root .cc-card__img{ aspect-ratio:auto !important; display:block !important; height:0; padding-top:100%; position:relative; overflow:hidden; }
.cc-test-root .cc-card__img img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cc-test-root .cc-card__img .mint{ left:20%; top:20%; }
/* badge + sale flag must sit ABOVE the absolutely-filled image, not behind it */
.cc-test-root .cc-card__img .flags{ position:absolute; top:10px; left:10px; z-index:3; display:flex; flex-direction:column; align-items:flex-start; gap:5px; }
.cc-test-root .cc-card__img .flags .flag{ position:static; top:auto; left:auto; }
.cc-test-root .cc-card__wish{ z-index:3; }
/* breathing room above the product grids / rail */
.cc-test-root .pgrid{ padding-top:6px; }
.cc-test-root .prail{ padding-top:6px; }
/* Shop-by-category coin tiles (Concept B) */
.cc-test-root .cgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.cc-test-root .ctile{ position:relative; border:2px solid var(--line-ink); border-radius:var(--r); background:var(--surface); box-shadow:var(--stamp); padding:20px; min-height:190px; display:flex; flex-direction:column; justify-content:space-between; cursor:pointer; overflow:hidden; text-align:left; font:inherit; color:var(--ink); transition:transform .2s var(--ease), box-shadow .2s var(--ease); }
.cc-test-root .ctile:hover{ transform:translate(-4px,-4px); box-shadow:8px 8px 0 var(--line-ink); }
.cc-test-root .ctile__coin{ position:absolute; right:-26px; top:-26px; width:110px; height:110px; border-radius:50%; border:2px dashed color-mix(in srgb, var(--c,var(--crimson)) 40%, transparent); }
.cc-test-root .ctile__coin::after{ content:''; position:absolute; inset:16px; border-radius:50%; background:radial-gradient(circle at 35% 30%, var(--c,var(--crimson)), transparent 70%); opacity:.5; }
.cc-test-root .ctile__no{ font-family:"Space Mono",monospace; font-size:12px; color:var(--ink-faint); }
.cc-test-root .ctile__nm{ font-family:"Fraunces",serif; font-weight:700; font-size:19px; line-height:1.1; max-width:76%; margin-top:4px; }
.cc-test-root .ctile__go{ font-family:"Space Mono",monospace; font-size:11px; font-weight:700; color:var(--crimson); display:inline-flex; align-items:center; gap:7px; }
.cc-test-root .ctile__dot{ width:12px; height:12px; border-radius:50%; background:var(--c,var(--crimson)); box-shadow:inset 0 0 0 2px rgba(255,255,255,.4); }
@media (max-width:820px){ .cc-test-root .cgrid{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:480px){ .cc-test-root .cgrid{ grid-template-columns:1fr; } }
/* huge round feature icons */
.cc-test-root .techcard .mk{ width:72px; height:72px; margin-bottom:16px; background:color-mix(in srgb,var(--gold) 16%,transparent); }
.cc-test-root .techcard .mk svg{ width:34px; height:34px; }
/* bigger icons across every /test section (overrides inline svg sizes) */
.cc-test-root .pdptrust__i{ padding:14px 6px; }
.cc-test-root .pdptrust__i svg{ width:30px !important; height:30px !important; }
.cc-test-root .idealchip svg{ width:22px !important; height:22px !important; }
.cc-test-root .contactrow .pi svg{ width:28px !important; height:28px !important; }
.cc-test-root .washitem svg{ width:40px !important; height:40px !important; }
.cc-test-root .usp svg{ width:24px !important; height:24px !important; }
/* Defensive: a product-card image can never balloon out of its card/grid cell,
   on any browser or during image load — the card clips and the ratio box caps. */
.cc-test-root .pgrid > *, .cc-test-root .prail > *{ min-width:0; }
.cc-test-root .cc-card{ overflow:hidden; }
.cc-test-root .cc-card__img{ max-height:72vh; }
.cc-test-root .cc-card__img img{ max-width:100%; max-height:100%; }
/* Real banner/slider image in the hero (stamped frame). */
.cc-test-root .hero__art--banner{ position:relative; border:2px solid var(--line-ink); border-radius:4px; overflow:hidden; box-shadow:var(--stamp); background:var(--paper-2); width:100%; height:0 !important; padding-top:75%; aspect-ratio:auto !important; }
.cc-test-root .hero__art--banner img{ position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; display:block; }
@media (max-width:600px){ .cc-test-root .hero__art--banner{ display:block !important; padding-top:62%; margin-top:6px; } }
/* Search bar on the /test/search page. */
.cc-test-root .searchbar{ display:flex; gap:10px; margin-top:16px; max-width:560px; }
.cc-test-root .searchbar input{ flex:1; min-width:0; padding:13px 15px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); color:var(--ink); font:inherit; font-size:15px; box-shadow:var(--stamp-sm); }
.cc-test-root .searchbar input:focus{ outline:none; border-color:var(--crimson); }
.cc-test-root .searchbar .btn{ flex:0 0 auto; }
/* Loading shimmer / skeletons */
.cc-test-root .cc-skel{ position:relative; overflow:hidden; background:var(--paper-2); border:2px solid var(--line-ink); border-radius:var(--r); box-shadow:var(--stamp-sm); }
.cc-test-root .cc-skelcard{ height:0; padding-top:128%; }
.cc-test-root .cc-skel::after{ content:''; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--surface) 75%,transparent),transparent); animation:ccShimmer 1.25s infinite; }
@keyframes ccShimmer{ 100%{ transform:translateX(100%); } }
.cc-test-root .cc-skelblock{ border-radius:4px; }
@media (prefers-reduced-motion: reduce){ .cc-test-root .cc-skel::after{ animation:none; } }
/* cookie preferences modal */
.cc-test-root .ckmodal{ position:fixed; left:50%; bottom:-100%; transform:translateX(-50%); z-index:120; width:min(520px,calc(100% - 28px)); background:var(--surface); border:2px solid var(--line-ink); border-radius:4px; box-shadow:var(--stamp); padding:20px; transition:bottom .3s var(--ease); }
.cc-test-root .ckmodal.on{ bottom:max(18px,env(safe-area-inset-bottom,0px)); }
.cc-test-root .ckmodal__h{ display:flex; align-items:center; justify-content:space-between; }
.cc-test-root .ckmodal__h b{ font-family:"Fraunces",serif; font-size:19px; }
.cc-test-root .ckmodal__intro{ font-size:13px; color:var(--ink-soft); line-height:1.55; margin:8px 0 14px; }
.cc-test-root .ckrow{ display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 0; border-top:1.5px solid var(--line); cursor:pointer; }
.cc-test-root .ckrow b{ display:block; font-size:14px; }
.cc-test-root .ckrow span{ font-size:12px; color:var(--ink-faint); }
.cc-test-root .ckrow .ckon{ font-family:"Space Mono",monospace; font-size:11px; font-weight:700; color:#0f766e; }
.cc-test-root .ckrow input[type=checkbox]{ width:20px; height:20px; accent-color:var(--crimson); flex-shrink:0; }
.cc-test-root .ckmodal__btns{ display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
.cc-test-root .ckmodal__btns .btn{ flex:1; min-width:120px; }
/* clean cart item cards (Morbix) */
.cc-test-root .citem-sec-title{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-faint); margin:2px 0 8px; }
.cc-test-root .citem{ display:flex; gap:12px; padding:14px 0; border-bottom:1.5px solid var(--line); }
.cc-test-root .citem__th{ width:62px; height:62px; flex:0 0 auto; border:2px solid var(--line-ink); border-radius:4px; overflow:hidden; background:var(--paper-2); display:grid; place-items:center; }
.cc-test-root .citem__main{ flex:1; min-width:0; }
.cc-test-root .citem__top{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.cc-test-root .citem__nm{ font-weight:700; font-size:14px; line-height:1.25; }
.cc-test-root .citem__rm{ flex:0 0 auto; background:none; border:0; color:var(--ink-faint); cursor:pointer; padding:0; }
.cc-test-root .citem__rm:hover{ color:var(--crimson); }
.cc-test-root .citem__var{ font-family:"Space Mono",monospace; font-size:11.5px; color:var(--ink-faint); margin:4px 0 9px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.cc-test-root .citem__bot{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.cc-test-root .citem__pr{ display:flex; align-items:baseline; gap:6px; font-family:"Space Mono",monospace; flex-wrap:wrap; }
.cc-test-root .citem__pr b{ font-size:15px; color:var(--crimson); }
.cc-test-root .citem__per{ font-size:10px; color:var(--ink-faint); font-weight:400; }
.cc-test-root .citem__pr s{ font-size:11px; color:var(--ink-faint); }
.cc-test-root .citem__pr em{ font-style:normal; font-size:10.5px; font-weight:700; color:#0f766e; }
.cc-test-root .citem__qty{ box-shadow:none !important; flex:0 0 auto; }
.cc-test-root .citem__qty button{ width:28px; height:28px; }
.cc-test-root .citem__qty span{ min-width:42px; font-size:12px; text-align:center; }
/* coupon input + best offer + see-all (Morbix) */
.cc-test-root .couponrow{ display:flex; gap:10px; margin-top:16px; }
.cc-test-root .couponrow input{ flex:1; min-width:0; padding:13px 15px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); color:var(--ink); font:inherit; font-size:14px; box-shadow:var(--stamp-sm); }
.cc-test-root .couponrow input:focus{ outline:none; border-color:var(--crimson); }
.cc-test-root .couponrow__btn, .cc-test-root .bestoffer__btn{ flex:0 0 auto; background:#201253; color:#fff; border:2px solid var(--line-ink); border-radius:4px; font-family:"Space Mono",monospace; font-weight:700; font-size:12.5px; padding:0 20px; cursor:pointer; }
.cc-test-root .bestoffer{ display:flex; align-items:center; gap:10px; margin-top:12px; padding:12px 14px; border:1.5px solid color-mix(in srgb,#0f766e 40%,transparent); background:color-mix(in srgb,#0f766e 8%,var(--surface)); border-radius:4px; }
.cc-test-root .bestoffer__ic{ color:#0f766e; flex:0 0 auto; }
.cc-test-root .bestoffer__t{ flex:1; min-width:0; }
.cc-test-root .bestoffer__t b{ display:block; font-size:13.5px; color:var(--ink); }
.cc-test-root .bestoffer__t span{ font-size:11.5px; color:var(--ink-faint); }
.cc-test-root .bestoffer__btn{ padding:9px 15px; font-size:11.5px; }
.cc-test-root .seeoffers{ display:flex; align-items:center; gap:6px; margin-top:12px; background:none; border:0; padding:0; font-family:"Space Mono",monospace; font-size:12px; font-weight:700; color:#0f766e; cursor:pointer; }
.cc-test-root .offerlist{ margin-top:8px; display:flex; flex-direction:column; gap:6px; }
.cc-test-root .offerlist__row{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border:1.5px dashed var(--line); border-radius:4px; font-size:12.5px; }
.cc-test-root .offerlist__row button{ flex:0 0 auto; background:none; border:0; color:var(--crimson); font-family:"Space Mono",monospace; font-weight:700; font-size:11.5px; cursor:pointer; }
/* checkout trust row */
.cc-test-root .cotrust{ display:flex; align-items:center; justify-content:center; gap:16px; margin-top:10px; font-family:"Space Mono",monospace; font-size:11px; color:var(--ink-faint); }
.cc-test-root .cotrust span{ display:inline-flex; align-items:center; gap:5px; }
.cc-test-root .cotrust svg{ color:#0f766e; }
/* cart item pack chip */
.cc-test-root .packchip{ display:inline-block; margin-left:8px; font-family:"Space Mono",monospace; font-size:9.5px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--crimson); background:color-mix(in srgb,var(--crimson) 10%,var(--surface)); border:1px solid color-mix(in srgb,var(--crimson) 30%,transparent); border-radius:999px; padding:2px 8px; }
/* Buy More, Save More carousel (Morbix) */
.cc-test-root .bms{ margin:16px 0 4px; border:2px solid var(--line-ink); border-radius:4px; background:color-mix(in srgb,var(--crimson) 5%,var(--surface)); box-shadow:var(--stamp-sm); padding:12px; }
.cc-test-root .bms__h{ text-align:center; font-size:11.5px; font-weight:700; color:var(--crimson); margin-bottom:10px; }
.cc-test-root .bms__scroll{ display:flex; gap:10px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
.cc-test-root .bms__scroll::-webkit-scrollbar{ display:none; }
.cc-test-root .bms__card{ flex:0 0 auto; width:236px; display:flex; align-items:center; gap:10px; background:var(--surface); border:2px solid var(--line-ink); border-radius:4px; padding:8px; box-shadow:var(--stamp-sm); }
.cc-test-root .bms__img{ width:48px; height:48px; border-radius:4px; overflow:hidden; background:var(--paper-2); flex-shrink:0; display:grid; place-items:center; }
.cc-test-root .bms__img img{ width:100%; height:100%; object-fit:cover; }
.cc-test-root .bms__info{ min-width:0; flex:1; }
.cc-test-root .bms__nm{ font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cc-test-root .bms__pr{ display:flex; align-items:baseline; gap:5px; margin-top:2px; font-family:"Space Mono",monospace; }
.cc-test-root .bms__pr b{ font-size:12.5px; color:var(--crimson); }
.cc-test-root .bms__pr s{ font-size:10.5px; color:var(--ink-faint); }
.cc-test-root .bms__pr em{ font-style:normal; font-size:9.5px; font-weight:700; color:#0f766e; background:color-mix(in srgb,#0f766e 12%,transparent); border-radius:999px; padding:1px 6px; }
.cc-test-root .bms__add{ flex-shrink:0; font-family:"Space Mono",monospace; font-size:11px; font-weight:700; color:#fff; background:var(--crimson); border:2px solid var(--line-ink); border-radius:4px; padding:7px 11px; cursor:pointer; }
.cc-test-root .bms__add:hover{ filter:brightness(1.08); }
/* "Sold in pairs" note at the top of the cart */
.cc-test-root .pairsnote{ font-size:11px; color:var(--crimson); background:color-mix(in srgb,var(--crimson) 7%,var(--surface)); border:1px dashed color-mix(in srgb,var(--crimson) 40%,var(--line)); border-radius:4px; padding:8px 11px; margin-bottom:14px; line-height:1.4; }
/* PDP: Ideal for / Washing instructions / Manufacturing details (stamped Mint). */
.cc-test-root .idealrow{ display:flex; flex-wrap:wrap; gap:10px; }
.cc-test-root .idealchip{ display:inline-flex; align-items:center; gap:8px; padding:9px 15px; border:2px solid var(--line-ink); border-radius:999px; background:var(--surface); box-shadow:var(--stamp-sm); font-weight:600; font-size:13.5px; }
.cc-test-root .idealchip svg{ color:var(--crimson); }
.cc-test-root .washbox{ display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
.cc-test-root .washitem{ display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; padding:14px 8px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp-sm); }
.cc-test-root .washitem svg{ color:var(--ink); }
.cc-test-root .washitem span{ font-family:"Space Mono",monospace; font-size:10.5px; line-height:1.3; color:var(--ink-soft); }
@media (max-width:760px){ .cc-test-root .washbox{ grid-template-columns:repeat(3,1fr); } }
@media (max-width:420px){ .cc-test-root .washbox{ grid-template-columns:repeat(2,1fr); } }
.cc-test-root .mfgrow{ display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between; padding:18px 20px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp-sm); }
.cc-test-root .mfgaddr{ flex:1 1 320px; min-width:0; font-size:13.5px; line-height:1.5; color:var(--ink-soft); }
.cc-test-root .origin{ flex:0 0 auto; text-align:right; }
.cc-test-root .origin__l{ display:block; font-family:"Space Mono",monospace; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-faint); margin-bottom:5px; }
.cc-test-root .origin__b{ display:inline-flex; align-items:center; gap:8px; font-weight:700; }
.cc-test-root .origin__b svg{ border:1px solid var(--line); border-radius:2px; }
/* Buy it now — solid dark button (Morbix), fixed in both themes */
.cc-test-root .btn--buynow{ background:#201253; color:#fff; border:0; border-radius:18px; box-shadow:0 6px 18px rgba(24,13,62,.28); padding:17px 20px; font-size:15px; }
.cc-test-root .btn--buynow:hover{ background:#2c1a6e; transform:none; }
.cc-test-root .btn--buynow svg{ color:#fff; }
/* PDP in-stock + free-shipping status row (Morbix-style) */
.cc-test-root .pdpstatus{ display:flex; flex-wrap:wrap; align-items:center; gap:9px 15px; margin:11px 0 2px; }
.cc-test-root .instock{ display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#0f766e; background:color-mix(in srgb,#0f766e 12%,var(--surface)); border:1.5px solid color-mix(in srgb,#0f766e 38%,transparent); border-radius:999px; padding:5px 11px; }
.cc-test-root .instock svg{ color:#0f766e; }
.cc-test-root .freeship{ display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--ink-soft); }
.cc-test-root .freeship svg{ color:var(--crimson); }
.cc-test-root .freeship strong{ color:var(--ink); font-weight:700; }
/* PDP trust row + About/Specs (Morbix-style layout, Mint styling) */
.cc-test-root .pdptrust{ margin-top:16px; border-top:2px solid var(--line); padding-top:14px; }
.cc-test-root .pdptrust__free{ display:inline-flex; align-items:center; gap:8px; font-size:13.5px; color:var(--ink-soft); }
.cc-test-root .pdptrust__free svg{ color:var(--crimson); }
.cc-test-root .pdptrust__free strong{ color:var(--ink); }
.cc-test-root .pdptrust__row{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; }
.cc-test-root .pdptrust__i{ display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; font-size:11px; font-weight:600; color:var(--ink-soft); padding:10px 6px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp-sm); }
.cc-test-root .pdptrust__i svg{ color:var(--crimson); }
@media (max-width:420px){ .cc-test-root .pdptrust__row{ grid-template-columns:repeat(2,1fr); } }
/* square wishlist by the title */
.cc-test-root .titlerow{ display:flex; align-items:flex-start; gap:12px; justify-content:space-between; }
.cc-test-root .titlerow h1{ flex:1; min-width:0; }
.cc-test-root .wishsq{ flex:0 0 auto; width:46px; height:46px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp-sm); color:var(--ink); display:grid; place-items:center; cursor:pointer; transition:.15s; }
.cc-test-root .wishsq:hover{ transform:translate(-2px,-2px); box-shadow:4px 4px 0 var(--line-ink); }
.cc-test-root .wishsq.on{ background:var(--crimson); border-color:var(--crimson); color:#fff; }
/* PREPAID10 chip above Buy it now */
.cc-test-root .prepaidchip{ position:relative; z-index:3; display:block; width:max-content; max-width:92%; margin:12px auto -14px; text-align:center; font-family:"Space Mono",monospace; font-size:11.5px; font-weight:700; letter-spacing:.03em; color:#0f766e; background:color-mix(in srgb,#0f766e 16%,var(--surface)); border:1.5px solid color-mix(in srgb,#0f766e 32%,transparent); border-radius:999px; padding:7px 18px; box-shadow:0 2px 8px rgba(24,13,62,.2); }
/* button gets a touch more top room so its label clears the overlapping chip */
.cc-test-root .btn--buynow{ padding-top:20px; }
/* delivery pincode check */
.cc-test-root .pdpdeliv{ margin-top:14px; }
.cc-test-root .pdpdeliv__l{ display:block; font-family:"Space Mono",monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-faint); margin-bottom:7px; }
.cc-test-root .pdpdeliv__row{ display:flex; gap:8px; max-width:340px; }
.cc-test-root .pdpdeliv__row input{ flex:1; min-width:0; padding:10px 13px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); color:var(--ink); font:inherit; font-size:14px; box-shadow:var(--stamp-sm); }
.cc-test-root .pdpdeliv__row input:focus{ outline:none; border-color:var(--crimson); }
.cc-test-root .pdpdeliv__msg{ font-size:12.5px; margin-top:8px; font-weight:600; }
.cc-test-root .pdpdetails{ display:grid; grid-template-columns:1.6fr 1fr; gap:28px; align-items:start; }
.cc-test-root .pdpabout .eyebrow{ display:block; margin-bottom:6px; }
.cc-test-root .pdpabout h2{ font-size:clamp(24px,3.2vw,34px); margin-bottom:12px; }
.cc-test-root .pdpabout .legal{ font-size:14.5px; }
.cc-test-root .pdpspecs{ border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp); padding:6px 16px; }
.cc-test-root .pdpspecs h3{ font-size:16px; padding:12px 0 4px; }
.cc-test-root .pdpspecs dl{ margin:0; }
.cc-test-root .specrow{ display:flex; justify-content:space-between; gap:14px; padding:11px 0; border-top:1px solid var(--line); }
.cc-test-root .specrow dt{ font-family:"Space Mono",monospace; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-faint); }
.cc-test-root .specrow dd{ margin:0; font-size:13.5px; font-weight:600; text-align:right; }
@media (max-width:760px){ .cc-test-root .pdpdetails{ grid-template-columns:1fr; gap:20px; } }
/* CHOOSE YOUR PACK ladder (Morbix-style) */
.cc-test-root .packlad{ display:flex; flex-direction:column; gap:10px; margin:6px 0 4px; }
.cc-test-root .packopt{ display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:14px 16px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp-sm); cursor:pointer; font:inherit; color:var(--ink); transition:border-color .15s, box-shadow .15s; }
.cc-test-root .packopt.on{ border-color:var(--crimson); box-shadow:0 0 0 3px color-mix(in srgb,var(--crimson) 16%,transparent); }
.cc-test-root .packopt__radio{ flex:0 0 auto; width:18px; height:18px; border-radius:50%; border:2px solid var(--line); position:relative; }
.cc-test-root .packopt.on .packopt__radio{ border-color:var(--crimson); }
.cc-test-root .packopt.on .packopt__radio::after{ content:''; position:absolute; inset:3px; border-radius:50%; background:var(--crimson); }
.cc-test-root .packopt__l{ flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.cc-test-root .packopt__l b{ font-size:14.5px; font-weight:700; display:flex; align-items:center; gap:8px; }
.cc-test-root .packopt__badge{ font-family:"Space Mono",monospace; font-style:normal; font-size:9.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#fff; background:var(--crimson); padding:3px 7px; border-radius:4px; }
.cc-test-root .packopt__pp{ font-family:"Space Mono",monospace; font-size:11.5px; color:var(--ink-faint); }
.cc-test-root .packopt__p{ flex:0 0 auto; text-align:right; display:flex; flex-direction:column; align-items:flex-end; }
.cc-test-root .packopt__now{ font-family:"Space Mono",monospace; font-weight:700; font-size:15px; }
.cc-test-root .packopt__was{ font-family:"Space Mono",monospace; font-size:11px; color:var(--ink-faint); text-decoration:line-through; }
/* Collections grid */
.cc-test-root .collgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:24px; }
.cc-test-root .collcard{ position:relative; min-height:170px; border:2px solid var(--line-ink); border-radius:4px; box-shadow:var(--stamp); color:#fff; text-align:left; padding:18px; cursor:pointer; display:flex; flex-direction:column; justify-content:flex-end; transition:transform .18s var(--ease); font:inherit; }
.cc-test-root .collcard:hover{ transform:translate(-3px,-3px); box-shadow:6px 6px 0 var(--line-ink); }
.cc-test-root .collcard__no{ position:absolute; top:14px; left:16px; font-family:"Space Mono",monospace; font-size:12px; opacity:.8; }
.cc-test-root .collcard__name{ font-family:"Fraunces",serif; font-weight:700; font-size:22px; line-height:1.05; }
.cc-test-root .collcard__ct{ font-family:"Space Mono",monospace; font-size:11px; opacity:.9; margin-top:4px; position:relative; z-index:2; }
.cc-test-root .collcard__img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.cc-test-root .collcard::after{ content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(10,6,24,.15),rgba(10,6,24,.62)); z-index:1; }
.cc-test-root .collcard__no, .cc-test-root .collcard__name{ position:relative; z-index:2; }
@media (max-width:760px){ .cc-test-root .collgrid{ grid-template-columns:1fr 1fr; } }
@media (max-width:460px){ .cc-test-root .collgrid{ grid-template-columns:1fr; } }
/* account hub tiles */
.cc-test-root .acctile{ text-align:left; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); box-shadow:var(--stamp-sm); padding:18px; cursor:pointer; font:inherit; color:var(--ink); transition:transform .16s var(--ease); display:flex; flex-direction:column; gap:4px; min-height:120px; }
.cc-test-root .acctile:hover{ transform:translate(-3px,-3px); box-shadow:6px 6px 0 var(--line-ink); }
.cc-test-root .acctile__ic{ color:var(--crimson); margin-bottom:6px; }
.cc-test-root .acctile b{ font-family:"Fraunces",serif; font-size:17px; }
.cc-test-root .acctile__d{ font-size:13px; color:var(--ink-soft); }
/* Legal / policy / article rich text */
.cc-test-root .legal{ font-size:15px; line-height:1.72; color:var(--ink-soft); }
.cc-test-root .legal h1,.cc-test-root .legal h2,.cc-test-root .legal h3{ color:var(--ink); margin:22px 0 10px; }
.cc-test-root .legal h2{ font-size:24px; } .cc-test-root .legal h3{ font-size:19px; }
.cc-test-root .legal p{ margin:0 0 13px; } .cc-test-root .legal ul,.cc-test-root .legal ol{ margin:0 0 13px 20px; }
.cc-test-root .legal li{ margin:5px 0; } .cc-test-root .legal a{ color:var(--crimson); text-decoration:underline; }
.cc-test-root .legal img{ border-radius:4px; margin:12px 0; }
/* Blog article */
.cc-test-root .artmeta{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:12px; color:var(--ink-faint); }
.cc-test-root .artcat{ background:var(--crimson); color:#fff; font-family:"Space Mono",monospace; font-size:10.5px; font-weight:700; padding:4px 9px; border-radius:4px; letter-spacing:.04em; }
.cc-test-root .arttitle{ font-size:clamp(28px,5vw,44px); margin:12px 0 16px; }
.cc-test-root .arthero{ position:relative; height:0; padding-top:56.25%; aspect-ratio:auto !important; border:2px solid var(--line-ink); border-radius:4px; overflow:hidden; box-shadow:var(--stamp); margin-bottom:22px; }
.cc-test-root .arthero img{ position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; display:block; }
/* Order tracking */
.cc-test-root .trackcard{ border:2px solid var(--line-ink); border-radius:4px; box-shadow:var(--stamp); background:var(--surface); padding:20px; margin-top:24px; }
.cc-test-root .trackcard__top{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.cc-test-root .statuspill{ background:color-mix(in srgb,var(--crimson) 12%,var(--surface)); color:var(--crimson); border:2px solid var(--crimson); border-radius:999px; padding:5px 13px; font-family:"Space Mono",monospace; font-size:11px; font-weight:700; text-transform:uppercase; }
.cc-test-root .trackcard__meta{ display:flex; flex-wrap:wrap; gap:8px; font-size:11.5px; color:var(--ink-faint); margin-top:8px; }
.cc-test-root .trackitems{ margin-top:14px; border-top:2px solid var(--line); padding-top:12px; }
.cc-test-root .trackitem{ display:flex; justify-content:space-between; gap:12px; padding:7px 0; font-size:13.5px; }
/* Contact */
.cc-test-root .contactgrid{ display:grid; grid-template-columns:1fr 1fr; gap:26px; margin-top:24px; }
.cc-test-root .contactrow{ display:flex; gap:12px; align-items:flex-start; padding:12px 0; border-bottom:1px solid var(--line); }
.cc-test-root .contactrow .pi{ color:var(--crimson); flex:0 0 auto; margin-top:2px; }
.cc-test-root .contactrow b{ display:block; font-size:13px; } .cc-test-root .contactrow a,.cc-test-root .contactrow span{ font-size:13.5px; color:var(--ink-soft); }
.cc-test-root .contactrow a{ color:var(--crimson); }
.cc-test-root .contactform textarea{ width:100%; padding:12px 14px; border:2px solid var(--line-ink); border-radius:4px; background:var(--surface); color:var(--ink); font:inherit; font-size:14px; box-shadow:var(--stamp-sm); resize:vertical; }
@media (max-width:720px){ .cc-test-root .contactgrid{ grid-template-columns:1fr; } }
.cc-test-root .post__img{ aspect-ratio:auto !important; height:0 !important; padding-top:60% !important; position:relative !important; overflow:hidden !important; display:block !important; }
.cc-test-root .post__img img{ position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; }
.cc-test-root .gmain{ aspect-ratio:auto !important; display:block !important; height:0; padding-top:100%; position:relative; overflow:hidden; }
.cc-test-root .gmain img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cc-test-root .gmain > span{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); }
/* Buy More, Save More pair stepper in the cart drawer. */
.cc-test-root .ccps{ padding:14px 16px; background:color-mix(in srgb,var(--crimson) 7%,var(--surface)); border:2px solid var(--line-ink); border-radius:4px; margin-bottom:16px; box-shadow:var(--stamp-sm); }
.cc-test-root .ccps__msg{ display:flex; align-items:center; gap:7px; font-size:12.5px; line-height:1.35; }
.cc-test-root .ccps__spark{ color:var(--crimson); flex:0 0 auto; }
.cc-test-root .ccps__msg b{ font-weight:700; } .cc-test-root .ccps__msg .hi{ color:var(--crimson); font-weight:700; }
.cc-test-root .ccps__track{ position:relative; margin-top:14px; }
.cc-test-root .ccps__line{ position:absolute; left:10%; right:10%; top:9px; height:4px; border-radius:999px; background:var(--line); }
.cc-test-root .ccps__line span{ display:block; height:100%; border-radius:999px; background:var(--crimson); transition:width .35s var(--ease); }
.cc-test-root .ccps__dots{ position:relative; display:flex; justify-content:space-between; }
.cc-test-root .ccps__dot{ flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:center; gap:6px; background:none; border:0; padding:0; font:inherit; cursor:pointer; }
.cc-test-root .ccps__dot .d{ width:22px; height:22px; border-radius:50%; display:grid; place-items:center; background:var(--surface); border:2px solid var(--line); color:#fff; transition:.2s; }
.cc-test-root .ccps__dot.on .d{ background:var(--crimson); border-color:var(--crimson); }
.cc-test-root .ccps__dot.sel .d{ box-shadow:0 0 0 3px color-mix(in srgb,var(--crimson) 20%,transparent); }
.cc-test-root .ccps__dot .l{ font-family:"Space Mono",monospace; font-size:10.5px; font-weight:700; color:var(--ink); text-align:center; }
.cc-test-root .ccps__dot.on .l{ color:var(--crimson); }
.cc-test-root .ccps__dot .sv{ font-family:"Space Mono",monospace; font-size:9.5px; font-weight:700; color:var(--crimson); text-align:center; }
.cc-test-root .offerwrap{ display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 2px; }
.cc-test-root .offerwrap .chip{ font-size:11px; padding:6px 11px; cursor:pointer; }
/* PDP: let the grid columns shrink so the buy column (buttons, option rows)
   never overflows and gets clipped on mobile. */
.cc-test-root .pd{ min-width:0; }
.cc-test-root .pd > *{ min-width:0; }
.cc-test-root .buy{ min-width:0; }
.cc-test-root .gthumbs{ overflow-x:auto; }
.cc-test-root .optlabel{ gap:10px; }
.cc-test-root .optlabel span, .cc-test-root .optlabel a{ white-space:nowrap; }
.cc-test-root .mnav .brand .cc-logo{ height:30px; }
@media (max-width:860px){ .cc-test-root .cc-logo{ height:26px; } .cc-test-root footer.site .cc-logo{ height:30px; } }
@media (max-width:520px){
  .cc-test-root .sechead{ flex-direction:column; align-items:flex-start; }
  .cc-test-root .denoms{ gap:8px; }
  .cc-test-root .denom{ padding:8px 11px; flex:1 1 auto; }
}
/* The hero's decorative coin + floating chips are absolutely positioned and
   collide with the headline/pill on phones — drop them for a clean,
   headline-first hero (the copy, CTAs and stat tiles carry it). */
@media (max-width:600px){
  .cc-test-root .hero__art{ display:none; }
  .cc-test-root .hero .wrap{ grid-template-columns:1fr; padding-block:30px 44px; }
  .cc-test-root .hero .tagpill{ white-space:nowrap; }
}
/* The horizontal product rail's grid-auto-flow:column + 1fr sizing collapses on
   phones (card image box shrinks, cards overflow onto the next section). Render
   it as a normal 2-up grid on mobile instead. */
@media (max-width:700px){
  .cc-test-root .prail{ display:grid; grid-auto-flow:row; grid-auto-columns:auto; grid-template-columns:1fr 1fr; overflow:visible; }
  .cc-test-root .prail > *{ scroll-snap-align:none; }
}
@media (max-width:380px){
  .cc-test-root .prail{ grid-template-columns:1fr; }
}
@media (max-width:480px){
  .cc-test-root .nav{ gap:8px; height:60px; }
  .cc-test-root .nav__extra{ display:none; }
  .cc-test-root .ibtn{ width:40px; height:40px; }
  .cc-test-root .cc-logo{ height:24px; }
  .cc-test-root .cowrap{ gap:18px; }
  .cc-test-root .citem{ gap:12px; }
}
`;

export default function TestLayout({ children }) {
  const router = useRouter();
  const cart = useCart();
  const count = cartCount(cart);
  const wish = useWishlist();
  const wishN = wishCount(wish);
  const [drawer, setDrawer] = useState(false);
  const [mnav, setMnav] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  // In-drawer checkout (Morbix-style): 'cart' → 'checkout' → 'done'.
  const [step, setStep] = useState('cart');
  const [coupon, setCoupon] = useState(null);
  const [pay, setPay] = useState('cod');
  const [orderNo, setOrderNo] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderErr, setOrderErr] = useState('');
  const [offers, setOffers] = useState([]);
  const [tiersMap, setTiersMap] = useState({});
  const [suggested, setSuggested] = useState([]);
  const [offersOpen, setOffersOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [consent, setConsentUI] = useState({ analytics: true, marketing: true });
  const tt = useRef();

  const openCookie = () => { const c = getConsent(); setConsentUI({ analytics: c.analytics, marketing: c.marketing }); setCookieOpen(true); };
  const saveCookie = (vals, msg) => { try { setConsent(vals, { action: 'custom', source: 'preview' }); } catch (_) {} setConsentUI(vals); setCookieOpen(false); showToast(msg || 'Cookie preferences saved'); };
  const rootRef = useRef(null);
  const formRef = useRef(null);
  const promoRef = useRef(null);

  const openDrawer = () => { setStep('cart'); setDrawer(true); };

  // Inject the Mint design system CSS only while a /test page is mounted.
  useEffect(() => {
    const onToast = (e) => { setToastMsg(e.detail || ''); clearTimeout(tt.current); tt.current = setTimeout(() => setToastMsg(''), 1800); };
    const onOpen = () => { setStep('cart'); setDrawer(true); };
    window.addEventListener('cc-test-toast', onToast);
    window.addEventListener('cc-test-opencart', onOpen);
    return () => {
      window.removeEventListener('cc-test-toast', onToast);
      window.removeEventListener('cc-test-opencart', onOpen);
    };
  }, []);

  // Live coupons → tappable offers in the cart.
  useEffect(() => { let off = false; fetchCoupons().then((c) => { if (!off) setOffers(c); }).catch(() => {}); return () => { off = true; }; }, []);

  // Bundle tiers for EVERY distinct product in the cart → a Buy More, Save More
  // pair stepper on each line (Crosscoin moves every product in pairs).
  const cartIds = cart.map((i) => i.id).filter(Boolean).join(',');
  useEffect(() => {
    if (!drawer || !cartIds) return;
    let off = false;
    const ids = Array.from(new Set(cartIds.split(',')));
    Promise.all(ids.map((id) => fetchBundleTiers(id).then((t) => [id, t]).catch(() => [id, []])))
      .then((entries) => { if (!off) setTiersMap(Object.fromEntries(entries)); });
    return () => { off = true; };
  }, [drawer, cartIds]);

  // "Buy More, Save More" suggestions — products not already in the cart.
  useEffect(() => {
    if (!drawer || suggested.length) return;
    let off = false;
    fetchProducts({ limit: 10 }).then((list) => { if (!off) setSuggested(list); }).catch(() => {});
    return () => { off = true; };
  }, [drawer, suggested.length]);

  // Theme is scoped to the preview root (the dark CSS is .cc-test-root[data-theme]),
  // so toggle the attribute on the wrapper, not <html>.
  const toggleTheme = () => {
    const el = rootRef.current;
    if (!el) return;
    const cur = el.getAttribute('data-theme');
    const dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.setAttribute('data-theme', dark ? 'light' : 'dark');
  };

  const go = (href) => { setMnav(false); setDrawer(false); router.push(href); };

  const showToast = (m) => { setToastMsg(m); clearTimeout(tt.current); tt.current = setTimeout(() => setToastMsg(''), 1800); };

  // Order math (same rules as the live cart): free COD shipping ≥ ₹799, ₹30 COD
  // handling, prepaid ships free, coupon discount from live validation.
  const sub = cartSubtotal(cart);
  const disc = coupon ? Math.min(coupon.amount, sub) : 0;
  const afterDisc = Math.max(0, sub - disc);
  const ship = sub === 0 ? 0 : (pay === 'prepaid' ? 0 : (afterDisc >= FREE_SHIP ? 0 : 49));
  const cod = pay === 'cod' ? 30 : 0;
  const total = afterDisc + ship + cod;
  const need = Math.max(0, FREE_SHIP - afterDisc);
  // Total savings = MRP − price + coupon.
  const mrp = cart.reduce((s, i) => s + (i.was > i.unit ? i.was : i.unit) * i.qty, 0);
  const youSave = Math.max(0, mrp - sub) + disc;

  // Set a line to a pair tier (Buy More, Save More) — qty becomes the pair count.
  const setLinePairs = (key, pairs, total0) => {
    setLinePack(key, { qty: pairs, unit: Math.round(total0 / pairs), packq: pairs, pack: pairs === 1 ? 'Single' : `${pairs} Pairs` });
  };

  const applyPromo = async (codeArg) => {
    const v = (typeof codeArg === 'string' ? codeArg : (promoRef.current?.value || '')).trim().toUpperCase();
    if (!v) return;
    const res = await validateCouponReal(v, sub, pay);
    if (res.ok) { setCoupon({ id: res.id, code: res.code, amount: res.amount }); showToast(`${res.code} applied — ${inr(res.amount)} off`); }
    else { setCoupon(null); showToast(res.message || 'Invalid code'); }
  };
  // Real order placement (guest). COD creates the order directly; prepaid opens
  // real Razorpay and the order is created server-side on successful verify.
  const placeOrder = async () => {
    if (placing) return;
    if (!formRef.current || !formRef.current.reportValidity()) return;
    const fd = new FormData(formRef.current);
    const form = {
      name: (fd.get('name') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      phone: (fd.get('phone') || '').toString().trim(),
      addr: (fd.get('addr') || '').toString().trim(),
      city: (fd.get('city') || '').toString().trim(),
      state: (fd.get('state') || '').toString().trim(),
      pin: (fd.get('pin') || '').toString().trim(),
    };
    setOrderErr(''); setPlacing(true);
    const done = (no) => { setOrderNo(no); setStep('done'); clearCart(); setCoupon(null); setPlacing(false); };
    const fail = (msg) => { setOrderErr(msg || 'Something went wrong. Please try again.'); setPlacing(false); };
    try {
      if (pay === 'prepaid') {
        await placePrepaidGuest({
          cart, form, couponId: coupon?.id || null, discount: disc,
          onSuccess: (no) => done(no),
          onFail: (msg) => fail(msg),
          onDismiss: () => setPlacing(false),
        });
      } else {
        const r = await placeCodGuest({ cart, form, couponId: coupon?.id || null, discount: disc });
        if (r.ok) done(r.orderNo); else fail(r.raw?.message || 'Order could not be placed.');
      }
    } catch (e) {
      fail(e?.message || e?.toString?.() || 'Order could not be placed.');
    }
  };

  const navLinks = (
    <>
      <Link href="/test/shop" onClick={() => setMnav(false)}>Shop</Link>
      <Link href="/test/collections" onClick={() => setMnav(false)}>Collections</Link>
      <Link href="/test/journal" onClick={() => setMnav(false)}>Journal</Link>
      <Link href="/test/about" onClick={() => setMnav(false)}>About</Link>
      <Link href="/test/contact" onClick={() => setMnav(false)}>Contact</Link>
      <Link href="/test/wishlist" onClick={() => setMnav(false)}>Wishlist</Link>
      <Link href="/test#faq" onClick={() => setMnav(false)}>Help</Link>
    </>
  );

  return (
    <div className="cc-test-root" ref={rootRef}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" />
      </Head>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: MINT_CSS }} />
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />

      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          {[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}&nbsp;&nbsp;·&nbsp;&nbsp;</span>)}
        </div>
      </div>

      <header className="site">
        <div className="wrap nav">
          <Link href="/test" className="brand" aria-label="CrossCoin home"><img className="cc-logo" src={LOGO} alt="CrossCoin" /></Link>
          <nav className="nav__links">{navLinks}</nav>
          <div className="nav__act">
            <button className="ibtn" onClick={toggleTheme} aria-label="Theme">{I.sun()}</button>
            <span className="nav__extra">
              <button className="ibtn" aria-label="Search" onClick={() => go('/test/search')}>{I.search()}</button>
              <button className="ibtn" aria-label="Wishlist" onClick={() => go('/test/wishlist')}>{I.heart(20)}{wishN > 0 && <span className="badge-dot">{wishN}</span>}</button>
              <button className="ibtn" aria-label="Account" onClick={() => go('/test/account')}>{I.user()}</button>
            </span>
            <button className="ibtn" aria-label="Cart" onClick={openDrawer}>{I.cart()}<span className="badge-dot">{count}</span></button>
            <button className="ibtn burger" aria-label="Menu" onClick={() => setMnav(true)}>{I.menu()}</button>
          </div>
        </div>
      </header>

      <div className={`mnav${mnav ? ' on' : ''}`}>
        <div className="nav" style={{ height: 'auto', justifyContent: 'space-between' }}>
          <span className="brand"><img className="cc-logo" src={LOGO} alt="CrossCoin" /></span>
          <button className="ibtn" onClick={() => setMnav(false)} aria-label="Close">{I.close()}</button>
        </div>
        {navLinks}
      </div>

      {children}

      <footer className="site">
        <div className="wrap foot">
          <div className="ab">
            <span className="brand"><img className="cc-logo" src={LOGO} alt="CrossCoin" /></span>
            <p style={{ marginTop: 13 }}>Premium quality socks designed for comfort and style. Join our community for exclusive deals.</p>
            <div className="soc">
              <a href="https://www.facebook.com/people/Cross-Coin/61577195743730/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z"/></svg></a>
              <a href="https://www.instagram.com/crosscoin99/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
              <a href="https://wa.me/917434834000" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"/></svg></a>
            </div>
          </div>
          <div><h4>Quick Links</h4><a onClick={() => go('/test/shop')}>All Products</a><a onClick={() => go('/test/collections')}>Collections</a><a onClick={() => go('/test/journal')}>Journal</a><a onClick={() => go('/test/about')}>About Us</a><a onClick={() => go('/test/contact')}>Contact</a></div>
          <div><h4>Account</h4><a onClick={() => go('/test/track')}>Track Order</a><a onClick={() => go('/test/wishlist')}>Wishlist</a><a onClick={() => go('/test/search')}>Search</a><a onClick={() => go('/test/shop')}>Shop</a></div>
          <div><h4>Policies</h4><a onClick={() => go('/test/policy/privacy-policy')}>Privacy Policy</a><a onClick={() => go('/test/contact')}>Grievance</a><a onClick={() => go('/test/policy/terms-and-conditions')}>Terms &amp; Conditions</a><a onClick={() => go('/test/policy/shipping-policy')}>Shipping Policy</a><a onClick={() => go('/test/policy/cancellation-and-refund')}>Cancellation &amp; Refund</a><a onClick={openCookie}>Cookie Settings</a></div>
        </div>
        <div className="wrap" style={{ paddingBottom: 18 }}>
          <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 12, color: 'var(--ink-soft)' }}>
            Contact: <a href="tel:+919712891700" style={{ color: 'var(--crimson)' }}>+91 97128 91700</a> · <a href="mailto:obzusindia@gmail.com" style={{ color: 'var(--crimson)' }}>obzusindia@gmail.com</a>
          </div>
        </div>
        <div className="wrap footend">
          <span>© {new Date().getFullYear()} CROSSCOIN. All rights reserved. · MADE IN INDIA 🇮🇳</span>
          <span>Made with ❤ by <a href="https://finvera.solutions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--crimson)' }}>Finvera.solutions</a></span>
        </div>
      </footer>

      {/* cart drawer — full cart + 2-step checkout, Morbix-style */}
      <div className={`scrim${drawer ? ' on' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`drawer${drawer ? ' on' : ''}`} aria-label="Cart">
        <div className="drawer__h">
          <b>{step === 'done' ? 'Order confirmed' : step === 'checkout' ? 'Checkout · delivery & payment' : `Your cart (${count})`}</b>
          <button className="ibtn" onClick={() => setDrawer(false)} aria-label="Close">{I.close()}</button>
        </div>

        {step === 'cart' && (<>
          <div className="drawer__body">
            {cart.length === 0 ? (
              <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12.5, padding: '30px 0', textAlign: 'center' }}>Your cart is empty.</p>
            ) : (<>
              {/* free-shipping progress bar */}
              <div className="mono" style={{ fontSize: 11, color: need > 0 ? 'var(--ink-soft)' : 'var(--crimson)', fontWeight: need > 0 ? 400 : 700, marginBottom: 6 }}>
                {need > 0 ? `Add ${inr(need)} more for FREE shipping` : 'You’ve unlocked FREE shipping ✓'}
              </div>
              <div className="freebar" style={{ marginBottom: 14 }}><span style={{ width: `${Math.min(100, (afterDisc / FREE_SHIP) * 100)}%` }} /></div>

              {/* ONE pair stepper at the top (group-level), like Morbix */}
              {(() => {
                const topLine = cart.find((i) => tiersMap[i.id] && tiersMap[i.id].length > 0);
                return topLine ? <CartPairStepper item={topLine} tiers={tiersMap[topLine.id]} onSet={(p, t) => setLinePairs(topLine.key, p, t)} /> : null;
              })()}

              <div className="citem-sec-title mono">Items</div>
              {cart.map((i) => {
                const hasTiers = !!(tiersMap[i.id] && tiersMap[i.id].length > 0);
                const off = i.was > i.unit ? Math.round((1 - i.unit / i.was) * 100) : 0;
                return (
                  <div className="citem" key={i.key}>
                    <div className="citem__th"><Thumb src={i.img} color={i.color} /></div>
                    <div className="citem__main">
                      <div className="citem__top">
                        <span className="citem__nm">{i.name}</span>
                        <button className="citem__rm" onClick={() => { removeItem(i.key); showToast('Removed'); }} aria-label="Remove">{I.trash(16)}</button>
                      </div>
                      <div className="citem__var">{i.color || i.brand}{((hasTiers && i.qty > 1) || i.packq > 1) ? <span className="packchip">{(hasTiers ? i.qty : i.packq)}-pair pack</span> : (i.size ? ` · ${i.size}` : '')}</div>
                      <div className="citem__bot">
                        <div className="citem__pr"><b>{inr(i.unit)}{hasTiers ? <span className="citem__per"> / pair</span> : null}</b>{i.was > i.unit && <s>{inr(i.was)}</s>}{off > 0 && <em>{off}% off</em>}</div>
                        <div className="qty citem__qty">
                          <button onClick={() => changeQty(i.key, -1)} aria-label={hasTiers ? 'One pair fewer' : 'One fewer'}>−</button>
                          <span>{hasTiers ? `${i.qty} pr` : i.qty}</span>
                          <button onClick={() => changeQty(i.key, 1)} aria-label={hasTiers ? 'One more pair' : 'One more'}>+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Buy More, Save More — add another product to build toward a pack */}
              {(() => {
                const inCart = new Set(cart.map((i) => String(i.id)));
                const rows = suggested.filter((p) => !inCart.has(String(p.id))).slice(0, 8);
                if (rows.length === 0) return null;
                return (
                  <div className="bms">
                    <div className="bms__h mono">✦ Buy more, save more — add one &amp; unlock bundle prices</div>
                    <div className="bms__scroll">
                      {rows.map((p) => {
                        const v = (p.variants || []).find((x) => x.pairs === 1) || (p.variants || [])[0] || null;
                        const save = p.was > p.now ? Math.round(p.was - p.now) : 0;
                        return (
                          <div className="bms__card" key={p.id}>
                            <div className="bms__img">{p.img ? <img src={p.img} alt="" loading="lazy" /> : <Thumb color={p.colors?.[0]?.name} />}</div>
                            <div className="bms__info">
                              <div className="bms__nm">{p.name}</div>
                              <div className="bms__pr"><b>{inr(p.now)}</b>{p.was > p.now && <s>{inr(p.was)}</s>}{save > 0 && <em>Save {inr(save)}</em>}</div>
                            </div>
                            <button className="bms__add" aria-label={`Add ${p.name}`} onClick={() => { addItem({ id: p.id, vid: v?.id || null, name: p.name, brand: p.brand, color: p.colors?.[0]?.name || '', size: v?.size || p.sizes?.[0] || '', pack: v?.label || 'Single', packq: v?.pairs || 1, unit: v?.price || p.now, was: v?.comparePrice || p.was, base: v?.price || p.now, img: p.img }, 1); showToast('Added ✓'); }}>+ Add</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {coupon ? (
                <div className="coupon-applied" style={{ marginTop: 14 }}><span>✓ {coupon.code} · −{inr(disc)}</span><button className="x" style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer' }} onClick={() => setCoupon(null)}>✕</button></div>
              ) : (<>
                <div className="couponrow"><input ref={promoRef} placeholder="Coupon code" aria-label="Coupon code" /><button className="couponrow__btn" onClick={() => applyPromo()}>Apply</button></div>
                {offers.length > 0 && (
                  <div className="bestoffer">
                    <span className="bestoffer__ic">✦</span>
                    <div className="bestoffer__t"><b>Apply {offers[0].code} — {offers[0].label}</b><span>Best offer for your cart</span></div>
                    <button className="bestoffer__btn" onClick={() => applyPromo(offers[0].code)}>APPLY</button>
                  </div>
                )}
                {offers.length > 1 && (<>
                  <button className="seeoffers" onClick={() => setOffersOpen((o) => !o)}>See all {offers.length} offers <span>{offersOpen ? '▲' : '▾'}</span></button>
                  {offersOpen && (
                    <div className="offerlist">
                      {offers.slice(1).map((o) => (
                        <div className="offerlist__row" key={o.code}><div><b>{o.code}</b> · {o.label}{o.min ? ` · min ${inr(o.min)}` : ''}</div><button onClick={() => applyPromo(o.code)}>Apply</button></div>
                      ))}
                    </div>
                  )}
                </>)}
              </>)}
            </>)}
          </div>
          <div className="drawer__foot">
            <div className="srow" style={{ padding: '4px 0' }}><span>Subtotal</span><span>{inr(sub)}</span></div>
            {coupon && disc > 0 && <div className="srow" style={{ padding: '4px 0' }}><span>Discount ({coupon.code})</span><span style={{ color: 'var(--crimson)' }}>−{inr(disc)}</span></div>}
            {youSave > 0 && <div className="srow" style={{ padding: '4px 0', color: 'var(--crimson)', fontWeight: 700 }}><span>You save</span><span>{inr(youSave)}</span></div>}
            <div className="srow total" style={{ marginTop: 4, marginBottom: 12 }}><span>Total</span><span>{inr(total)}</span></div>
            <button className="btn btn--crimson btn--block btn--lg" disabled={!cart.length} onClick={() => setStep('checkout')}>Proceed to checkout · {inr(total)}</button>
            <div className="cotrust"><span>{I.shield(14)} Secure</span><span>{I.ret(14)} Easy returns</span><span>{I.cart(14)} Razorpay</span></div>
          </div>
        </>)}

        {step === 'checkout' && (<>
          <div className="drawer__body">
            <button type="button" className="coback" onClick={() => setStep('cart')} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontFamily: '"Space Mono",monospace', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>{I.arrow(14)} Back to cart</button>
            <form ref={formRef}>
              <div className="optlabel">Delivery details</div>
              <div className="ffield"><label>Full name</label><input name="name" required placeholder="Aarav Sharma" /></div>
              <div className="frow"><div className="ffield"><label>Email</label><input name="email" required type="email" inputMode="email" placeholder="you@email.com" /></div><div className="ffield"><label>Phone</label><input name="phone" required inputMode="tel" placeholder="9876543210" /></div></div>
              <div className="ffield"><label>Address</label><input name="addr" required placeholder="Flat, street, area" /></div>
              <div className="frow"><div className="ffield"><label>City</label><input name="city" required placeholder="Mumbai" /></div><div className="ffield"><label>State</label><input name="state" required placeholder="Maharashtra" /></div></div>
              <div className="ffield"><label>Pincode</label><input name="pin" required inputMode="numeric" placeholder="400001" /></div>
              <div className="optlabel">Payment</div>
              <div className="pay">
                <label className={`payopt${pay === 'cod' ? ' on' : ''}`} onClick={() => setPay('cod')}>
                  <span className="radio" /><span className="pi">{I.card(20)}</span>
                  <span><b>Cash on Delivery</b><span className="d">Pay in cash when it arrives</span></span><span className="tag">POPULAR</span>
                </label>
                <label className={`payopt${pay === 'prepaid' ? ' on' : ''}`} onClick={() => setPay('prepaid')}>
                  <span className="radio" /><span className="pi">{I.shield(20)}</span>
                  <span><b>Pay online (UPI / Card)</b><span className="d">GPay, PhonePe, cards &amp; net-banking</span></span>
                </label>
              </div>
            </form>
          </div>
          <div className="drawer__foot">
            <div className="srow" style={{ padding: '3px 0' }}><span>Subtotal</span><span>{inr(sub)}</span></div>
            {coupon && disc > 0 && <div className="srow" style={{ padding: '3px 0' }}><span>Discount ({coupon.code})</span><span style={{ color: 'var(--crimson)' }}>−{inr(disc)}</span></div>}
            <div className="srow" style={{ padding: '3px 0' }}><span>Shipping</span><span>{ship === 0 ? 'FREE' : inr(ship)}</span></div>
            {cod > 0 && <div className="srow" style={{ padding: '3px 0' }}><span>COD handling</span><span>{inr(cod)}</span></div>}
            <div className="srow total" style={{ marginTop: 4, marginBottom: 12 }}><span>Total</span><span>{inr(total)}</span></div>
            {orderErr && <div className="mono" style={{ color: 'var(--crimson)', fontSize: 12, marginBottom: 10 }}>{orderErr}</div>}
            <button className="btn btn--crimson btn--block btn--lg" onClick={placeOrder} disabled={placing || !cart.length}>
              {placing ? 'Placing…' : (pay === 'prepaid' ? `Pay ${inr(total)}` : `Place order · ${inr(total)}`)}
            </button>
            <p className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', textAlign: 'center', margin: '9px 0 0' }}>Preview checkout — places a real order (tagged TEST PREVIEW).</p>
          </div>
        </>)}

        {step === 'done' && (
          <div className="drawer__body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="cosuccess">
              <div className="seal">{I.check(40)}</div>
              <h3 style={{ fontSize: 22 }}>Order placed!</h3>
              <p className="muted" style={{ margin: '8px 0 2px' }}>Order <b className="mono">{orderNo}</b> is confirmed.</p>
              <p className="muted mono" style={{ fontSize: 12 }}>{pay === 'cod' ? 'Cash on Delivery · pay when it arrives' : 'Paid online · prepaid'}</p>
              <button className="btn btn--crimson btn--lg" style={{ marginTop: 18 }} onClick={() => setDrawer(false)}>Continue shopping</button>
            </div>
          </div>
        )}
      </aside>

      {/* Cookie preferences — real consent (DPDP) like the live site */}
      <div className={`scrim${cookieOpen ? ' on' : ''}`} onClick={() => setCookieOpen(false)} />
      <div className={`ckmodal${cookieOpen ? ' on' : ''}`} role="dialog" aria-label="Cookie settings" aria-modal="true">
        <div className="ckmodal__h"><b>Cookie preferences</b><button className="ibtn" onClick={() => setCookieOpen(false)} aria-label="Close">{I.close()}</button></div>
        <p className="ckmodal__intro">We use cookies to run the store and, with your consent, to understand usage and show relevant offers. You can change this anytime.</p>
        <div className="ckrow"><div><b>Strictly necessary</b><span>Required for the cart, checkout and security.</span></div><span className="ckon">Always on</span></div>
        <label className="ckrow"><div><b>Analytics</b><span>Helps us understand what’s working.</span></div><input type="checkbox" checked={consent.analytics} onChange={(e) => setConsentUI((c) => ({ ...c, analytics: e.target.checked }))} /></label>
        <label className="ckrow"><div><b>Marketing</b><span>Lets us show relevant offers.</span></div><input type="checkbox" checked={consent.marketing} onChange={(e) => setConsentUI((c) => ({ ...c, marketing: e.target.checked }))} /></label>
        <div className="ckmodal__btns">
          <button className="btn" onClick={() => saveCookie({ analytics: false, marketing: false }, 'Only necessary cookies kept')}>Reject all</button>
          <button className="btn" onClick={() => saveCookie(consent, 'Cookie preferences saved')}>Save choices</button>
          <button className="btn btn--crimson" onClick={() => saveCookie({ analytics: true, marketing: true }, 'All cookies accepted')}>Accept all</button>
        </div>
      </div>

      <div id="toast" className={toastMsg ? 'on' : ''}>{toastMsg}</div>
    </div>
  );
}
