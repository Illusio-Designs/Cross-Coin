'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Lenis smooth-scroll. Mounted once in the root layout, wraps the whole app.
 * Respects prefers-reduced-motion (skips smoothing for users who ask for it),
 * and cleans up its rAF loop + instance on unmount.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return children;
}
