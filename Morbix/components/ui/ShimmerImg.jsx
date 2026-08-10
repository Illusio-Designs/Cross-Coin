'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Drop-in <img> replacement with a shimmer skeleton that sits behind the image
 * while it loads, then fades it in. Handles already-cached images (which never
 * fire onLoad) by checking img.complete on mount, and reveals on error so a
 * broken image never traps the UI behind the shimmer.
 *
 * The parent must be `position: relative` with a defined size — the skeleton
 * renders as an absolutely-positioned overlay.
 */

// ImageKit URLs are served at origin resolution unless we ask for a transform.
// Add width + f-auto (WebP/AVIF negotiation) so cards/thumbs don't download the
// full-size original. Width-only preserves aspect ratio.
function optimizeSrc(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-600,q-78,f-auto`;
  }
  return src;
}

export default function ShimmerImg({
  src,
  alt = '',
  className = '',
  onLoad,
  loading = 'lazy',
  decoding = 'async',
  minMs, // accepted for backward-compat, no longer used (was an artificial delay)
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const optimized = optimizeSrc(src);

  // Reveal immediately — no artificial minimum delay (that delay was adding
  // ~400ms of shimmer even to cached images, hurting perceived paint / LCP).
  const reveal = () => setLoaded(true);

  useEffect(() => {
    setLoaded(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimized]);

  return (
    <>
      {!loaded && <span className="shimmer shimmer-img-skeleton" aria-hidden="true" />}
      {optimized && (
        <img
          ref={imgRef}
          src={optimized}
          alt={alt}
          loading={loading}
          decoding={decoding}
          onLoad={(e) => { reveal(); onLoad?.(e); }}
          onError={reveal}
          className={`shimmer-img${loaded ? ' is-loaded' : ''}${className ? ' ' + className : ''}`}
          {...rest}
        />
      )}
    </>
  );
}
