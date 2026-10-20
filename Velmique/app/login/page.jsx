import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import LoginClient from './LoginClient';
import { AuthCardSkeleton, PageHeadSkeleton } from '../_components/Skeleton';

const Shell = (
  <>
    <PageHeadSkeleton eyebrow="Your account" title="Welcome Back." lede="Sign in with your mobile number — we’ll text you a one-time code." />
    <AuthCardSkeleton fields={1} />
  </>
);

export const metadata = pageMeta({ title: 'Sign In — Velmique', description: 'Sign in to your Velmique account with your mobile number.', path: '/login', noindex: true });

export default function LoginPage() {
  return <Suspense fallback={Shell}><LoginClient /></Suspense>;
}
