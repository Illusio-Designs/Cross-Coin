import { Suspense } from 'react';
import ShopView from '@/components/shop/ShopView';
import { buildMetadata } from '@/lib/api/seo';

// Server component so SEO is server-rendered and dashboard-driven. The full
// catalogue UI lives in components/shop/ShopView (a client component), reused by
// /collections/<slug>.
export async function generateMetadata() {
  return buildMetadata('products', { title: 'Shop — Velmique' });
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
      <ShopView />
    </Suspense>
  );
}
