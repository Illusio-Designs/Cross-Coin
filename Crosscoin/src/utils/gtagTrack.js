// Google Analytics 4 event tracking utility
export function gtagTrack(eventName, params = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      window.gtag('event', eventName, params);
    } catch (_) {}
  }
}
