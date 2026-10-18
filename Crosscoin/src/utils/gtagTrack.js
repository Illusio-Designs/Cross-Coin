// Queue early events; deduplicate purchases within this browser session.
const earlyGoogleEvents = [];
const sentGooglePurchases = new Set();
let googleListenerAdded = false;
export function gtagTrack(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/auth')) return;
  if (!window.gtag || !window.__brandGa4Ready) {
    if (earlyGoogleEvents.length < 100) earlyGoogleEvents.push([eventName, params]);
    if (!googleListenerAdded) {
      googleListenerAdded = true;
      window.addEventListener('brand-ga4-ready', () => {
        if (!window.gtag || !window.__brandGa4Ready) return;
        for (const [name, data] of earlyGoogleEvents.splice(0)) gtagTrack(name, data);
      });
    }
    return;
  }
  const orderId = eventName === 'purchase' ? params.transaction_id : null;
  const key = `ga4_purchase_${orderId}`;
  if (orderId) {
    if (sentGooglePurchases.has(orderId)) return;
    try { if (sessionStorage.getItem(key) === '1') return; } catch (_) {}
  }
  try {
    window.gtag('event', eventName, params);
    if (orderId) {
      sentGooglePurchases.add(orderId);
      try { sessionStorage.setItem(key, '1'); } catch (_) {}
    }
  } catch (_) {}
}
