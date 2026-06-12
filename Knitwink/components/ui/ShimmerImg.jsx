'use client';

import { useState, useRef } from 'react';

/**
 * Drop-in <img> replacement with a pulsing gray skeleton that:
 *   - sits behind the image while it loads
 *   - fades the image in over 300ms once the load event fires
 *   - is FORCED to stay visible for at least `minMs` (default 400ms)
 *     so cached images don't blink the shimmer away too fast to notice
 *
 * Pass it the same `src`, `alt`, `className` you'd pass <img>. The
 * positioning class (`absolute inset-0`, `aspect-square`, etc.) belongs
 * on the *parent* container — ShimmerImg always renders the skeleton as
 * `absolute inset-0`, so the parent needs `relative` + a defined size.
 *
 * If you need the shimmer to layer over a background that already has
 * its own colour, pass `shimmerClassName` to override the gray.
 */
export function ShimmerImg({
  src,
  alt = '',
  className = '',
  shimmerClassName = 'bg-gray-200',
  minMs = 400,
  onLoad: userOnLoad,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const mountedAtRef = useRef(typeof window === 'undefined' ? 0 : Date.now());

  const handleLoad = (e) => {
    const elapsed = Date.now() - mountedAtRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining === 0) setLoaded(true);
    else setTimeout(() => setLoaded(true), remaining);
    if (userOnLoad) userOnLoad(e);
  };

  return (
    <>
      {!loaded && (
        <div className={`absolute inset-0 animate-pulse ${shimmerClassName}`} aria-hidden="true" />
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          {...rest}
        />
      )}
    </>
  );
}