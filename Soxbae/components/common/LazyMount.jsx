'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Builds its children only when the shopper scrolls near them, so the first
 * screen (photo, price, Buy) loads and becomes usable first. Until then a
 * placeholder of roughly the section's height holds the place; it is swapped
 * well before it reaches the screen (`margin`), so nothing jumps where the
 * shopper is looking. Search engines render the page with a tall window, so
 * the sections still mount for them.
 */
export default function LazyMount({ children, minHeight = 400, margin = '900px' }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShow(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); }
    }, { rootMargin: `${margin} 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [show, margin]);

  if (show) return children;
  return <div ref={ref} aria-hidden="true" style={{ minHeight }} />;
}
