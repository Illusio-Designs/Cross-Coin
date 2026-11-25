const { Op } = require('sequelize');
const Brand = require('../model/brandModel.js');
const { Order } = require('../model/orderModel.js');
const settings = require('./settingsHelper.js');
const shiprocket = require('./customCheckoutService.js');
const { logger } = require('../config/logging.js');
const { razorpayOrderReferences, verifyShiprocketRecovery } = require('../utils/shiprocketPaymentRecovery.js');

const PAGE_SIZE = 50;
const MAX_PAGES = 4;
const LOOKBACK_MS = 48 * 60 * 60 * 1000;

async function enabledBrands() {
  const brands = await Brand.findAll({ where: { status: 'active' }, attributes: ['id', 'slug'], order: [['id', 'ASC']] });
  const enabled = await Promise.all(brands.map((brand) => settings.getSetting(brand.id, 'SHIPROCKET_CHECKOUT_ENABLED', 'false')));
  return brands.filter((_, index) => String(enabled[index]).toLowerCase() === 'true');
}

async function orderPage(brandId, page) {
  return orderRows(await shiprocket.listCheckoutOrders(brandId, { page, limit: PAGE_SIZE }));
}

function orderRows(response) {
  const data = response?.result ?? response?.data ?? response;
  const rows = Array.isArray(data) ? data : data?.orders ?? data?.data?.orders ?? data?.data;
  if (!Array.isArray(rows) || response?.success === false || data?.success === false) {
    throw new Error('Shiprocket returned an invalid order list.');
  }
  return rows;
}

function orderReference(order, since) {
  if (!order || shiprocket.isCodOrder(order, order.payments?.[0])) return null;
  const paymentStatus = String(order.payment_status || '').toLowerCase();
  if (paymentStatus && paymentStatus !== 'success') return null;
  const created = Date.parse(order.created_at || order.createdAt || order.order_date || '');
  if (Number.isFinite(created) && created < since) return null;
  const id = String(order.platform_order_id || order.order_id || '').trim();
  return /^[a-zA-Z0-9_-]{1,96}$/.test(id) ? id : null;
}

async function findShiprocketOrderForPayment(payment) {
  const { fetchProviderOrder } = require('../controller/customCheckoutController.js');
  const brands = await enabledBrands();
  const scans = await Promise.allSettled(brands.map(async (brand) => {
    const exact = new Set();
    const possible = new Set();
    for (let page = 0; page < MAX_PAGES; page++) {
      const rows = await orderPage(brand.id, page);
      for (const row of rows) {
        const id = orderReference(row);
        if (!id) continue;
        const entries = [row, ...(Array.isArray(row.payments) ? row.payments.filter(Boolean) : [])];
        const knownMatch = entries.some((entry) =>
          [entry.razorpay_payment_id, entry.pg_transaction_id, entry.txn_id].includes(payment.id) ||
          (payment.order_id && razorpayOrderReferences(entry).includes(payment.order_id)));
        if (knownMatch) exact.add(id);
        else if (possible.size < 8 && (row.total_amount_payable == null || Math.round(Number(row.total_amount_payable) * 100) === Number(payment.amount))) {
          const created = Date.parse(row.created_at || row.createdAt || row.order_date || '');
          if (!Number.isFinite(created) || !payment.created_at || Math.abs(created - Number(payment.created_at) * 1000) <= LOOKBACK_MS) possible.add(id);
        }
      }
      if (rows.length < PAGE_SIZE) break;
    }
    return { brand, exact, possible };
  }));
  const available = scans.flatMap((scan) => scan.status === 'fulfilled' ? [scan.value] : []);
  const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
  if (!available.length) fail('Shiprocket checkout orders could not be loaded for the enabled stores. Try again.', 502);

  const verify = async (field) => {
    const candidates = available.flatMap(({ brand, exact, possible }) => [...(field === 'exact' ? exact : possible)]
      .filter((id) => field === 'exact' || !exact.has(id)).map((id) => ({ brand, id })));
    const found = await Promise.all(candidates.map(async ({ brand, id }) => {
      let details;
      try { details = await fetchProviderOrder(brand.id, id); }
      catch { return { unavailable: true }; }
      try { verifyShiprocketRecovery(details, id, payment); }
      catch (error) { return { mismatch: error.message }; }
      const store = String(shiprocket.parseAttrs(details.cart_data?.custom_attributes).store ||
        shiprocket.parseAttrs(details.custom_attributes).store || brand.slug).trim().toLowerCase();
      return { brandId: brand.id, id, details, store };
    }));
    const matches = new Map(found.filter((item) => item.details).map((item) => [`${item.store}:${item.id}`, item]));
    if (matches.size > 1) fail('More than one Shiprocket checkout matches this payment. Review the provider records before recovering it.');
    return { match: matches.values().next().value, unavailable: found.some((item) => item.unavailable), mismatch: found.find((item) => item.mismatch)?.mismatch };
  };

  const exact = await verify('exact');
  if (exact.match && !exact.unavailable) return exact.match;
  if (exact.unavailable) fail('Shiprocket listed a possible match, but its checkout details could not be verified. Try again.', 502);
  const other = await verify('possible');
  if (other.match) return other.match;
  if (exact.mismatch) fail(exact.mismatch);
  if (other.unavailable || available.length !== brands.length) fail('Some Shiprocket checkout records could not be read. Try again.', 502);
  fail('No verified Shiprocket checkout matched this payment in the recent records.');
}

