const settingsHelper = require('./settingsHelper');

/**
 * Shipping Provider Factory
 *
 * Returns the correct shipping service instance based on brand settings.
 * Both FShipService and IThinkService expose the same interface:
 *   - createForwardOrder(orderData)
 *   - createOrUpdateForwardOrder(orderData)
 *   - getTrackingHistory(waybill)
 *   - getShipmentStatus(waybill)
 *   - cancelOrder(waybill, reason)
 *   - calculateRates(rateData)
 *   - checkServiceability(sourcePincode, destinationPincode)
 *   - getShippingLabel(waybills)
 *   - registerPickup(waybills)
 *   - mapFShipStatusToCrossCoin(status)  (name kept for backward compat)
 *   - calculateShipmentDimensions(items)
 *   - testConnection()
 */

// Cache instances per brand to avoid re-initialising on every call
const instanceCache = new Map();

/**
 * Get the shipping provider service for a brand.
 * Reads SHIPPING_PROVIDER from brand_settings (default: 'fship').
 *
 * @param {number} brandId
 * @returns {Promise<FShipService|IThinkService>}
 */
async function getShippingProvider(brandId = 1) {
  // FShip is retired — iThink is the only active provider. We ignore any stale
  // SHIPPING_PROVIDER='fship' brand setting and always return iThink.
  return getProviderByName('ithink', brandId);
}

/**
 * Get a specific provider by name (skips the DB lookup).
 *
 * FShip has been decommissioned. Every request — including legacy shipments
 * recorded as 'fship' — resolves to iThink so status refresh on historical
 * orders never crashes on a missing provider.
 *
 * @param {'ithink'|'fship'} providerName  (fship kept only for back-compat)
 * @param {number} brandId
 * @returns {IThinkService}
 */
function getProviderByName(providerName, brandId = 1) {
  const key = `${brandId}:ithink`;
  if (instanceCache.has(key)) {
    return instanceCache.get(key);
  }
  const { IThinkService } = require('./iThinkService');
  const service = new IThinkService(brandId);
  instanceCache.set(key, service);
  return service;
}

/**
 * Get the provider name string for a brand (for storing in order_shipments.provider).
 * Always 'ithink' now — any legacy 'fship' setting is coerced.
 */
async function getProviderName(brandId = 1) {
  const name = await settingsHelper.getSetting(brandId, 'SHIPPING_PROVIDER', 'ithink');
  return name === 'fship' ? 'ithink' : name;
}

/**
 * Clear cached instances (call when brand settings change).
 */
function clearCache(brandId) {
  if (brandId) {
    for (const key of instanceCache.keys()) {
      if (key.startsWith(`${brandId}:`)) instanceCache.delete(key);
    }
  } else {
    instanceCache.clear();
  }
}

module.exports = {
  getShippingProvider,
  getProviderByName,
  getProviderName,
  clearCache,
};
