'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Drop-in <img> replacement with a pulsing gray skeleton that:
 *   - sits behind the image while it loads
 *   - fades the image in over 300ms once the load event fires
 *   - is FORCED to stay visible for at least `minMs` (default 400ms)
 *     so cached images don't blink the shimmer away too fast to notice
 *
 * IMPORTANT: a cached image can finish loading BEFORE React attaches the
 * onLoad handler, so onLoad never fires and the image would be stuck at
 * opacity-0 (you'd see only the shimmer forever). We guard against that by
 * checking img.complete on mount, and we reveal on error too so a broken /
 * missing image never traps the UI behind the shimmer.
 *
 * Pass it the same `src`, `alt`, `className` you'd pass <img>. The
 * positioning class (`absolute inset-0`, `aspect-square`, etc.) belongs
 * on the *parent* container — ShimmerImg always renders the skeleton as
 * `absolute inset-0`, so the parent needs `relative` + a defined size.
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
  const imgRef = useRef(null);

  const reveal = () => {
    const elapsed = Date.now() - mountedAtRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining === 0) setLoaded(true);
    else setTimeout(() => setLoaded(true), remaining);
  };

  const handleLoad = (e) => {
    reveal();
    if (userOnLoad) userOnLoad(e);
  };

  // Reset + catch already-cached images whenever the src changes. If the
  // <img> is already complete (served from cache), onLoad won't fire, so we
  // reveal it here instead.
  useEffect(() => {
    setLoaded(false);
    mountedAtRef.current = Date.now();
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <>
      {!loaded && (
        <div className={`absolute inset-0 animate-pulse ${shimmerClassName}`} aria-hidden="true" />
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={reveal}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          {...rest}
        />
      )}
    </>
  );
}
