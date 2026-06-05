'use client';

import { useEffect, useState } from 'react';
import { pickImageForConnection, prefersReducedData } from '@/lib/netinfo';

/**
 * Connection-aware <img> wrapper.
 *
 * Drop-in for any place that has multiple size variants for an image
 * (thumb / small / medium / large). Picks the smallest one that still
 * looks acceptable for the user's connection.
 *
 *   <NetworkAwareImage
 *     variants={{ thumb: '...?w=80', small: '...?w=320', medium: '...?w=800', large: '...?w=1600' }}
 *     alt="Hero"
 *     className="..."
 *   />
 *
 * Why a client component: navigator.connection isn't available
 * server-side. We start with the `medium` variant to avoid a layout
 * shift, then swap to the network-appropriate variant after mount.
 *
 * If only a single URL is available, pass it as `src` and we'll honour
 * `prefersReducedData` only (e.g. defer the image until interaction).
 */

export default function NetworkAwareImage({
  variants,
  src,
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  className,
  style,
  width,
  height,
  onClick,
  ...rest
}) {
  // Default = medium so SSR HTML doesn't shift.
  const initial = variants?.medium || variants?.large || src;
  const [chosen, setChosen] = useState(initial);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (variants) {
      setChosen(pickImageForConnection(variants));
    } else if (prefersReducedData()) {
      // Single-URL mode: defer until user interaction on slow links.
      setSkipped(true);
    }
  }, [variants, src]);

  if (skipped) {
    return (
      <button
        type="button"
        onClick={() => setSkipped(false)}
        className={`${className || ''} no-touch-min`}
        style={{ display: 'block', background: '#f3f4f6', color: '#374151', fontSize: 12, padding: 12, ...style }}
      >
        Tap to load image (save-data on)
      </button>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={chosen}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      style={style}
      width={width}
      height={height}
      onClick={onClick}
      {...rest}
    />
  );
}
