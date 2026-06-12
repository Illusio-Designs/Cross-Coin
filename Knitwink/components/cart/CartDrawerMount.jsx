'use client';

import dynamic from 'next/dynamic';

/* Client-only mount point for CartDrawer.
 *
 * Why this wrapper exists: the root layout is a Server Component, but
 * `next/dynamic` with `ssr: false` is only allowed inside Client
 * Components. By giving CartDrawer this thin 'use client' wrapper, we
 * can ssr:false the inner dynamic import — which is exactly what we
 * need, because statically importing CartDrawer into the layout chunk
 * triggers a TDZ ("Cannot access 'ed' before initialization") at
 * runtime. The heavy graph (react-hook-form, zod, react-query, many
 * api helpers) ends up forming a circular chunk dependency that
 * Turbopack can't safely hoist.
 *
 * The dynamic import puts CartDrawer in its own client-only chunk so
 * those deps never enter the shared layout chunk graph. Cost: a tiny
 * extra fetch on first paint; CartDrawer isn't above-the-fold anyway.
 */
const CartDrawer = dynamic(
  () => import('./CartDrawer').then((m) => ({ default: m.CartDrawer })),
  { ssr: false }
);

export default function CartDrawerMount() {
  return <CartDrawer />;
}