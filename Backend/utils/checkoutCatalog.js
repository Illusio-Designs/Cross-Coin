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
    error.code = 'CHECKOUT_CATALOG_UNAVAILABLE';
    throw error;
  }
  return results;
}
module.exports = { ensureCheckoutCatalog };
