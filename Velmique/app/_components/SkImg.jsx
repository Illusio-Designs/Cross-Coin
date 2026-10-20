'use client';

import { useCallback, useState } from 'react';

/* A plain <img> that shimmers (`.sk-img`, app/mint.css) until it has loaded
   or failed. Every attribute is passed through untouched — same src, loading,
   fetchPriority, decoding — so image sources and optimisation don't change.
   The box itself must already be sized by its CSS (aspect-ratio or
   width/height), which every call site guarantees, so nothing shifts. */
export default function SkImg({ className = '', onLoad, onError, alt = '', ...props }) {
  const [done, setDone] = useState(false);
  // Images that finished before hydration never fire onLoad for React.
  const ref = useCallback((el) => { if (el && el.complete) setDone(true); }, []);
  const cls = `${className}${done ? '' : ' sk-img'}`.trim();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      ref={ref}
      alt={alt}
      className={cls || undefined}
      onLoad={(e) => { setDone(true); onLoad?.(e); }}
      onError={(e) => { setDone(true); onError?.(e); }}
    />
  );
}
