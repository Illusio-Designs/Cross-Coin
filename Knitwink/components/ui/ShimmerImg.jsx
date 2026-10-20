'use client';

import { useState, useRef, useEffect } from 'react';
import { ikUrl, ikSrcSet } from '@/lib/image';

/**
 * The store's one content-image component (drop-in for <img>).
 *
 * The photo is never shown half downloaded: it stays transparent over the
 * `.sk` shimmer until it has fully loaded AND decoded, then fades in (~180ms).
 * An image that is already cached when we mount appears at once (no fade);
 * on error the `fallback` is rendered (or the empty box) — never a
 * forever-skeleton.
 *
 *   width    → ImageKit width transform (`?tr=w-…,q-78,f-auto`)
 *   widths   → srcSet widths (+ pass `sizes`)
 *   priority → eager + fetchPriority high (the LCP image); otherwise lazy
 *
 * The positioning classes (`absolute inset-0`, `h-full w-full` …) go on the
 * <img> via className as before; the PARENT needs `relative` + a defined size
 * because the shimmer is an `absolute inset-0` layer behind the image.
 * `data-sk-img` lets the pre-hydration script in app/layout.jsx reveal the
 * image before React has loaded.
 */
export function ShimmerImg({
  src,
  alt = '',
  className = '',
  shimmerClassName = '',
  width,
  widths,
  sizes,
  priority = false,
  fallback = null,
  skeleton = true,
  onReveal,
  onLoad: userOnLoad,
  onError: userOnError,
  loading,
  fetchPriority,
  // legacy prop from the old pulse version — ignored (no artificial delay now)
  // eslint-disable-next-line no-unused-vars
  minMs,
  ...rest
}) {
  const url = width ? ikUrl(src, width) : src;
  const srcSet = widths ? ikSrcSet(src, widths) : undefined;
  // State belongs to one URL: a new src starts hidden again in the same render.
  const [st, setSt] = useState({ url, s: 'wait' });
  const state = st.url === url ? st.s : 'wait';
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setSt({ url, s: 'instant' });
      onReveal?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleLoad = (e) => {
    userOnLoad?.(e);
    const img = e.currentTarget;
    const forUrl = url;
    const done = () => {
      if (imgRef.current === img) setSt((cur) => (cur.url === forUrl && cur.s === 'instant' ? cur : { url: forUrl, s: 'fade' }));
      onReveal?.();
    };
    if (typeof img.decode === 'function') img.decode().then(done, done);
    else done();
  };

  const handleError = (e) => {
    userOnError?.(e);
    setSt({ url, s: 'error' });
    onReveal?.();
  };

  if (state === 'error') return fallback;

  const shown = state === 'fade' || state === 'instant';
  return (
    <>
      {skeleton && !shown && (
        <div className={`sk absolute inset-0 ${shimmerClassName}`} aria-hidden="true" />
      )}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={url}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? 'eager' : (loading || 'lazy')}
          fetchPriority={priority ? 'high' : fetchPriority}
          decoding="async"
          data-sk-img=""
          onLoad={handleLoad}
          onError={handleError}
          className={`kw-img${shown ? ' is-loaded' : ''}${state === 'instant' ? ' is-instant' : ''}${className ? ' ' + className : ''}`}
          {...rest}
        />
      )}
    </>
  );
}

export default ShimmerImg;
