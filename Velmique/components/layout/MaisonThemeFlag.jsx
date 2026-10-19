'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/* Marks <html> with data-maison on the Maison /test routes so globals.css can
   re-skin the shared design-system variables (and the live CartDrawer, which
   renders on /test) to the onyx & gold theme. */
export default function MaisonThemeFlag() {
  const pathname = usePathname() || '';
  useEffect(() => {
    const on = pathname === '/test' || pathname.startsWith('/test/');
    const el = document.documentElement;
    if (on) el.setAttribute('data-maison', '');
    else el.removeAttribute('data-maison');
  }, [pathname]);
  return null;
}
