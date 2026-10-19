'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/* Route-level error boundary: a page that throws while rendering shows this
   inside the shell (header, bag and footer keep working) with a retry. */
export default function RouteError({ error, reset }) {
  // Hand the error to the global reporter (lib/errorReporter.js listens for
  // `velmique:error`, like the app-wide ErrorBoundary).
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('velmique:error', { detail: { error, errorInfo: { componentStack: error?.digest ? `digest ${error.digest}` : '' } } }));
    } catch { /* reporting is best-effort */ }
  }, [error]);

  return (
    <section className="m-section"><div className="m-wrap m-oc" role="alert">
      <span className="m-eyebrow">Something went wrong</span>
      <h1>A small hiccup.</h1>
      <p className="m-oc__lede">This page didn&rsquo;t load properly. Please try again — your bag is safe.</p>
      <div className="m-oc__cta">
        <button type="button" className="m-btn m-btn--fill" onClick={() => reset()}>Try again</button>
        <Link className="m-btn" href="/">Go home</Link>
      </div>
    </div></section>
  );
}
