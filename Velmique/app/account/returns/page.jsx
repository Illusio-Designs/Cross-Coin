import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import ReturnsClient from './ReturnsClient';
import { ReturnsSkeleton } from '../../_components/Skeleton';

export const metadata = pageMeta({ title: 'Returns & Refunds — Velmique', description: 'Request a return and follow your refund.', path: '/account/returns', noindex: true });

export default function ReturnsPage() {
  return (
    <Suspense fallback={<ReturnsSkeleton />}>
      <ReturnsClient />
    </Suspense>
  );
}
