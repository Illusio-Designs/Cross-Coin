import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import ReturnsClient from './ReturnsClient';

export const metadata = pageMeta({ title: 'Returns & Refunds — Velmique', description: 'Request a return and follow your refund.', path: '/account/returns', noindex: true });

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="m-wrap m-ph"><span className="m-eyebrow">Account</span><h1>Returns &amp; Refunds.</h1></div>}>
      <ReturnsClient />
    </Suspense>
  );
}
