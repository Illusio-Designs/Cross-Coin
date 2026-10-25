// @generated — DO NOT EDIT. Source: shared/frontend/SmoothScroll.jsx
// Edit that file then run: node scripts/sync-frontend-shared.mjs
'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Lenis smooth-scroll — shared by all 7 storefronts (shared/frontend, stamped
 * into each brand by scripts/sync-frontend-shared.mjs). Mounted once around
 * the whole app (app/layout or pages/_app), so every page scrolls the same.
 *
 * - Same feel as the first stores had it: ~1.1 s glide, exponential ease-out.
 * - Panels that scroll on their own (cart drawer, menus, search, pop-ups)
 *   keep their native scroll (allowNestedScroll; data-lenis-prevent still
 *   works too).
 * - While a pop-up locks the page (overflow hidden on <html> or <body>),
 *   smoothing steps aside so the page underneath doesn't move.
 * - In-page "#section" links glide instead of jumping.
 * - Shoppers who ask for reduced motion get normal scrolling.
 */
function pageLocked() {
  const html = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return html.overflowY === 'hidden' || body.overflowY === 'hidden' || body.position === 'fixed';
}

export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      allowNestedScroll: true,
      autoToggle: true,
      anchors: true,
      prevent: () => pageLocked(),
    });
    // Lenis animates the scroll itself; CSS smooth scrolling on top of it
    // would make every step lag twice.
    const prevBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.documentElement.style.scrollBehavior = prevBehavior;
    };
  }, []);

  return children;
}
