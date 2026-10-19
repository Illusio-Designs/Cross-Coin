import { Suspense } from 'react';
import { seoMeta } from '@/lib/site';
import TrackClient from './TrackClient';

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
    <Suspense fallback={<div className="m-wrap m-ph"><span className="m-eyebrow">Order status</span><h1>Track Your Order.</h1></div>}>
      <TrackClient />
    </Suspense>
  );
}
