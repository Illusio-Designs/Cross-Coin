import Link from 'next/link';

export const metadata = { title: 'Page not found — Velmique', robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <section className="m-section"><div className="m-wrap m-oc">
      <span className="m-404" aria-hidden="true">404</span>
      <span className="m-eyebrow">Page not found</span>
      <h1>This trail has faded.</h1>
      <p className="m-oc__lede">The page you&rsquo;re looking for has moved or no longer exists. Let us guide you back to something beautiful.</p>
      <div className="m-oc__cta">
        <Link className="m-btn m-btn--fill" href="/">Go home</Link>
        <Link className="m-btn" href="/shop">Browse the shop</Link>
        <Link className="m-btn" href="/search">Search</Link>
      </div>
    </div></section>
  );
}
