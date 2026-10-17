'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';

const I = {
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  close:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6l12 12M18 6 6 18"/></svg>,
  search:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>,
  user:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  bag:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>,
};

const NAV = [
  { label: 'Shop', href: '/test/shop' },
  { label: 'Build a Pack', href: '/test/pack' },
  { label: 'About', href: '/test/about' },
  { label: 'Journal', href: '/test/journal' },
];

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const ANNO = [
  { t: 'Free shipping on all orders', d: 'M3 7h11v8H3zM14 10h4l3 3v2h-7z' },
  { t: 'Crafted in India', d: 'M12 3c-3 3-6 3-6 3v6c0 5 6 9 6 9s6-4 6-9V6s-3 0-6-3Z' },
  { t: 'Easy 7-day returns', d: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4' },
  { t: '100% genuine fragrances', d: 'M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z' },
  { t: 'Cash on delivery available', d: 'M2.5 6h19v12h-19zM2.5 10h19' },
];
function AnnoSeq({ hidden = false }) {
  return (
    <div className="m-anno__seq" aria-hidden={hidden}>
      {ANNO.map((a, i) => (
        <span className="m-anno__i" key={i}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={a.d} /></svg>{a.t}
        </span>
      ))}
    </div>
  );
}

function Brand({ className = '', text = false }) {
  if (text) {
    return <Link href="/test" className={`m-brand ${className}`}>VELMIQUE<small>MAISON DE PARFUM</small></Link>;
  }
  return (
    <Link href="/test" className={`m-logo-link ${className}`} aria-label="Velmique">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="Velmique" className="m-logo" />
    </Link>
  );
}

export default function MintShell({ children }) {
  const { cart, cartOpen, setCartOpen, cartCount, cartTotal, updateQuantity, removeFromCart } = useStore();
  const [menu, setMenu] = useState(false);

  return (
    <>
      <div className="m-anno"><div className="m-anno__track"><AnnoSeq /><AnnoSeq hidden /></div></div>

      <header className="m-header">
        <div className="m-wrap m-nav">
          <button className="m-burger" aria-label="Open menu" onClick={() => setMenu(true)}>{I.menu}</button>
          <nav className="m-nav__links" aria-label="Primary">
            {NAV.map((n) => <Link key={n.label} className="m-lnk" href={n.href}>{n.label}</Link>)}
          </nav>
          <Brand />
          <div className="m-icons">
            <Link href="/test/search" aria-label="Search">{I.search}</Link>
            <Link href="/test/account" aria-label="Account">{I.user}</Link>
            <button className="m-bag" aria-label="Cart" onClick={() => setCartOpen(true)}>{I.bag}<b>{cartCount}</b></button>
          </div>
        </div>
      </header>

      {/* mobile slide-nav */}
      <div className={`m-mnav ${menu ? 'on' : ''}`}>
        <button className="m-mnav__x" aria-label="Close menu" onClick={() => setMenu(false)}>{I.close}</button>
        {NAV.map((n) => <Link key={n.label} href={n.href} onClick={() => setMenu(false)}>{n.label}</Link>)}
      </div>

      {children}

      {/* ── Footer ── */}
      <footer className="m-footer">
        <div className="m-wrap">
          <div className="m-foot">
            <div className="m-foot__brand">
              <Brand text />
              <p>Fragrances for a more intentional you.</p>
              <div className="m-social" aria-label="Social links">
                <a href="#" aria-label="Instagram"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
                <a href="#" aria-label="Facebook"><svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9Z"/></svg></a>
                <a href="#" aria-label="YouTube"><svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M22 8s-.2-1.5-.8-2.1c-.8-.8-1.6-.8-2-.9C16.4 4.7 12 4.7 12 4.7s-4.4 0-7.2.3c-.4.1-1.2.1-2 .9C2.2 6.5 2 8 2 8S1.8 9.8 1.8 11.5v1c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.3.9 1.7.2 7 .3 7 .3s4.4 0 7.2-.3c.4-.1 1.2-.1 2-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5v-1C22.2 9.8 22 8 22 8ZM10 14.6V9.4l4.2 2.6L10 14.6Z"/></svg></a>
              </div>
            </div>
            <div>
              <h4>Shop</h4>
              <ul>
                <li><Link href="/test/shop">All Fragrances</Link></li>
                <li><Link href="/test/shop">Best Sellers</Link></li>
                <li><Link href="/test/shop">Collections</Link></li>
                <li><Link href="/test/shop">Gift Sets</Link></li>
              </ul>
            </div>
            <div>
              <h4>About</h4>
              <ul>
                <li><Link href="/test/about">Our Story</Link></li>
                <li><Link href="/test/about">Craftsmanship</Link></li>
                <li><Link href="/test/journal">Journal</Link></li>
                <li><Link href="/test/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4>Be part of our story</h4>
              <p style={{ fontSize: 13, marginBottom: 12 }}>Join for exclusive launches, early access and fragrant stories.</p>
              <form className="m-signup" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Your email address" aria-label="Email address" required />
                <button type="submit" aria-label="Subscribe"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
              </form>
              <h4 style={{ marginTop: 22 }}>Customer Care</h4>
              <ul>
                <li><Link href="/test/track-order">Track Order</Link></li>
                <li><Link href="/shipping-returns">Shipping &amp; Returns</Link></li>
                <li><Link href="/test/contact">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="m-legal">
            <span>© {new Date().getFullYear()} VELMIQUE. All rights reserved.</span>
            <span><Link href="/terms">Terms</Link><Link href="/privacy-policy">Privacy Policy</Link></span>
          </div>
        </div>
      </footer>

      {/* ── Cart drawer (real store) ── */}
      <div className={`m-scrim ${cartOpen ? 'on' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`m-cart ${cartOpen ? 'on' : ''}`} aria-label="Shopping bag" aria-hidden={!cartOpen}>
        <div className="m-cart__h">
          <b>Your Bag {cartCount ? `(${cartCount})` : ''}</b>
          <button aria-label="Close bag" onClick={() => setCartOpen(false)}>{I.close}</button>
        </div>
        {cart.length === 0 ? (
          <div className="m-cart__body">
            <div className="m-cart__empty">
              <span style={{ opacity: .5 }}>{I.bag}</span>
              <p>Your bag is waiting to be filled with something unforgettable.</p>
              <Link className="m-btn m-btn--fill" href="/test/shop" onClick={() => setCartOpen(false)}>Discover scents</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="m-cart__body">
              {cart.map((it) => (
                <div className="m-line" key={`${it.id}-${it.size}`}>
                  {it.image ? <img className="m-line__img" src={it.image} alt={it.name} /> : <span className="m-line__img" />}
                  <div>
                    <div className="m-line__n">{it.name}</div>
                    {it.size ? <div className="m-line__m">{it.size}</div> : null}
                    <div className="m-line__q">
                      <button aria-label="Decrease" onClick={() => updateQuantity(it.id, it.quantity - 1, it.size)}>−</button>
                      <span>{it.quantity}</span>
                      <button aria-label="Increase" onClick={() => updateQuantity(it.id, it.quantity + 1, it.size)}>+</button>
                    </div>
                    <button className="m-line__rm" onClick={() => removeFromCart(it.id, it.size)}>Remove</button>
                  </div>
                  <div className="m-line__price">{inr(it.price * it.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="m-cart__foot">
              <div className="m-cart__tot"><span>Subtotal</span><b>{inr(cartTotal)}</b></div>
              <Link className="m-btn m-btn--fill" href="/checkout" onClick={() => setCartOpen(false)} style={{ justifyContent: 'center' }}>Checkout</Link>
              <button className="m-btn m-btn--ghost" onClick={() => setCartOpen(false)} style={{ justifyContent: 'center' }}>Continue shopping</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
