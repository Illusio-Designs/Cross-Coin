'use client';

import { useEffect } from 'react';
import { useWishlistStore } from '@/store/wishlistStore';

/* Mount-once hydrator. Pulls the wishlist source-of-truth from the
   backend and reconciles it with whatever the persist middleware
   restored from localStorage. Renders nothing.

   Listens for `storage` events too, so if a sibling tab signs in or
   out (which clears/sets the auth token in localStorage) we re-fetch
   to pick up the right user's wishlist. */
export function WishlistHydrator() {
  useEffect(() => {
    useWishlistStore.getState().hydrate();

    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'velquira:guestToken') {
        useWishlistStore.getState().hydrate();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
