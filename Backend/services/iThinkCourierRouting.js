const { extractIThinkCouriers } = require('../utils/serviceability.js');
const settings = require('./settingsHelper.js');

const tokens = (raw) => String(raw || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const yes = (value) => ['yes', 'y', '1', 'true'].includes(String(value).trim().toLowerCase());
const isCourierRouteRejection = (message) => /(?:not|non)[\s-]*(?:servic[e]?able|deliverable)|unserviceable|(?:route|pincode|courier|service|cod|prepaid)[^.;]{0,65}\b(?:not available|not supported)|does not (?:serve|support)/i.test(String(message || ''));
const isUnconfirmedIThinkBooking = (message) => /partially saved|^iThink (?:did not confirm an AWB|issued AWB )/i.test(String(message || ''));

async function getIThinkRoute(order) {
  const brand = order.brand_id || 1;
  const [from, preferred, excluded] = await Promise.all([
    settings.getSetting(brand, 'ITHINK_WAREHOUSE_PINCODE', '363641'),
    settings.getSetting(brand, 'COURIER_PRIORITY', 'delhivery, amazon, xpressbees, dtdc'),
    settings.getSetting(brand, 'COURIER_EXCLUDE', ''),
  ]);
  const quantity = order.OrderItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
  return {
    from: String(from || '').trim(),
    to: String(order.ShippingAddress?.pincode || '').trim(),
    paymentMode: String(order.payment_type).toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
    weight: Math.max(0.5, quantity * 0.07),
    length: 14,
    width: 3,
    height: 10 * quantity,
    productMrp: Number(order.final_amount) || Number(order.total_amount) || 500,
    preferred: tokens(preferred),
    excluded: tokens(excluded),
  };
}

const describeIThinkRoute = (route) => `pickup ${route.from} → delivery ${route.to} (${route.paymentMode})`;
const isCourierExcluded = (route, courier) => route.excluded.some((name) => String(courier).toLowerCase().includes(name));
const courierKey = (courier) => `${courier.logistics}/${courier.s_type}`;

function eligibleCouriers(rows, route, useMatrix) {
  return rows.flatMap((c) => {
    const mode = route.paymentMode === 'COD' ? c.cod : c.prepaid;
    if (isCourierExcluded(route, c.code) ||
        [mode, c.is_serviceable, c.delivery].some((flag) => flag != null && flag !== '' && !yes(flag))) return [];
    // A pickup-only service is never a forward delivery option. Rate rows
    // without payment flags can still be used when they quote this route.
    if (useMatrix && (mode == null || mode === '') && !yes(c.delivery) && !yes(c.is_serviceable)) return [];
    return [{
      ...c.raw,
      logistics: c.code.toLowerCase(),
      s_type: c.s_type.trim().toLowerCase(),
      cod: c.cod,
      prepaid: c.prepaid,
    }];
  });
}

async function discoverIThinkCouriers(provider, route, useMatrix = false) {
  const { from, to, paymentMode, weight, length, width, height, productMrp } = route;
  const raw = useMatrix
    ? await provider.checkServiceability(from, to)
    : await provider.getAvailableCouriers({ sourcePincode: from, destinationPincode: to, paymentMode, weight, length, width, height, productMrp });
  const rows = extractIThinkCouriers(raw);
  if (useMatrix && !rows.length) throw new Error('iThink did not return courier serviceability data');
  return eligibleCouriers(rows, route, useMatrix);
}

function orderIThinkOptions(options, route) {
  const rank = (courier) => [
    /econom|surface|ground|standard|deliver/i.test(courier.s_type) ? 0 : 1,
    route.preferred.some((name) => courier.logistics.includes(name)) ? 0 : 1,
  ];
  // Spread work across eligible preferred carriers in the same service tier.
  return options.map((courier) => ({ courier, rank: rank(courier), random: Math.random() }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.random - b.random)
    .map(({ courier }) => courier);
}

module.exports = { getIThinkRoute, describeIThinkRoute, isCourierExcluded, courierKey, discoverIThinkCouriers, orderIThinkOptions, isCourierRouteRejection, isUnconfirmedIThinkBooking };
