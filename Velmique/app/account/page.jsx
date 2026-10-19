import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import AccountClient from './AccountClient';

export const metadata = pageMeta({ title: 'My Account — Velmique', description: 'Your Velmique orders, returns, addresses and loyalty points.', path: '/account', noindex: true });

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="m-wrap m-ph"><span className="m-eyebrow">Your account</span><h1>My Maison.</h1></div>}>
      <AccountClient />
    </Suspense>
  );
}
