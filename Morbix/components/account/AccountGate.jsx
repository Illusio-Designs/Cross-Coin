'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/Icon';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Wraps account pages: shows a shimmer while auth resolves, a sign-in prompt
 * for signed-out visitors, and the children once authenticated.
 */
export default function AccountGate({ title = 'Your account', children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="page-hero"><span className="eyebrow">Account</span><h1>{title}</h1></div>
        <div style={{ display: 'grid', gap: 14, marginTop: 24, maxWidth: 620 }}>
          <Skeleton height={70} radius={16} />
          <Skeleton height={70} radius={16} />
          <Skeleton height={70} radius={16} />
        </div>
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
