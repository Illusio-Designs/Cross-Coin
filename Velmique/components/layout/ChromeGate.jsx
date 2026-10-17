'use client';

import { usePathname } from 'next/navigation';

/**
 * Suppresses the global storefront chrome (old Header / Footer / CartDrawer …)
 * on the Maison redesign preview routes under /test, which ship their own
 * self-contained chrome (see app/test/MintShell.jsx). Everything else renders
 * the chrome as before.
 */
export default function ChromeGate({ children }) {
  const pathname = usePathname() || '';
  if (pathname === '/test' || pathname.startsWith('/test/')) return null;
  return <>{children}</>;
}
