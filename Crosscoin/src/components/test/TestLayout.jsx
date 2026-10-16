import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { MINT_CSS } from './mintCss';
import { useCart, cartCount, cartSubtotal, changeQty } from './store';
import { I, Thumb } from './ui';
import { inr } from './data';

const TICKER = ['CROSSCOIN ESSENTIALS', 'FREE SHIP ₹799+', 'CODE CROSS10 −10%', 'RETURNS 7-DAY', 'COD AVAILABLE', 'MERINO · LOW STOCK'];

export default function TestLayout({ children }) {
  const router = useRouter();
  const cart = useCart();
  const count = cartCount(cart);
  const [drawer, setDrawer] = useState(false);
  const [mnav, setMnav] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const tt = useRef();

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
      try { document.documentElement.removeAttribute('data-theme'); } catch (_) {}
    };
  }, []);

  const toggleTheme = () => {
    const el = document.documentElement;
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
    <div className="cc-test-root">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: MINT_CSS }} />

      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          {[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}&nbsp;&nbsp;·&nbsp;&nbsp;</span>)}
        </div>
      </div>

      <header className="site">
        <div className="wrap nav">
          <Link href="/test" className="brand" aria-label="CrossCoin home"><span className="coin">✕</span>Cross<b>Coin</b></Link>
          <nav className="nav__links">{navLinks}</nav>
          <div className="nav__act">
            <button className="ibtn" onClick={toggleTheme} aria-label="Theme">{I.sun()}</button>
            <button className="ibtn" aria-label="Search">{I.search()}</button>
            <button className="ibtn" aria-label="Account">{I.user()}</button>
            <button className="ibtn" aria-label="Cart" onClick={() => setDrawer(true)}>{I.cart()}<span className="badge-dot">{count}</span></button>
            <button className="ibtn burger" aria-label="Menu" onClick={() => setMnav(true)}>{I.menu()}</button>
          </div>
        </div>
      </header>

      <div className={`mnav${mnav ? ' on' : ''}`}>
        <div className="nav" style={{ height: 'auto', justifyContent: 'space-between' }}>
          <span className="brand"><span className="coin">✕</span>Cross<b>Coin</b></span>
          <button className="ibtn" onClick={() => setMnav(false)} aria-label="Close">{I.close()}</button>
        </div>
        {navLinks}
      </div>

      {children}

      <footer className="site">
        <div className="wrap foot">
          <div className="ab">
            <span className="brand"><span className="coin">✕</span>Cross<b>Coin</b></span>
            <p style={{ marginTop: 13 }}>Everyday essentials, minted to last. Delivered across India with a friendly, honest checkout.</p>
          </div>
          <div><h4>Shop</h4><a onClick={() => go('/test/shop')}>All products</a><a onClick={() => go('/test/shop')}>New arrivals</a><a onClick={() => go('/test/shop')}>Bestsellers</a><a onClick={() => go('/test/shop')}>Sale</a></div>
          <div><h4>Help</h4><a onClick={() => go('/test#faq')}>Track order</a><a onClick={() => go('/test#faq')}>Returns</a><a onClick={() => go('/test#faq')}>Shipping</a><a onClick={() => go('/test#faq')}>Contact</a></div>
          <div><h4>Company</h4><a>About</a><a onClick={() => go('/test#journal')}>Journal</a><a>Careers</a><a>Privacy</a></div>
        </div>
        <div className="wrap footend"><span>© 2026 CROSSCOIN · /test preview</span><span>PRIVACY · TERMS · MADE IN INDIA 🇮🇳</span></div>
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
