'use client';

import { useState } from 'react';
import ShimmerImg from '@/components/ui/ShimmerImg';

/**
 * An image whose box is held at `ratio` (with the store shimmer) until the
 * photo has fully loaded and decoded, then follows the image's own height.
 * For images whose height is otherwise unknown (article covers), so the text
 * below never jumps and the photo never paints half-downloaded.
 */
export default function ReservedImage({ src, alt = '', className = '', ratio = '16 / 9', width = 1400, priority = false }) {
  const [ready, setReady] = useState(false);
  return (
    <div className={`${className} sk-reserve`} style={ready ? undefined : { aspectRatio: ratio }}>
      <ShimmerImg src={src} alt={alt} width={width} priority={priority} onReveal={() => setReady(true)} />
    </div>
  );
}
