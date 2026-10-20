'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * next/image with the store's no-half-draw rule: the optimised photo stays
 * invisible over the `.sk` shimmer until it has loaded AND decoded, then
 * fades in. Use with `fill` inside a `relative` box of fixed size (same props
 * as next/image; optimisation settings are untouched).
 */
export function GatedImage({ alt = '', className = '', onLoad, onError, ...props }) {
  const [shown, setShown] = useState(false);
  const reveal = (e) => {
    onLoad?.(e);
    const img = e.currentTarget;
    const done = () => setShown(true);
    if (img && typeof img.decode === 'function') img.decode().then(done, done);
    else done();
  };
  return (
    <>
      {!shown && <span className="sk absolute inset-0" aria-hidden="true" />}
      <Image
        {...props}
        alt={alt}
        data-sk-img=""
        className={`kw-img${shown ? ' is-loaded' : ''}${className ? ' ' + className : ''}`}
        onLoad={reveal}
        onError={(e) => { onError?.(e); setShown(true); }}
      />
    </>
  );
}

export default GatedImage;
