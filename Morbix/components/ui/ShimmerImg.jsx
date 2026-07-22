'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Drop-in <img> replacement with a shimmer skeleton that sits behind the image
 * while it loads, then fades the image in. Handles already-cached images
 * (which never fire onLoad) by checking img.complete on mount, and reveals on
 * error so a broken image never traps the UI behind the shimmer.
 *
 * The parent must be `position: relative` with a defined size — the skeleton
 * renders as an absolutely-positioned overlay.
 */
export default function ShimmerImg({ src, alt = '', className = '', minMs = 400, onLoad, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const mountedAt = useRef(typeof window === 'undefined' ? 0 : Date.now());
  const imgRef = useRef(null);

  const reveal = () => {
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining === 0) setLoaded(true);
    else setTimeout(() => setLoaded(true), remaining);
  };

  useEffect(() => {
    setLoaded(false);
    mountedAt.current = Date.now();
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <>
      {!loaded && <span className="shimmer shimmer-img-skeleton" aria-hidden="true" />}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={(e) => { reveal(); onLoad?.(e); }}
          onError={reveal}
          className={`shimmer-img${loaded ? ' is-loaded' : ''}${className ? ' ' + className : ''}`}
          {...rest}
        />
      )}
    </>
  );
}
