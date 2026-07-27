'use client';

import Link from 'next/link';
import Icon from '@/components/Icon';

// Root error boundary — catches render errors in any route segment that lacks
// its own boundary, so a data hiccup degrades to a friendly page, never a raw
// server crash.
export default function RootError({ error, reset }) {
  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="cart-empty">
        <Icon name="Sparkles" size={44} color="#c3ccd2" />
        <b style={{ fontSize: 18 }}>Something went wrong</b>
        <p className="muted">We hit a snag loading this page. Please try again.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn-ghost">Go home</Link>
        </div>
      </div>
    </div>
  );
}
