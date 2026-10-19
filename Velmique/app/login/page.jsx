import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import LoginClient from './LoginClient';

export const metadata = pageMeta({ title: 'Sign In — Velmique', description: 'Sign in to your Velmique account with your mobile number.', path: '/login', noindex: true });

export default function LoginPage() {
  return <Suspense fallback={<div className="m-wrap m-ph"><h1>Welcome Back.</h1></div>}><LoginClient /></Suspense>;
}
