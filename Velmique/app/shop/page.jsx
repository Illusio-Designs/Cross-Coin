'use client';
import { Suspense } from 'react';
import SeoWrapper from '@/components/SeoWrapper';
import ShopView from '@/components/shop/ShopView';

// Full catalogue at /shop. The shop view itself lives in components/shop/ShopView
// so /collections/<slug> can reuse it — a page.jsx may only export a default (+
// metadata), never a custom component, or the Next build fails.
export default function ShopPage() {
  return (
    <SeoWrapper pageName="products">
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
        <ShopView />
      </Suspense>
    </SeoWrapper>
  );
}
