'use client';
import { Suspense } from 'react';
import SeoWrapper from '@/components/SeoWrapper';
import ShopView from '@/components/shop/ShopView';

// Clean collection URL: /collections/<slug>. Renders the same filtered shop
// view as /shop?collection=<slug>, so the slugs the sitemap advertises resolve
// (they used to 404 — only /collections, the listing page, existed).
export default function CollectionDetailPage({ params }) {
  const slug = decodeURIComponent(params?.slug || '');
  return (
    <SeoWrapper pageName="products">
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)]" />}>
        <ShopView collectionSlug={slug} />
      </Suspense>
    </SeoWrapper>
  );
}
