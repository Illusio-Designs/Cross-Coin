import { Suspense } from 'react';
import { seoMeta } from '@/lib/site';
import TrackClient from './TrackClient';
import { PageHeadSkeleton, TrackFormSkeleton } from '../_components/Skeleton';

export const revalidate = 300;

export async function generateMetadata() {
  return seoMeta('track-order', {
    title: 'Track Your Order — Velmique',
    description: 'Track your VELMIQUE order — live shipment status, courier timeline and delivery details.',
    path: '/track-order',
  });
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={(
      <>
        <PageHeadSkeleton eyebrow="Order status" title="Track Your Order." lede="Enter your order number to see live shipment progress." />
        <div className="m-wrap m-section m-track" style={{ paddingTop: 0 }}><TrackFormSkeleton /></div>
      </>
    )}>
      <TrackClient />
    </Suspense>
  );
}
