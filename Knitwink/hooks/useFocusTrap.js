'use client';

import { useEffect, useRef } from 'react';

/**
 * Trap keyboard focus inside `containerRef` while `active` is true.
 *
 *   const ref = useFocusTrap(isOpen, { onEscape: close });
 *   return isOpen ? <div ref={ref}>...</div> : null;
 *
 * Behaviour:
 *   - On activation: focuses the first focusable child (or the
 *     container itself if none), records what was focused before so
 *     we can restore it on close.
 *   - On Tab / Shift+Tab inside the container: wraps to first/last
 *     focusable element so focus can't escape into the page behind.
 *   - On Escape: calls onEscape if provided.
 *   - On deactivation: returns focus to the element that had it before
 *     the trap activated.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
].join(',');

export function useFocusTrap(active, { onEscape, initialFocusRef } = {}) {
  const containerRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    previousActiveRef.current = document.activeElement;

    const focusables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);

    const initial = initialFocusRef?.current || focusables()[0] || container;
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    try { initial.focus({ preventScroll: true }); } catch { /* ignore */ }

    const handleKey = (e) => {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation();
        onEscape(e);
        return;
      }
      if (e.key !== 'Tab') return;

      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKey);
    return () => {
      container.removeEventListener('keydown', handleKey);
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus({ preventScroll: true }); } catch { /* ignore */ }
      }
    };
  }, [active, onEscape, initialFocusRef]);

  return containerRef;
}
