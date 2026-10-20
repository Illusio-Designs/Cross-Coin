import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ikw, ikSrcSet } from '../../utils/imagekit';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* GzImage — the one content-image component for Gripzus.

   No half-drawn pictures: the <img> stays invisible until the file has fully
   downloaded AND decoded, while its parent box (which must already have its
   final size — aspect-[4/5], w-16 h-16 …) shows the skeleton shimmer (see
   `img.gzimg` in styles/globals.css). Then it fades in (~180ms). An image that
   is already cached is shown at once with no fade. On error it swaps to
   `fallback` (if given) or simply disappears, leaving the plain box — never a
   forever-skeleton.

   ImageKit URLs are requested at the shown width (`w`, plus optional `widths`
   for a srcSet with `sizes`), WebP/AVIF via f-auto. Other URLs are untouched.
   `priority` = the LCP image (eager + fetchPriority high); everything else is
   lazy + async decode. `fade={false}` for images whose opacity the parent
   animates itself (hero crossfade). `onReady` fires once the image is shown (or has finally failed). */
export default function GzImage({
  src, alt = '', w, widths, sizes, priority = false, fade = true, fallback, onReady,
  className = '', style, ...rest
}) {
  const ref = useRef(null);
  const [cur, setCur] = useState(src);
  const [state, setState] = useState('wait'); // 'wait' | 'cached' | 'loaded' | 'gone'

  useEffect(() => { setCur(src); }, [src]);

  const url = cur ? ikw(cur, w) : '';
  const srcSet = cur && widths ? ikSrcSet(cur, widths) : undefined;

  // New picture → hidden until ready; already complete (cache, or loaded
  // before hydration) → shown immediately, no fade.
  useIsoLayoutEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) { setState('cached'); onReady?.(); }
    else setState('wait');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, srcSet]);

  if (!url || state === 'gone') return null;

  const onLoad = (e) => {
    const img = e.currentTarget;
    const done = () => { if (ref.current === img) { setState((s) => (s === 'cached' ? s : 'loaded')); onReady?.(); } };
    if (img.decode) img.decode().then(done, done); else done();
  };
  const onError = () => {
    if (fallback && cur !== fallback) setCur(fallback);
    else { setState('gone'); onReady?.(); }
  };

  const shown = state === 'cached' || state === 'loaded';
  return (
    <img
      ref={ref}
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'auto' : 'async'}
      fetchpriority={priority ? 'high' : undefined}
      onLoad={onLoad}
      onError={onError}
      className={`gzimg${shown ? ' is-on' : ''}${state === 'loaded' && fade ? ' gz-fade' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      {...rest}
    />
  );
}