async function reconcileShiprocketOrders() {
  const { verifyAndIngest } = require('../controller/customCheckoutController.js');
  const brands = await Brand.findAll({ where: { status: 'active' }, attributes: ['id', 'slug'] });
  const since = Date.now() - LOOKBACK_MS;
  const errors = [];
  let checked = 0;
  let recovered = 0;
  let scanned = 0;
  let limited = 0;
  let completed = 0;

  for (const brand of brands) {
    try {
      const enabled = await settings.getSetting(brand.id, 'SHIPROCKET_CHECKOUT_ENABLED', 'false');
      if (String(enabled).toLowerCase() !== 'true') continue;
      scanned++;
      const seen = new Set();
      const errorsBeforeScan = errors.length;
      for (let page = 0; page < MAX_PAGES; page++) {
        const rows = await orderPage(brand.id, page);
        const ids = [...new Set(rows.map((row) => orderReference(row, since)).filter((id) => id && !seen.has(id)))];
        ids.forEach((id) => seen.add(id));
        if (ids.length) {
          const existing = await Order.findAll({
            attributes: ['idempotency_key'],
            where: { idempotency_key: { [Op.in]: ids.map((id) => `cco:${id}`) } },
          });
          const saved = new Set(existing.map((order) => order.idempotency_key));
          for (const id of ids) {
            if (saved.has(`cco:${id}`)) continue;
            checked++;
            try {
              const result = await verifyAndIngest(brand.id, id, null, { prepaidOnly: true, since });
              if (result?.created) recovered++;
            } catch (error) {
              errors.push(`${brand.slug} order ${id}: ${error.message}`);
            }
          }
        }
        if (rows.length < PAGE_SIZE) break;
        if (page === MAX_PAGES - 1) limited++;
      }
      if (errors.length === errorsBeforeScan) completed++;
    } catch (error) {
      errors.push(`${brand.slug}: ${error.message}`);
    }
  }
  if (errors.length) logger.warn(`[shiprocket-reconciliation] ${errors.length} checks failed: ${errors[0]}`);
  const summary = `${scanned} stores scanned · ${checked} missing orders checked · ${recovered} recovered`
    + (errors.length ? ` · ${errors.length} failed` : '')
    + (limited ? ` · ${limited} stores reached the page limit` : '');
  return {
    status: errors.length ? (completed || recovered ? 'partial' : 'failed') : 'ok',
    summary,
    error: errors.length ? errors.slice(0, 20).join('\n') : null,
  };
}

module.exports = { reconcileShiprocketOrders, findShiprocketOrderForPayment, enabledBrands, orderPage, orderReference, PAGE_SIZE };
