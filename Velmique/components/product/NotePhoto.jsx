'use client';

import { useState } from 'react';
import { ik } from '@/lib/imagekit';

export default function NotePhoto({ image, width, alt = '' }) {
  let src = ik(image, width);
  if (/^https?:\/\/[^/]+\/api\/uploads\//i.test(src)) {
    try {
      const url = new URL(src);
      url.searchParams.set('tr', `w-${width},q-75,f-auto`);
      src = url.href;
    } catch {
      src = '';
    }
  }
  const [failedSrc, setFailedSrc] = useState('');
  if (!src || failedSrc === src) return null;
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />;
}
