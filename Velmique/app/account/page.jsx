import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import AccountClient from './AccountClient';
import { AccountSkeleton } from '../_components/Skeleton';

export const metadata = pageMeta({ title: 'My Account — Velmique', description: 'Your Velmique orders, returns, addresses and loyalty points.', path: '/account', noindex: true });

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountClient />
    </Suspense>
  );
}
