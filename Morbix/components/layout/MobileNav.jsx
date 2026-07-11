'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import MorbixLogo from '@/components/MorbixLogo';

export default function MobileNav({ items = [] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button className="hamburger" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Icon name="Menu" size={22} />
      </button>

      <div className={`drawer-overlay${open ? ' show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer${open ? ' show' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <MorbixLogo height={26} />
          <button className="hamburger" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="X" size={22} /></button>
        </div>
        <nav className="drawer-nav">
          {items.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
              {item.label} <Icon name="ArrowRight" size={16} />
            </Link>
          ))}
        </nav>
        <div className="drawer-foot">
          <Link href="/account" className="btn btn-ghost" onClick={() => setOpen(false)}><Icon name="User" size={16} /> Sign in</Link>
          <Link href="/cart" className="btn btn-primary" onClick={() => setOpen(false)}><Icon name="ShoppingBag" size={16} /> Cart</Link>
        </div>
      </aside>
    </>
  );
}
