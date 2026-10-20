'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * An <img> whose box is held at `ratio` (with the store shimmer) until the
 * photo arrives, then follows the image's own height. Use for images whose
 * height is otherwise unknown (article covers), so the text below never jumps.
 * The src is passed through untouched.
 */
export default function ReservedImage({ src, alt = '', className = '', ratio = '16 / 9', ...rest }) {
  const [ready, setReady] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
  }, [src]);

  return (
    <div className={`${className}${ready ? '' : ' sk-reserve'}`} style={ready ? undefined : { aspectRatio: ratio }}>
      {!ready && <span className="sk sk-fill" aria-hidden="true" />}
      <img ref={ref} src={src} alt={alt} onLoad={() => setReady(true)} onError={() => setReady(true)} {...rest} />
    </div>
  );
}
