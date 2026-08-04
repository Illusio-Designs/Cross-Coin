'use client';

import Link from 'next/link';
import Icon from '@/components/Icon';

// Segment error boundary for /products/[slug]. If anything in the product
// render throws (an unexpected backend shape, a transient data issue), the
// visitor sees a friendly empty state instead of a crashed page.
export default function ProductError({ error, reset }) {
  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="cart-empty">
        <Icon name="Sparkles" size={44} color="#c3ccd2" />
        <b style={{ fontSize: 18 }}>We couldn’t load this product</b>
        <p className="muted">It may be unavailable right now. Please try again in a moment.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link href="/products" className="btn btn-ghost">Browse all jewellery</Link>
        </div>
      </div>
    </div>
  );
}
