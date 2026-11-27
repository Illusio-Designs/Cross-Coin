/**
 * Parse a shipping provider's serviceability/rate response into a decision.
 *
 * Providers differ:
 *   - iThink  → { data: { delhivery: {cod,prepaid,…}, … } }
 *               (its service may wrap that as [ {status,data} ])
 *   - Shipping   → an array of courier rows [{ delivery:'yes', cod:'yes', … }]
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

/**
 * Flatten an iThink serviceability reply into a normalised courier list that
 * the auto-selector and diagnostics can use directly.
 *
 * iThink returns the couriers in one of THREE shapes:
 *   A) rate/check.json — an ARRAY of rows WITH rates:
 *        [{ logistic_name:'Xpressbees', service_type:'Surface', logistic_id:'1',
 *           cod:'Y', prepaid:'Y', rate:86 }, …]
 *   B) pincode_intl/check.json — an ARRAY of intl rows:
 *        [{ logistics_name:'Aramex', logistics_service_type:'…', is_serviceable:'Yes' }]
 *   C) pincode/check.json — an OBJECT keyed by PINCODE, whose value holds the
 *      couriers keyed by NAME (plus city/state meta):
 *        { data:{ '431136':{ city_name, state_name,
 *                             Xpressbees:{mode,cod,prepaid,pickup}, Delhivery:{…} } } }
 *   (and the older { data:{ delhivery:{cod,prepaid,pickup} } } keyed-by-courier)
 *
 * Field names differ between shapes/versions, so we look up every alias we've
 * seen. `code` is the value the booking API (order/add.json → `logistics`)
 * expects back; `s_type` is its service type.
 *
 * Returns: [{ code, id, s_type, is_serviceable, cod, prepaid, pickup, delivery, raw }]
 */
function looksLikeCourierRow(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && [
    'cod', 'prepaid', 'cod_available', 'is_cod', 'prepaid_available', 'pickup',
    'delivery', 'is_serviceable', 'serviceable', 'rate', 'freight_charges',
    'total_charges', 'total_amount', 'logistic_name', 'logistics_name', 'courier_name',
    'service_type', 's_type', 'mode',
  ].some((field) => field in v);
}

function extractIThinkCouriers(raw) {
  const list = [];
  function collect(node, key = null, mode = null, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 6) return;
    if (Array.isArray(node)) {
      node.forEach((child) => collect(child, key, mode, depth + 1));
    } else if (looksLikeCourierRow(node)) {
      list.push({ key, val: node, mode });
    } else {
      for (const [childKey, child] of Object.entries(node)) {
        if (/^(air|surface|standard|ground|express)$/i.test(childKey)) {
          collect(child, key, childKey, depth + 1);
        } else {
          const name = /^(?:data|courier_data|couriers|rates|[0-9]+)$/i.test(childKey) ? key : childKey;
          collect(child, name, mode, depth + 1);
        }
      }
    }
  }
  collect(raw);

  return list.map(({ key, val, mode }) => {
    const c = val || {};
    // Booking `logistics` value: iThink's canonical courier name (or the object
    // key, which is the same code in the keyed shape).
    const code = c.logistics_name || c.logistic_name || c.logistics || c.logistic || c.courier_name
      || c.name || c.code || key || c.logistics_id || c.logistic_id || c.id;
    const s_type = c.logistics_service_type || c.service_type || c.s_type
      || c.mode || c.serviceType || c.service || mode || 'surface';
    return {
      code: code != null ? String(code).trim() : '',
      id: c.logistics_id || c.logistic_id || c.courier_id || c.id || null,
      s_type: String(s_type),
      is_serviceable: c.is_serviceable != null ? c.is_serviceable
        : (c.serviceable != null ? c.serviceable : undefined),
      cod: c.cod ?? c.cod_available ?? c.is_cod,
      prepaid: c.prepaid ?? c.prepaid_available,
      pickup: c.pickup,
      delivery: c.delivery,
      raw: c,
    };
  }).filter((c) => c.code);
}

module.exports = { parseServiceability, extractIThinkCouriers };
