/**
 * Shipping Service — the canonical front-door for shipping operations.
 *
 *   const shipping = require('../services/shippingService.js');
 *   await shipping.createOrder(brandId, orderData);
 *   await shipping.trackByAwb(brandId, awb);
 *   await shipping.cancelShipment(brandId, awb, reason);
 *
 * Under the hood it asks `shippingProviderFactory` for the right
 * provider (iThink today, FShip historically — controlled per-brand
 * via the `SHIPPING_PROVIDER` setting). Calling code stays free of
 * provider-specific knowledge.
 *
 * Both providers expose the same surface:
 *   createForwardOrder, createOrUpdateForwardOrder, getTrackingHistory,
 *   getShipmentStatus, cancelOrder, calculateRates, checkServiceability,
 *   getShippingLabel, registerPickup, mapFShipStatusToCrossCoin,
 *   calculateShipmentDimensions, testConnection.
 *
 * To add a new provider:
 *   1. Implement the same surface as a class in services/.
 *   2. Register the brand setting value in shippingProviderFactory.js.
 *   3. Existing callers keep working unchanged.
 */

const factory = require('./shippingProviderFactory.js');
const { logger } = require('../config/logging.js');

async function getProvider(brandId = 1) {
  return factory.getShippingProvider(brandId);
}

async function getProviderName(brandId = 1) {
  return factory.getProviderName(brandId);
}

/**
 * Create a forward shipment for an order. Returns whatever the
 * underlying provider returns — typically { success, orderId, waybill,
 * labelUrl } on success or { success: false, error } on failure.
 */
async function createOrder(brandId, orderData) {
  const provider = await getProvider(brandId);
  return provider.createOrUpdateForwardOrder
    ? provider.createOrUpdateForwardOrder(orderData)
    : provider.createForwardOrder(orderData);
}

async function trackByAwb(brandId, awb) {
  const provider = await getProvider(brandId);
  return provider.getTrackingHistory(awb);
}

async function getStatus(brandId, awb) {
  const provider = await getProvider(brandId);
  return provider.getShipmentStatus(awb);
}

async function cancelShipment(brandId, awb, reason = 'Customer request') {
  const provider = await getProvider(brandId);
  return provider.cancelOrder(awb, reason);
}

async function calculateRates(brandId, rateData) {
  const provider = await getProvider(brandId);
  return provider.calculateRates(rateData);
}

async function checkServiceability(brandId, sourcePincode, destinationPincode) {
  const provider = await getProvider(brandId);
  return provider.checkServiceability(sourcePincode, destinationPincode);
}

async function getLabel(brandId, waybills) {
  const provider = await getProvider(brandId);
  // iThink's method is getLabel({ waybills }); FShip's is getShippingLabel(waybill).
  // Normalise here so callers don't care.
  const list = Array.isArray(waybills) ? waybills : [waybills];
  if (typeof provider.getLabel === 'function') {
    return provider.getLabel({ waybills: list });
  }
  return provider.getShippingLabel(list[0]);
}

async function testConnection(brandId) {
  const provider = await getProvider(brandId);
  return provider.testConnection();
}

/**
 * Clear cached provider instances. Call after toggling SHIPPING_PROVIDER
 * in brand_settings so the next request picks up the new provider.
 */
function clearProviderCache(brandId) {
  factory.clearCache(brandId);
  logger.info(`[shipping] provider cache cleared for brand ${brandId || 'all'}`);
}

module.exports = {
  // Direct factory access (escape hatch for code that needs provider-specific methods)
  getProvider,
  getProviderName,
  clearProviderCache,
  // Unified surface
  createOrder,
  trackByAwb,
  getStatus,
  cancelShipment,
  calculateRates,
  checkServiceability,
  getLabel,
  testConnection,
};
