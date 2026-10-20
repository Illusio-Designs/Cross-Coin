import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import RegisterClient from './RegisterClient';
import { AuthCardSkeleton, PageHeadSkeleton } from '../_components/Skeleton';

const Shell = (
  <>
    <PageHeadSkeleton eyebrow="Join the maison" title="Create Your Account." lede="Track orders, request returns and collect loyalty points." />
    <AuthCardSkeleton fields={3} check />
  </>
);

export const metadata = pageMeta({ title: 'Create an Account — Velmique', description: 'Create your Velmique account with your mobile number.', path: '/register', noindex: true });

export default function RegisterPage() {
  return <Suspense fallback={Shell}><RegisterClient /></Suspense>;
}
