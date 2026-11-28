// @generated — DO NOT EDIT. Source: shared/frontend/ProductDescription.jsx
// Edit that file then run: node scripts/sync-frontend-shared.mjs
'use client';

import { useEffect, useRef } from 'react';
import { withLazyDescriptionImages } from '../lib/descriptionImages';

function showOriginal(image) {
  if (image.tagName !== 'IMG' || !image.hasAttribute('data-description-responsive')) return;
  image.removeAttribute('data-description-responsive');
  image.removeAttribute('srcset');
}

export default function ProductDescription({ html, className }) {
  const container = useRef(null);
  useEffect(() => {
    for (const image of container.current.querySelectorAll('img[data-description-responsive]')) {
      if (image.complete && image.currentSrc && !image.naturalWidth) showOriginal(image);
    }
  }, [html]);

  return (
    <div ref={container} className={className} onErrorCapture={(event) => showOriginal(event.target)}
      dangerouslySetInnerHTML={{ __html: withLazyDescriptionImages(html) }} />
  );
}
