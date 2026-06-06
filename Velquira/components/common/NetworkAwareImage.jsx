'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { prefersReducedData, pickImageForConnection } from '@/lib/netinfo';

/**
 * Connection-aware <Image>. On save-data / 2g, renders a tap-to-load
 * placeholder instead of downloading the full-res asset.
 */
export default function NetworkAwareImage({ variants = {}, fallbackSrc, alt = '', width, height, className, priority }) {
  const [reduced, setReduced] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);

  useEffect(() => { setReduced(prefersReducedData()); }, []);

  if (reduced && !forceLoad) {
    return (
      <button
        type="button"
        onClick={() => setForceLoad(true)}
        className={className}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: width || '100%', height: height || 240, background: '#f3f4f6', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: 6, cursor: 'pointer' }}
        aria-label={`Load image: ${alt}`}
      >
        Tap to load image
      </button>
    );
  }

  const src = pickImageForConnection(variants) || fallbackSrc;
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 800}
      className={className}
      priority={priority}
    />
  );
}
