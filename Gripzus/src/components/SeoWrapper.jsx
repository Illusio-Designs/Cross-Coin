/* Brand-scoped SEO wrapper for Gripzus (Pages Router).
   Mirrors Crosscoin's SeoWrapper: fetches /api/seo?page_name=… on the
   client, fills in <Head> tags, and shows sensible defaults while the
   request resolves or if the endpoint 404s. */

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { getSeoByPageName } from '../services/seo';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gripzus.com';
const API_URL      = process.env.NEXT_PUBLIC_API_URL      || 'https://api.crosscoin.in';

function absoluteImage(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function absoluteCanonical(url) {
  if (typeof window !== 'undefined' && (!url || url.trim() === '')) {
    return `${FRONTEND_URL}${window.location.pathname}`;
  }
  if (!url) return FRONTEND_URL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${FRONTEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function SeoWrapper({ pageName, seoData, children }) {
  const [fetched, setFetched] = useState(null);

  const defaults = useMemo(() => ({
    meta_title: 'Gripzus',
    meta_description: 'Premium grips and accessories from Gripzus.',
    meta_keywords: 'gripzus, premium, accessories',
    canonical_url: null,
    meta_image: null,
  }), []);

  // Re-fetch whenever the pageName changes (e.g. navigating between
  // product detail pages would otherwise keep the first slug's SEO
  // because a useRef cache locked the fetch to the first render).
  useEffect(() => {
    if (seoData || !pageName) { setFetched(null); return; }
    let alive = true;
    setFetched(null);
    getSeoByPageName(pageName)
      .then(d => { if (alive) setFetched(d || defaults); })
      .catch(() => { if (alive) setFetched(defaults); });
    return () => { alive = false; };
  }, [pageName, seoData, defaults]);

  const data = seoData || fetched || defaults;
  const img = absoluteImage(data.meta_image);
  const canonical = absoluteCanonical(data.canonical_url);
  const ogTitle = data.og_title || data.meta_title;
  const ogDesc  = data.og_description || data.meta_description;

  return (
    <>
      <Head>
        <title>{data.meta_title || pageName || 'Gripzus'}</title>
        {data.meta_description && <meta name="description" content={data.meta_description} />}
        {data.meta_keywords && <meta name="keywords" content={data.meta_keywords} />}
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={ogTitle} />
        {ogDesc && <meta property="og:description" content={ogDesc} />}
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        {img && <meta property="og:image" content={img} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        {ogDesc && <meta name="twitter:description" content={ogDesc} />}
        {img && <meta name="twitter:image" content={img} />}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Gripzus" />
        {data.structured_data && (
          <script type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: typeof data.structured_data === 'string' ? data.structured_data : JSON.stringify(data.structured_data) }} />
        )}
      </Head>
      {children}
    </>
  );
}