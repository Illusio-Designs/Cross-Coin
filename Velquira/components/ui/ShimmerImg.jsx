'use client';

import { useState, useRef, useEffect } from 'react';
import { ikUrl, ikSrcSet } from '@/lib/image';

/**
 * The store's one content-image component. The photo is never shown half
 * downloaded: it stays invisible over the `.sk` shimmer until it has fully
 * loaded AND decoded, then fades in (~180ms). Cached images (already complete
 * on mount) appear at once with no fade; on error the `fallback` is shown
 * (or the empty box) — never a forever-skeleton.
 *
 *   width   → ImageKit width transform (`?tr=w-…,q-78,f-auto`)
 *   widths  → srcSet widths (+ pass `sizes`)
 *   priority→ eager + fetchPriority high (LCP image); otherwise lazy
 *
 * The parent must be `position: relative` with a defined size — the shimmer
 * is an absolutely-positioned layer behind the image. `data-sk-img` lets the
 * tiny pre-hydration script in app/layout.jsx reveal it before React loads.
 */
export default function ShimmerImg({
  src, alt = '', className = '', width, widths, sizes, priority = false,
  fallback = null, skeleton = true, onReveal, onLoad, onError, loading, ...rest
}) {
  // 'wait' → still loading; 'fade' → loaded now (fade in); 'instant' → was cached; 'error'
  const url = width ? ikUrl(src, width) : src;
  const srcSet = widths ? ikSrcSet(src, widths) : undefined;
  // State belongs to one URL: a new src starts hidden again in the same render.
  const [st, setSt] = useState({ url, s: 'wait' });
  const state = st.url === url ? st.s : 'wait';
  const setState = (s) => setSt({ url, s });
  const imgRef = useRef(null);

  const reveal = (instant) => {
    setState(instant ? 'instant' : 'fade');
    onReveal?.();
  };

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) reveal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleLoad = (e) => {
    onLoad?.(e);
    const img = e.currentTarget;
    const forUrl = url;
    const done = () => { if (imgRef.current === img) setSt({ url: forUrl, s: 'fade' }); onReveal?.(); };
    if (typeof img.decode === 'function') img.decode().then(done, done);
    else done();
  };

  if (state === 'error' && fallback) return fallback;

  const shown = state === 'fade' || state === 'instant';
  return (
    <>
      {skeleton && !shown && state !== 'error' && <span className="sk shimmer-img-skeleton" aria-hidden="true" />}
      {url && state !== 'error' && (
        <img
          ref={imgRef}
          src={url}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? 'eager' : (loading || 'lazy')}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          data-sk-img=""
          onLoad={handleLoad}
          onError={(e) => { onError?.(e); setState('error'); onReveal?.(); }}
          className={`shimmer-img${shown ? ' is-loaded' : ''}${state === 'instant' ? ' is-instant' : ''}${className ? ' ' + className : ''}`}
          {...rest}
        />
      )}
    </>
  );
}
