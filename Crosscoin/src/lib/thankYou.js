// Hand-off from our own checkout to the thank-you page: the Purchase details
// (built from the cart before it was emptied), keyed by order number, so the
// page fires the Purchase once.
export const PURCHASE_KEY = 'cc-purchase';

export function savePurchaseForThankYou(orderNumber, data) {
  try { sessionStorage.setItem(PURCHASE_KEY, JSON.stringify({ orderNumber, data })); } catch (_) { /* blocked */ }
}

export function takePurchaseForThankYou(orderNumber) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PURCHASE_KEY) || 'null');
    if (saved?.orderNumber !== orderNumber) return null;
    sessionStorage.removeItem(PURCHASE_KEY);
    return saved.data || {};
  } catch (_) {
    return null;
  }
}
