'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { readCartRecovery } from '@/utils/cartRecovery';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });

export default function LazyCartDrawer() {
  const { cartOpen } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Keep the drawer mounted once it opens so closing and reopening preserves
    // state. Recovery links must mount it even when the bag starts closed.
    if (cartOpen || readCartRecovery()) setReady(true);
  }, [cartOpen]);

  return cartOpen || ready ? <CartDrawer /> : null;
}
