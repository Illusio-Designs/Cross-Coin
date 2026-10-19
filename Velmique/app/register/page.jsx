import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import RegisterClient from './RegisterClient';

export const metadata = pageMeta({ title: 'Create an Account — Velmique', description: 'Create your Velmique account with your mobile number.', path: '/register', noindex: true });

export default function RegisterPage() {
  return <Suspense fallback={<div className="m-wrap m-ph"><h1>Create Your Account.</h1></div>}><RegisterClient /></Suspense>;
}
