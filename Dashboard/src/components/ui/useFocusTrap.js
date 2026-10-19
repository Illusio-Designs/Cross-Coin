import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus inside `ref` while `active` (Tab / Shift+Tab wrap),
 * calls onEscape on Esc, focuses `initialFocus` (a ref) or the first control
 * on open, and gives focus back to whatever had it before on close.
 * Used by SidePanel and the phone menu drawer.
 */
export default function useFocusTrap(ref, active, { onEscape, initialFocus } = {}) {
  const escape = useRef(onEscape);
  escape.current = onEscape;

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return undefined;
    const before = typeof document !== 'undefined' ? document.activeElement : null;
    const items = () => [...node.querySelectorAll(FOCUSABLE)];

    (initialFocus?.current || items()[0] || node).focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape' && escape.current) {
        e.stopPropagation();
        escape.current(e);
        return;
      }
      if (e.key !== 'Tab') return;
      const els = items();
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (before && typeof before.focus === 'function' && document.contains(before)) before.focus();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
}
