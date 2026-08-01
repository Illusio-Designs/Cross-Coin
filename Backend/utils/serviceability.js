/**
 * Parse a shipping provider's serviceability/rate response into a decision.
 *
 * Providers differ:
 *   - iThink  → { data: { delhivery: {cod,prepaid,…}, … } }
 *               (its service may wrap that as [ {status,data} ])
 *   - FShip   → an array of courier rows [{ delivery:'yes', cod:'yes', … }]
 *
 * SAFE BY DESIGN: if courier data exists but exposes NO recognisable delivery
 * flag, we return serviceable=true — we never falsely block a real customer on
 * an unfamiliar response shape. Only an empty result, or couriers that
 * explicitly report no delivery, mark a PIN code not serviceable.
 *
 * Returns { serviceable, cod_available, cod_allowed, estimated_delivery_days }.
 */
function parseServiceability(raw) {
  const unwrap = (Array.isArray(raw) && raw.length === 1 && raw[0] && raw[0].data) ? raw[0] : raw;

  let couriers = [];
  if (Array.isArray(unwrap)) {
    couriers = unwrap;
  } else if (unwrap && unwrap.data) {
    couriers = Array.isArray(unwrap.data)
      ? unwrap.data
      : (typeof unwrap.data === 'object'
          ? Object.entries(unwrap.data).map(([k, v]) => ({ logistic: k, ...(v || {}) }))
          : []);
  } else if (unwrap && typeof unwrap === 'object') {
    couriers = [unwrap];
  }

  const truthy = (v) => v === true || v === 1 || ['yes', '1', 'true', 'y'].includes(String(v).toLowerCase());

  if (couriers.length === 0) {
    return { serviceable: false, cod_available: false, cod_allowed: false, estimated_delivery_days: null };
  }

  const flagKeys = ['prepaid', 'cod', 'delivery', 'serviceable', 'pickup', 'status', 'is_serviceable'];
  const hasFlags = couriers.some((c) => flagKeys.some((k) => k in c));
  const deliverable = couriers.some((c) =>
    truthy(c.prepaid) || truthy(c.cod) || truthy(c.delivery) || truthy(c.serviceable)
    || truthy(c.pickup) || truthy(c.is_serviceable) || c.status === true
  );
  const serviceable = hasFlags ? deliverable : true;
  const cod = couriers.some((c) => truthy(c.cod) || truthy(c.cod_available) || truthy(c.is_cod));
  const edd = parseInt(couriers[0].estimated_delivery_days || couriers[0].edd || couriers[0].tat || 5, 10) || 5;

  return {
    serviceable,
    cod_available: cod,
    // Don't newly block COD unless a courier explicitly exposes COD flags.
    cod_allowed: hasFlags ? cod : true,
    estimated_delivery_days: edd,
  };
}

module.exports = { parseServiceability };
