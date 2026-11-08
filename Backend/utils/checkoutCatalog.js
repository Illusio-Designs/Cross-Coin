// A successful HTTP transport response can still contain a provider rejection.
// Inspect only explicit failure flags; do not invent a provider response schema.
function assertCatalogPushAccepted(body) {
  const failed = (value) => value === false || ['FALSE', 'FAILED', 'FAILURE', 'ERROR', 'REJECTED'].includes(String(value ?? '').trim().toUpperCase());
  const envelopes = [body, body?.result, body?.data].filter((value) => value && typeof value === 'object' && !Array.isArray(value));
  if (envelopes.some((value) => failed(value.success) || failed(value.status))) {
    const error = new Error('Shiprocket rejected the product catalog update.');
    error.status = 502;
    error.code = 'CHECKOUT_CATALOG_REJECTED';
    throw error;
  }
}

// Opening the hosted checkout with an empty or failed catalog can flash its
// window and immediately return the shopper to the store. Fail before opening.
async function ensureCheckoutCatalog(sync) {
  let results;
  try { results = await sync(); } catch {
    results = null;
  }
  if (!Array.isArray(results) || !results.length || results.some((row) => !row || ![true, 'unchanged', 'background'].includes(row.pushed))) {
    const error = new Error('Checkout could not prepare these products. Please try again shortly.');
    error.status = 503;
    error.code = Array.isArray(results) && results.some((row) => row?.code === 'CHECKOUT_CATALOG_REJECTED') ? 'CHECKOUT_CATALOG_REJECTED' : 'CHECKOUT_CATALOG_UNAVAILABLE';
    throw error;
  }
  return results;
}
module.exports = { ensureCheckoutCatalog, assertCatalogPushAccepted };
