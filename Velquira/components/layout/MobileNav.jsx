'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import BrandLogo from '@/components/BrandLogo';
import { useCart } from '@/context/CartContext';

export default function MobileNav({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { openCart } = useCart();

  // Portal target (document.body) is only available on the client.
  useEffect(() => { setMounted(true); }, []);

  // Close the drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // The drawer is rendered through a portal onto <body>, NOT inside the header.
  // The header has a `backdrop-filter`, which makes it a containing block for
  // fixed-position descendants — so a drawer nested in it would scroll with the
  // page instead of staying pinned. Portalling it out fixes that.
  const drawer = (
    <>
      <div className={`drawer-overlay${open ? ' show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer${open ? ' show' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <BrandLogo height={30} />
          <button className="hamburger" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="X" size={22} /></button>
        </div>
        <nav className="drawer-nav" data-lenis-prevent>
          {items.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
              {item.label} <Icon name="ArrowRight" size={16} />
            </Link>
          ))}
        </nav>
        <div className="drawer-links">
          <Link href="/search" onClick={() => setOpen(false)}><Icon name="Search" size={16} /> Search</Link>
          <Link href="/wishlist" onClick={() => setOpen(false)}><Icon name="Heart" size={16} /> Wishlist</Link>
        </div>
        <div className="drawer-foot">
          <Link href="/account" className="btn btn-ghost" onClick={() => setOpen(false)}><Icon name="User" size={16} /> Sign in</Link>
          <button type="button" className="btn btn-primary" onClick={() => { setOpen(false); openCart(); }}><Icon name="ShoppingBag" size={16} /> Cart</button>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <button className="hamburger" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Icon name="Menu" size={22} />
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
