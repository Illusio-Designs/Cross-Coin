'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/Icon';
import { OrderListSkeleton } from '@/components/ui/Skeleton';

/**
 * Wraps account pages: shows a skeleton while auth resolves, a sign-in prompt
 * for signed-out visitors, and the children once authenticated. Pass
 * `fallback` (a skeleton shaped like the page) so the wait looks like the page.
 */
export default function AccountGate({ title = 'Your account', fallback, children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    if (fallback) return fallback;
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="page-hero"><span className="eyebrow">Account</span><h1>{title}</h1></div>
        <OrderListSkeleton rows={3} label="Loading your account…" style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="auth-wrap">
          <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
            <span className="eyebrow">Account</span>
            <h1>Sign in to Morbix</h1>
            <p>Track orders, save favourites and check out faster.</p>
          </div>
          <div className="contact-form auth-form" style={{ textAlign: 'center', gap: 12 }}>
            <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Sign in <Icon name="ArrowRight" size={16} />
            </Link>
            <p className="muted" style={{ fontSize: 13 }}>
              New to Morbix? <Link href="/register" style={{ color: 'var(--navy)', fontWeight: 600 }}>Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
