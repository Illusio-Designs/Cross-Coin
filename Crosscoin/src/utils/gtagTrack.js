// Google Analytics 4 event tracking utility
export function gtagTrack(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/auth')) return;
  try {
    window.gtag('event', eventName, params);
  } catch (_) {}
}
