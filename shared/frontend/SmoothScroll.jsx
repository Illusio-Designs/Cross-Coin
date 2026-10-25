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
 * - Pop-up scroll lock that holds: the stores lock the page by hiding
 *   overflow on <body>, but once <html> has an overflow of its own (the
 *   stores' CSS gives it one) that never reaches the page, and the page kept
 *   scrolling under the cart, menus and pop-ups. While <body> is locked we
 *   lock <html> too (keeping the scrollbar's space so nothing shifts) and
 *   release it the moment <body> is released.
 */
function bodyLocked() {
  const body = getComputedStyle(document.body);
  return body.overflowY === 'hidden' || body.position === 'fixed';
}

// Mirror the stores' <body> lock onto <html>, where it actually stops the
// page. Returns the cleanup.
function holdPopupLocks() {
  const html = document.documentElement;
  let held = null; // the html styles we replaced, while locked
  const sync = () => {
    const locked = bodyLocked();
    if (locked && !held) {
      held = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter, pad: html.style.paddingRight };
      const bar = window.innerWidth - html.clientWidth;
      if (window.CSS?.supports?.('scrollbar-gutter', 'stable')) html.style.scrollbarGutter = 'stable';
      else if (bar > 0) html.style.paddingRight = `${bar}px`;
      html.style.overflow = 'hidden';
    } else if (!locked && held) {
      html.style.overflow = held.overflow;
      html.style.scrollbarGutter = held.gutter;
      html.style.paddingRight = held.pad;
      held = null;
    }
  };
  const mo = new MutationObserver(sync);
  mo.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
  sync();
  return () => {
    mo.disconnect();
    if (held) { html.style.overflow = held.overflow; html.style.scrollbarGutter = held.gutter; html.style.paddingRight = held.pad; }
  };
}

function pageLocked() {
  const html = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return html.overflowY === 'hidden' || body.overflowY === 'hidden' || body.position === 'fixed';
}

export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const releaseLocks = holdPopupLocks();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return releaseLocks;

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
      releaseLocks();
    };
  }, []);

  return children;
}
