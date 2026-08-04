'use client';

/* App-Router compatible SEO wrapper. Mirrors Crosscoin's SeoWrapper
   behaviour: fetch /api/seo?page_name=… and inject title / description /
   og / twitter tags. Since next/head doesn't work inside client App
   Router components, we mutate document.head directly with stable ids
   so updates replace previous values cleanly. */

import { useEffect, useMemo, useState } from 'react';
import { getSeoByPageName } from '@/lib/api/seo';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';
const API_URL      = process.env.NEXT_PUBLIC_API_URL      || 'https://api.crosscoin.in';

const TAG_PREFIX = 'knitwink-seo-';

function absoluteImage(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function absoluteCanonical(url) {
  if (typeof window === 'undefined') return url || FRONTEND_URL;
  if (!url || url.trim() === '') return `${FRONTEND_URL}${window.location.pathname}`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${FRONTEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function upsert(tagName, idSuffix, attrs) {
  if (typeof document === 'undefined') return;
  const id = `${TAG_PREFIX}${idSuffix}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tagName);
    el.id = id;
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => {
    if (v == null || v === '') el.removeAttribute(k);
    else el.setAttribute(k, v);
  });
}

function remove(idSuffix) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(`${TAG_PREFIX}${idSuffix}`);
  if (el) el.remove();
}

export default function SeoWrapper({ pageName, seoData, children }) {
  const [fetched, setFetched] = useState(null);

  const defaults = useMemo(() => ({
    meta_title: 'Knitwink',
    meta_description: 'Premium knitwear from Knitwink — small-batch knit goods made with care.',
    meta_keywords: 'knitwink, knitwear, premium socks, handcrafted',
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

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (data.meta_title) document.title = data.meta_title;

    const img = absoluteImage(data.meta_image);
    const canonical = absoluteCanonical(data.canonical_url);
    const ogTitle = data.og_title || data.meta_title;
    const ogDesc  = data.og_description || data.meta_description;

    upsert('meta', 'desc',        { name: 'description', content: data.meta_description || '' });
    upsert('meta', 'keywords',    { name: 'keywords',    content: data.meta_keywords    || '' });
    upsert('link', 'canonical',   { rel: 'canonical', href: canonical });
    upsert('meta', 'og-title',    { property: 'og:title',       content: ogTitle || '' });
    upsert('meta', 'og-desc',     { property: 'og:description', content: ogDesc  || '' });
    upsert('meta', 'og-url',      { property: 'og:url',         content: canonical });
    upsert('meta', 'og-type',     { property: 'og:type',        content: 'website' });
    upsert('meta', 'tw-card',     { name: 'twitter:card',        content: 'summary_large_image' });
    upsert('meta', 'tw-title',    { name: 'twitter:title',       content: ogTitle || '' });
    upsert('meta', 'tw-desc',     { name: 'twitter:description', content: ogDesc  || '' });
    upsert('meta', 'robots',      { name: 'robots',  content: 'index, follow' });

    if (img) {
      upsert('meta', 'og-image', { property: 'og:image',  content: img });
      upsert('meta', 'tw-image', { name: 'twitter:image', content: img });
    } else {
      remove('og-image');
      remove('tw-image');
    }
  }, [data]);

  return <>{children}</>;
}