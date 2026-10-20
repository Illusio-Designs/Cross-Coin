'use client';

import { useState, useRef, useEffect } from 'react';
import { ikSrc, ikSrcSet } from '@/lib/image';

/**
 * The one content-image component for Morbix. Never shows a half-downloaded
 * picture: the skeleton shimmer covers the box while the image downloads, the
 * <img> stays invisible until it has fully loaded AND decoded, then fades in
 * (~180ms). Already-cached images show at once (no fade flash); a failed image
 * shows `fallback` (the store's icon placeholder) instead of a stuck skeleton.
 *
 *   <ShimmerImg src={url} alt="" width={600} widths={[300, 600]} sizes="…" />
 *
 * `width` asks ImageKit for that width (see lib/image.js); `widths` + `sizes`
 * add a srcSet. `priority` = the LCP image (eager + fetchPriority high);
 * everything else is lazy + async-decoded.
 *
 * The parent must be `position: relative` with a defined size (aspect-ratio or
 * width/height) — the skeleton is an absolutely-positioned overlay.
 */
export default function ShimmerImg({
  src,
  alt = '',
  width = 600,
  widths,
  sizes,
  priority = false,
  fallback = null,
  className = '',
  onLoad,
  loading,
  fetchPriority,
  decoding = 'async',
  minMs, // accepted for backward-compat, unused
  ...rest
}) {
  const resolved = ikSrc(src, width);
  const srcSet = ikSrcSet(src, widths);
  // 'wait' → downloading/decoding · 'fade' → just revealed · 'shown' → cached · 'error'
  const [phase, setPhase] = useState('wait');
  const imgRef = useRef(null);

  useEffect(() => {
    setPhase('wait');
    const img = imgRef.current;
    // Loaded (or failed) before React hydrated, so onLoad/onError never fired.
    if (img && img.complete) setPhase(img.naturalWidth > 0 ? 'shown' : 'error');
  }, [resolved, srcSet]);

  const handleLoad = (e) => {
    const img = e.currentTarget;
    const reveal = () => setPhase((p) => (p === 'wait' ? 'fade' : p));
    if (typeof img.decode === 'function') img.decode().then(reveal, reveal);
    else reveal();
    onLoad?.(e);
  };

  if (!resolved || phase === 'error') return fallback;

  const state = phase === 'fade' ? ' is-loaded is-fading' : phase === 'shown' ? ' is-loaded' : '';
  return (
    <>
      {phase === 'wait' && <span className="sk shimmer-img-skeleton" aria-hidden="true" />}
      <img
        ref={imgRef}
        src={resolved}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={loading || (priority ? 'eager' : 'lazy')}
        fetchPriority={fetchPriority || (priority ? 'high' : undefined)}
        decoding={decoding}
        onLoad={handleLoad}
        onError={() => setPhase('error')}
        className={`shimmer-img${state}${className ? ' ' + className : ''}`}
        {...rest}
      />
    </>
  );
}
