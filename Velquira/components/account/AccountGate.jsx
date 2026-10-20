'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/Icon';
import { SkeletonRegion, FormSkeleton } from '@/components/ui/Skeleton';

/**
 * Wraps account pages: shows a skeleton while auth resolves, a sign-in prompt
 * for signed-out visitors, and the children once authenticated.
 *
 * `skeleton` is the page body shaped like the real page (the page passes its
 * own); `crumbs` keeps the breadcrumb on screen while it loads. Pass
 * `bare` when the skeleton already draws its own title band.
 */
export default function AccountGate({ title = 'Your account', children, skeleton, crumbs, bare = false }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        {crumbs}
        {!bare && <div className="page-hero"><span className="eyebrow">Account</span><h1>{title}</h1></div>}
        <SkeletonRegion label="Loading your account…" style={bare ? undefined : { marginTop: 24 }}>
          {skeleton || <FormSkeleton fields={3} style={{ maxWidth: 620 }} />}
        </SkeletonRegion>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="auth-wrap">
          <div className="page-hero" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
            <span className="eyebrow">Account</span>
            <h1>Sign in to Velquira</h1>
            <p>Track orders, save favourites and check out faster.</p>
          </div>
          <div className="contact-form auth-form" style={{ textAlign: 'center', gap: 12 }}>
            <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Sign in <Icon name="ArrowRight" size={16} />
            </Link>
            <p className="muted" style={{ fontSize: 13 }}>
              New to Velquira? <Link href="/register" style={{ color: 'var(--navy)', fontWeight: 600 }}>Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
