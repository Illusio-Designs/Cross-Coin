'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import ProductCard from '@/components/home/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { getWishlist } from '@/lib/api/wishlist';

export default function WishlistClient() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWishlist();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('morbix-wishlist-change', onChange);
    return () => window.removeEventListener('morbix-wishlist-change', onChange);
  }, [load]);

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Wishlist</span>
        <h1>Your wishlist</h1>
        <p>Saved pairs, ready when you are.</p>
      </div>

      {loading ? (
        <div style={{ marginTop: 24 }}><ProductGridSkeleton count={4} /></div>
      ) : items.length === 0 ? (
        <div className="cart-empty">
          <Icon name="Heart" size={40} color="#c3ccd2" />
          <p>Your wishlist is empty.</p>
          <Link href="/products" className="btn btn-primary">Discover socks</Link>
        </div>
      ) : (
        <div className="product-grid" style={{ marginTop: 24 }}>
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
