// Hand-off from our own checkout to the thank-you page: the Purchase details
// (built from the cart before it was emptied), keyed by order number, so the
// page fires the Purchase once.
export const PURCHASE_KEY = 'cc-purchase';
let memoryPurchase = null;

export function savePurchaseForThankYou(orderNumber, data) {
  memoryPurchase = { orderNumber: String(orderNumber), data };
  try { sessionStorage.setItem(PURCHASE_KEY, JSON.stringify(memoryPurchase)); } catch (_) { /* blocked */ }
}

export function takePurchaseForThankYou(orderNumber) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PURCHASE_KEY) || 'null') || memoryPurchase;
    if (!saved || String(saved.orderNumber) !== String(orderNumber)) return null;
    return saved.data || {};
  } catch (_) {
    return memoryPurchase?.orderNumber === String(orderNumber) ? memoryPurchase.data : null;
  }
}

// A page reload must be able to retry if the pixel has not actually loaded.
export function completePurchaseForThankYou(orderNumber) {
  if (memoryPurchase?.orderNumber === String(orderNumber)) memoryPurchase = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PURCHASE_KEY) || 'null');
    if (String(saved?.orderNumber) === String(orderNumber)) sessionStorage.removeItem(PURCHASE_KEY);
  } catch (_) { /* optional storage */ }
}
