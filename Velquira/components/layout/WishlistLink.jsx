'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';

// Header wishlist icon with a live count badge (reads the saved ids and updates
// on the `morbix-wishlist-change` event the heart button dispatches).
export default function WishlistLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try { setCount(JSON.parse(localStorage.getItem('morbix_wishlist_ids') || '[]').length); }
      catch { setCount(0); }
    };
    read();
    window.addEventListener('morbix-wishlist-change', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('morbix-wishlist-change', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  return (
    <Link href="/wishlist" className="pill icon-pill wl-link" aria-label={`Wishlist, ${count} item${count === 1 ? '' : 's'}`}>
      <Icon name="Heart" size={16} />
      {count > 0 && <span className="wl-count">{count}</span>}
    </Link>
  );
}
