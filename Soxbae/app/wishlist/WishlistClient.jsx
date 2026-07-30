'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import ProductCard from '@/components/home/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { getAllProducts } from '@/lib/api';

function readSaved() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('soxbae_wishlist_items') || '[]'); } catch { return []; }
}

export default function WishlistClient() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // The saved snapshots already hold the exact colour/image the customer
    // picked. Enrich each with the live catalog card (matched by colour-variant
    // uid) when available, but never lose the saved variant if the backend is
    // unreachable — this is why a saved "baby pink" no longer shows as white.
    const saved = readSaved();
    let byUid = new Map();
    try {
      const all = await getAllProducts();
      byUid = new Map(all.map((p) => [String(p.uid ?? p.id), p]));
    } catch { /* offline / no backend — fall back to snapshots */ }
    const merged = saved
      .map((s) => byUid.get(String(s.uid ?? s.key ?? s.id)) || s)
      .filter(Boolean);
    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('soxbae-wishlist-change', onChange);
    return () => window.removeEventListener('soxbae-wishlist-change', onChange);
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
          {items.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
