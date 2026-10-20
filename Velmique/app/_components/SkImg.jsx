'use client';

import { useCallback, useState } from 'react';

/* The storefront's one content-image component ("no half-draw").

   Renders a frame (`.sk-frame`, app/mint.css) that carries the skeleton
   shimmer and an <img> inside it held at opacity 0 until the file has fully
   loaded AND decoded — so a picture never paints top-first while its bytes
   are still arriving — then fades it in (~180ms).
   - Already cached when it mounts / hydrates → shown at once, no fade.
   - Fails to load → the shimmer stops and the img is hidden, leaving the
     slot's own background (the Mint tile/placeholder look), never a
     forever-skeleton or a broken-image icon.

   Sizing: by default the frame fills its positioned parent (`position:absolute;
   inset:0`) — card tiles, gallery shots, collection tiles, note orbs. Pass
   `frameClassName` for a slot whose size class used to sit on the <img>
   itself (e.g. "m-jcard__img", "m-crow__img"); the frame then takes that class
   and the box is sized before the image arrives.

   Every other prop (src, srcSet, sizes, loading, fetchPriority …) goes to the
   <img> unchanged; decoding defaults to async. */
export default function SkImg({ frameClassName, className, onLoad, onError, alt = '', decoding = 'async', ...props }) {
  // 'wait' → shimmer; 'fade' → loaded now (animate in); 'ready' → was cached; 'error'.
  const [state, setState] = useState('wait');

  const reveal = (el, how) => {
    const show = () => setState((s) => (s === 'wait' ? how : s));
    if (el && typeof el.decode === 'function') el.decode().then(show, show);
    else show();
  };

  // Images that finished before hydration never fire onLoad for React.
  const ref = useCallback((el) => {
    if (!el || !el.complete) return;
    if (el.naturalWidth) setState((s) => (s === 'wait' ? 'ready' : s));
    else if (el.getAttribute('src')) setState('error');
  }, []);

  const frame = ['sk-frame', frameClassName ? 'sk-frame--own' : '', frameClassName || '', state === 'wait' ? 'sk-img' : `is-${state}`]
    .filter(Boolean).join(' ');

  return (
    <span className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...props}
        ref={ref}
        alt={alt}
        decoding={decoding}
        className={className}
        onLoad={(e) => { reveal(e.currentTarget, 'fade'); onLoad?.(e); }}
        onError={(e) => { setState('error'); onError?.(e); }}
      />
    </span>
  );
}
