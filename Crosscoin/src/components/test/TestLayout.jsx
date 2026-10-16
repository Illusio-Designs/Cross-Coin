import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { MINT_CSS } from './mintCss';
import { useCart, cartCount, cartSubtotal, changeQty, removeItem, clearCart, setLinePack } from './store';
import { I, Thumb } from './ui';
import { inr } from './data';
import { validateCouponReal, fetchBundleTiers, fetchCoupons } from './real';

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
      <div className="ccps__msg"><span style={{ color: 'var(--crimson)' }}>✦</span>
        <span>{next
          ? <>Add <b>{next.pairs - q} pair{next.pairs - q > 1 ? 's' : ''}</b> → {next.pairs}-pack{savedFor(next.pairs, next.price) > 0 ? <>, <span className="hi">save {inr(savedFor(next.pairs, next.price))}</span></> : ''}</>
          : <span className="hi">🎉 Best value — {maxP}-pack applied!</span>}</span>
      </div>
      <div className="ccps__track">
        <div className="ccps__base" /><div className="ccps__fill" style={{ width: `calc(86% * ${fillPct / 100})` }} />
        {ms.map((m, i) => {
          const pct = n > 1 ? 7 + (i / (n - 1)) * 86 : 50;
          const on = q >= m.pairs; const sel = q === m.pairs; const sv = m.pairs > 1 ? savedFor(m.pairs, m.total) : 0;
          return (
            <button type="button" key={i} className={`ccps__dot${on ? ' on' : ''}${sel ? ' sel' : ''}`} style={{ left: `${pct}%` }} onClick={() => onSet(m.pairs, m.total)}>
              <span className="d">{on ? I.check(11) : ''}</span>
              <span className="l">{m.pairs} Pair{m.pairs > 1 ? 's' : ''}</span>
              {sv > 0 ? <span className="sv">save {inr(sv)}</span> : null}
            </button>
          );
        })}
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
.cc-test-root .revscroll{ overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent); mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent); }
.cc-test-root .revscroll__track{ display:flex; gap:16px; width:max-content; padding:4px 16px; animation:ccRevScroll 46s linear infinite; }
.cc-test-root .revscroll:hover .revscroll__track{ animation-play-state:paused; }
.cc-test-root .revscroll .rev{ width:330px; flex:0 0 auto; }
@keyframes ccRevScroll{ from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
@media (prefers-reduced-motion: reduce){ .cc-test-root .revscroll__track{ animation:none; } }
@media (max-width:520px){ .cc-test-root .revscroll .rev{ width:80vw; } }
/* iOS Safari collapses aspect-ratio boxes that contain percentage-height media,
   which made product/journal/gallery image boxes shrink to ~0 and the cards
   float over the next section. Use a robust padding-top ratio box with
   absolutely-filled media instead (applies at all widths). */
.cc-test-root .card__img{ aspect-ratio:auto !important; display:block !important; height:0; padding-top:100%; position:relative; overflow:hidden; }
.cc-test-root .card__img img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cc-test-root .card__img .mint{ left:20%; top:20%; }
.cc-test-root .post__img{ aspect-ratio:auto !important; height:0; padding-top:62%; position:relative; overflow:hidden; }
.cc-test-root .post__img img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cc-test-root .gmain{ aspect-ratio:auto !important; display:block !important; height:0; padding-top:100%; position:relative; overflow:hidden; }
.cc-test-root .gmain img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cc-test-root .gmain > span{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); }
/* Buy More, Save More pair stepper in the cart drawer. */
.cc-test-root .ccps{ padding:13px 15px; background:color-mix(in srgb,var(--crimson) 8%,var(--surface)); border:2px solid var(--line-ink); border-radius:6px; margin-bottom:14px; box-shadow:var(--stamp-sm); }
.cc-test-root .ccps__msg{ display:flex; align-items:center; gap:7px; font-size:12.5px; line-height:1.35; }
.cc-test-root .ccps__msg b{ font-weight:700; } .cc-test-root .ccps__msg .hi{ color:var(--crimson); font-weight:700; }
.cc-test-root .ccps__track{ position:relative; height:52px; margin-top:12px; }
.cc-test-root .ccps__base{ position:absolute; left:7%; right:7%; top:8px; height:4px; border-radius:999px; background:var(--line); }
.cc-test-root .ccps__fill{ position:absolute; left:7%; top:8px; height:4px; border-radius:999px; background:var(--crimson); transition:width .35s var(--ease); }
.cc-test-root .ccps__dot{ position:absolute; top:0; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; width:72px; background:none; border:0; padding:0; font:inherit; cursor:pointer; }
.cc-test-root .ccps__dot .d{ width:18px; height:18px; border-radius:50%; display:grid; place-items:center; background:var(--surface); border:2px solid var(--line); color:#fff; transition:.2s; }
.cc-test-root .ccps__dot.on .d{ background:var(--crimson); border-color:var(--crimson); }
.cc-test-root .ccps__dot.sel .d{ box-shadow:0 0 0 3px color-mix(in srgb,var(--crimson) 18%,transparent); }
.cc-test-root .ccps__dot .l{ font-family:"Space Mono",monospace; font-size:10px; font-weight:700; margin-top:6px; white-space:nowrap; color:var(--ink); }
.cc-test-root .ccps__dot.on .l{ color:var(--crimson); }
.cc-test-root .ccps__dot .sv{ font-family:"Space Mono",monospace; font-size:9.5px; font-weight:700; color:var(--crimson); margin-top:1px; white-space:nowrap; }
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
  const [drawer, setDrawer] = useState(false);
  const [mnav, setMnav] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  // In-drawer checkout (Morbix-style): 'cart' → 'checkout' → 'done'.
  const [step, setStep] = useState('cart');
  const [coupon, setCoupon] = useState(null);
  const [pay, setPay] = useState('cod');
  const [orderNo, setOrderNo] = useState('');
  const [offers, setOffers] = useState([]);
  const [primTiers, setPrimTiers] = useState([]);
  const tt = useRef();
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

  // Bundle tiers for the primary cart line → the Buy More, Save More stepper.
  const primId = cart[0]?.id;
  useEffect(() => {
    if (!drawer || !primId) { setPrimTiers([]); return; }
    let off = false;
    fetchBundleTiers(primId).then((t) => { if (!off) setPrimTiers(t); }).catch(() => {});
    return () => { off = true; };
  }, [drawer, primId]);

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

  const setPrimaryPairs = (pairs, total0) => {
    const i = cart[0]; if (!i) return;
    setLinePack(i.key, { qty: pairs, unit: Math.round(total0 / pairs), packq: pairs, pack: pairs === 1 ? 'Single' : `${pairs} Pairs` });
  };

  const applyPromo = async (codeArg) => {
    const v = (typeof codeArg === 'string' ? codeArg : (promoRef.current?.value || '')).trim().toUpperCase();
    if (!v) return;
    const res = await validateCouponReal(v, sub, pay);
    if (res.ok) { setCoupon({ code: res.code, amount: res.amount }); showToast(`${res.code} applied — ${inr(res.amount)} off`); }
    else { setCoupon(null); showToast(res.message || 'Invalid code'); }
  };
  const placeOrder = () => {
    if (!formRef.current || !formRef.current.reportValidity()) return;
    setOrderNo('#CC-' + String(Math.floor(10000 + Math.random() * 89999)));
    setStep('done'); clearCart(); setCoupon(null);
  };

  const navLinks = (
    <>
      <Link href="/test/shop" onClick={() => setMnav(false)}>Shop</Link>
      <Link href="/test/shop" onClick={() => setMnav(false)}>Socks</Link>
      <Link href="/test/shop" onClick={() => setMnav(false)}>Knitwear</Link>
      <Link href="/test#journal" onClick={() => setMnav(false)}>Journal</Link>
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
              <button className="ibtn" aria-label="Search">{I.search()}</button>
              <button className="ibtn" aria-label="Account">{I.user()}</button>
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
          <div><h4>Quick Links</h4><a onClick={() => go('/test/shop')}>All Products</a><a onClick={() => go('/test/shop')}>Collections</a><a onClick={() => go('/test#journal')}>Journal</a><a href="https://www.crosscoin.in/About" target="_blank" rel="noopener noreferrer">About Us</a></div>
          <div><h4>Account</h4><a href="https://www.crosscoin.in/profile" target="_blank" rel="noopener noreferrer">My Account</a><a href="https://www.crosscoin.in/OrderTracking" target="_blank" rel="noopener noreferrer">Track Order</a><a href="https://www.crosscoin.in/Wishlist" target="_blank" rel="noopener noreferrer">Wishlist</a></div>
          <div><h4>Policies</h4><a href="https://www.crosscoin.in/policy/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a><a href="https://www.crosscoin.in/policy/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a><a href="https://www.crosscoin.in/policy/shipping-policy" target="_blank" rel="noopener noreferrer">Shipping Policy</a><a href="https://www.crosscoin.in/policy/cancellation-and-refund" target="_blank" rel="noopener noreferrer">Cancellation &amp; Refund</a></div>
        </div>
        <div className="wrap" style={{ paddingBottom: 18 }}>
          <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 12, color: 'var(--ink-soft)' }}>
            Contact: <a href="tel:+919712891700" style={{ color: 'var(--crimson)' }}>+91 97128 91700</a> · <a href="mailto:obzusindia@gmail.com" style={{ color: 'var(--crimson)' }}>obzusindia@gmail.com</a>
          </div>
        </div>
        <div className="wrap footend"><span>© {new Date().getFullYear()} CROSSCOIN. All rights reserved.</span><span>PRIVACY · TERMS · MADE IN INDIA 🇮🇳</span></div>
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

              {/* Buy More, Save More pair stepper for the primary product */}
              {primTiers.length > 0 && cart[0] && (
                <CartPairStepper item={cart[0]} tiers={primTiers} onSet={setPrimaryPairs} />
              )}

              {cart.map((i) => (
                <div className="ditem" key={i.key}>
                  <div className="th" style={{ overflow: 'hidden' }}><Thumb src={i.img} color={i.color} /></div>
                  <div>
                    <h4>{i.name}</h4>
                    <div className="m">{i.brand} · {i.color || '—'} · {i.size || 'OS'}{i.packq > 1 ? ` · ${i.pack}` : ''}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <div className="qty" style={{ boxShadow: 'none' }}>
                        <button onClick={() => changeQty(i.key, -1)} style={{ width: 30, height: 30 }}>−</button>
                        <span style={{ width: 34 }}>{i.qty}</span>
                        <button onClick={() => changeQty(i.key, 1)} style={{ width: 30, height: 30 }}>+</button>
                      </div>
                      <button className="rm" onClick={() => { removeItem(i.key); showToast('Removed'); }} style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', fontFamily: '"Space Mono",monospace', fontSize: 11, cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                  <div className="lp" style={{ textAlign: 'right' }}>
                    {inr(i.unit * i.qty)}
                    {i.was > i.unit && <div style={{ fontFamily: '"Space Mono",monospace', fontSize: 11, color: 'var(--ink-faint)', textDecoration: 'line-through', fontWeight: 400 }}>{inr(i.was * i.qty)}</div>}
                  </div>
                </div>
              ))}

              {/* tappable live offers */}
              {!coupon && offers.length > 0 && (
                <div className="offerwrap">
                  {offers.slice(0, 4).map((o) => (
                    <button key={o.code} className="chip" onClick={() => applyPromo(o.code)}>{o.code} · {o.label}</button>
                  ))}
                </div>
              )}
              {coupon ? (
                <div className="coupon-applied" style={{ marginTop: 14 }}><span>✓ {coupon.code} · −{inr(disc)}</span><button className="x" style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer' }} onClick={() => setCoupon(null)}>✕</button></div>
              ) : (
                <div className="promo" style={{ marginTop: 14 }}><input ref={promoRef} placeholder="PROMO CODE" /><button className="btn" onClick={() => applyPromo()}>Apply</button></div>
              )}
            </>)}
          </div>
          <div className="drawer__foot">
            <div className="srow" style={{ padding: '4px 0' }}><span>Subtotal</span><span>{inr(sub)}</span></div>
            {coupon && disc > 0 && <div className="srow" style={{ padding: '4px 0' }}><span>Discount ({coupon.code})</span><span style={{ color: 'var(--crimson)' }}>−{inr(disc)}</span></div>}
            {youSave > 0 && <div className="srow" style={{ padding: '4px 0', color: 'var(--crimson)', fontWeight: 700 }}><span>You save</span><span>{inr(youSave)}</span></div>}
            <div className="srow total" style={{ marginTop: 4, marginBottom: 12 }}><span>Total</span><span>{inr(total)}</span></div>
            <button className="btn btn--crimson btn--block btn--lg" disabled={!cart.length} onClick={() => setStep('checkout')}>Proceed to checkout</button>
          </div>
        </>)}

        {step === 'checkout' && (<>
          <div className="drawer__body">
            <button type="button" className="coback" onClick={() => setStep('cart')} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontFamily: '"Space Mono",monospace', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>{I.arrow(14)} Back to cart</button>
            <form ref={formRef}>
              <div className="optlabel">Delivery details</div>
              <div className="ffield"><label>Full name</label><input name="name" required placeholder="Aarav Sharma" /></div>
              <div className="ffield"><label>Phone</label><input name="phone" required inputMode="tel" placeholder="+91 98765 43210" /></div>
              <div className="ffield"><label>Address</label><input name="addr" required placeholder="Flat, street, area" /></div>
              <div className="frow"><div className="ffield"><label>City</label><input name="city" required placeholder="Mumbai" /></div><div className="ffield"><label>Pincode</label><input name="pin" required inputMode="numeric" placeholder="400001" /></div></div>
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
            <button className="btn btn--crimson btn--block btn--lg" onClick={placeOrder}>Place order · {inr(total)}</button>
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

      <div id="toast" className={toastMsg ? 'on' : ''}>{toastMsg}</div>
    </div>
  );
}
