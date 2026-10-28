'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';

// The cart drawer and the exit-intent offer are not part of the first screen,
// so their code is not in the first download: it loads once the page is idle
// (a few seconds after load), or straight away when the shopper opens the
// cart before that.
const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), { ssr: false });
const ExitIntentModal = dynamic(() => import('@/components/cart/ExitIntentModal'), { ssr: false });

export default function LazyCartLayer() {
  const { open } = useCart();
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer = null;
    let idleId = null;
    const go = () => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(() => setIdle(true), { timeout: 4000 });
      else setIdle(true);
    };
    const schedule = () => { timer = setTimeout(go, 2500); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      clearTimeout(timer);
      if (idleId != null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      window.removeEventListener('load', schedule);
    };
  }, []);

  if (!idle && !open) return null;
  return (
    <>
      <CartDrawer />
      <ExitIntentModal />
    </>
  );
}
