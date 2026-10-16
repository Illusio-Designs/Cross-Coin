import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { MINT_CSS } from './mintCss';
import { useCart, cartCount, cartSubtotal, changeQty } from './store';
import { I, Thumb } from './ui';
import { inr } from './data';

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
  const tt = useRef();
  const rootRef = useRef(null);

  // Inject the Mint design system CSS only while a /test page is mounted.
  // Theme toggle writes data-theme on <html>; cleaned up on unmount.
  useEffect(() => {
    const onToast = (e) => { setToastMsg(e.detail || ''); clearTimeout(tt.current); tt.current = setTimeout(() => setToastMsg(''), 1800); };
    const onOpen = () => setDrawer(true);
    window.addEventListener('cc-test-toast', onToast);
    window.addEventListener('cc-test-opencart', onOpen);
    return () => {
      window.removeEventListener('cc-test-toast', onToast);
      window.removeEventListener('cc-test-opencart', onOpen);
    };
  }, []);

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
            <button className="ibtn" aria-label="Cart" onClick={() => setDrawer(true)}>{I.cart()}<span className="badge-dot">{count}</span></button>
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

      {/* cart drawer */}
      <div className={`scrim${drawer ? ' on' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`drawer${drawer ? ' on' : ''}`} aria-label="Cart">
        <div className="drawer__h"><b>Your cart ({count})</b><button className="ibtn" onClick={() => setDrawer(false)} aria-label="Close">{I.close()}</button></div>
        <div className="drawer__body">
          {cart.length === 0
            ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12.5, padding: '30px 0', textAlign: 'center' }}>Your cart is empty.</p>
            : cart.map((i) => (
              <div className="ditem" key={i.key}>
                <div className="th" style={{ overflow: 'hidden' }}><Thumb src={i.img} color={i.color} /></div>
                <div>
                  <h4>{i.name}</h4>
                  <div className="m">{i.brand} · {i.color} · {i.size}{i.packq > 1 ? ` · ${i.pack}` : ''}</div>
                  <div className="qty" style={{ marginTop: 6, boxShadow: 'none' }}>
                    <button onClick={() => changeQty(i.key, -1)} style={{ width: 30, height: 30 }}>−</button>
                    <span style={{ width: 34 }}>{i.qty}</span>
                    <button onClick={() => changeQty(i.key, 1)} style={{ width: 30, height: 30 }}>+</button>
                  </div>
                </div>
                <div className="lp">{inr(i.unit * i.qty)}</div>
              </div>
            ))}
        </div>
        <div className="drawer__foot">
          <div className="srow total" style={{ border: 'none', padding: '0 0 12px' }}><span>Subtotal</span><span>{inr(cartSubtotal(cart))}</span></div>
          <button className="btn btn--crimson btn--block btn--lg" onClick={() => go('/test/cart')}>View cart &amp; checkout</button>
        </div>
      </aside>

      <div id="toast" className={toastMsg ? 'on' : ''}>{toastMsg}</div>
    </div>
  );
}
