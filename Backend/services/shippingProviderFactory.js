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
  const providerName = await settingsHelper.getSetting(brandId, 'SHIPPING_PROVIDER', 'fship');
  return getProviderByName(providerName, brandId);
}

/**
 * Get a specific provider by name (skips the DB lookup).
 *
 * @param {'fship'|'ithink'} providerName
 * @param {number} brandId
 * @returns {FShipService|IThinkService}
 */
function getProviderByName(providerName, brandId = 1) {
  const key = `${brandId}:${providerName}`;

  if (instanceCache.has(key)) {
    return instanceCache.get(key);
  }

  let service;
  switch (providerName) {
    case 'ithink': {
      const { IThinkService } = require('./iThinkService');
      service = new IThinkService(brandId);
      break;
    }
    case 'fship':
    default: {
      const FShipService = require('./fshipService');
      // FShipService is exported as a singleton; create a fresh instance for the brand
      if (typeof FShipService === 'function') {
        service = new FShipService(brandId);
      } else if (FShipService.constructor && FShipService.brandId !== undefined) {
        // Already a singleton — reuse if same brand, else we can't easily clone
        service = FShipService;
      } else {
        service = FShipService;
      }
      break;
    }
  }

  instanceCache.set(key, service);
  return service;
}

/**
 * Get the provider name string for a brand (for storing in order_shipments.provider).
 */
async function getProviderName(brandId = 1) {
  return await settingsHelper.getSetting(brandId, 'SHIPPING_PROVIDER', 'fship');
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
