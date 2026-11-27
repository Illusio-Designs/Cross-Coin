const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { getShippingProvider } = require('./shippingProviderFactory.js');

function parseRupees(value) {
  const amount = String(value ?? '').trim();
  const rupeeFormat = /^-?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2}0*)?$/;
  if (!rupeeFormat.test(amount)) return null;
  const paise = Math.round(Number(amount.replace(/,/g, '')) * 100);
  return Number.isSafeInteger(paise) ? paise : null;
}

async function configuredAccounts() {
  const Brand = require('../model/brandModel.js');
  const brands = await Brand.findAll({ where: { status: 'active' }, attributes: ['id'] });
  const providers = await Promise.all(brands.map(async ({ id }) => {
    const provider = await getShippingProvider(id);
    await provider.initialize();
    return provider;
  }));
  const accounts = new Map();
  for (const provider of providers) {
    if (provider.accessToken && provider.secretKey &&
        (process.env.NODE_ENV !== 'production' || provider.env === 'production')) {
      // Brand settings can resolve to the same shared courier account.
      accounts.set(JSON.stringify([provider.env, provider.accessToken, provider.secretKey]), provider);
    }
  }
  return [...accounts.values()];
}

async function reconcileCod(date) {
  const accounts = await configuredAccounts();
  if (!accounts.length) return { status: 'not_configured', rows: [] };
  const checks = await Promise.allSettled(accounts.map((provider) => provider.getCodRemittance(date)));
  const reports = checks.flatMap((check) => check.status === 'fulfilled' ? [check.value] : []);
  const issues = [...new Set(reports.flatMap((report) => report.issues || []))];
  const summariesComplete = reports.length === accounts.length && reports.every((report) => Array.isArray(report.summary));
  const shipmentsComplete = reports.length === accounts.length && reports.every((report) => Array.isArray(report.shipments));
  const shipmentsAvailable = reports.some((report) => Array.isArray(report.shipments));
  if (!shipmentsAvailable && !reports.some((report) => Array.isArray(report.summary))) return { status: 'unavailable', rows: [], ...(issues.length ? { issues } : {}) };

  const byAwb = new Map();
  for (const entry of reports.flatMap((report) => report.shipments || [])) {
    const awb = String(entry?.airway_bill_no || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,100}$/.test(awb)) continue;
    const amountPaise = parseRupees(entry.price);
    const saved = byAwb.get(awb);
    if (!saved) {
      byAwb.set(awb, { awb, amountPaise });
    } else if (saved.amountPaise == null) {
      saved.amountPaise = amountPaise;
    } else if (amountPaise != null && saved.amountPaise !== amountPaise) {
      saved.conflict = true;
    }
  }

  const matches = new Map();
  const keys = [...byAwb.keys()];
  for (let offset = 0; offset < keys.length; offset += 300) {
    const orders = await sequelize.query(`SELECT s.waybill, s.tracking_number, o.order_number, o.final_amount, o.payment_type,
        (o.status = 'delivered' OR EXISTS (
          SELECT 1 FROM order_status_history h WHERE h.order_id = o.id AND h.status = 'delivered'
        )) AS delivery_confirmed
      FROM order_shipments s INNER JOIN orders o ON o.id = s.order_id
      WHERE LOWER(s.provider) = 'ithink' AND (s.waybill IN (:awb) OR s.tracking_number IN (:awb))`,
    { replacements: { awb: keys.slice(offset, offset + 300) }, type: QueryTypes.SELECT });
    for (const order of orders) {
      for (const key of new Set([order.waybill, order.tracking_number].filter(Boolean).map((awb) => awb.toUpperCase()))) {
        if (!matches.has(key)) matches.set(key, new Map());
        matches.get(key).set(order.order_number, order);
      }
    }
  }

  const rows = [...byAwb.values()].map(({ awb, amountPaise, conflict }) => {
    const orders = matches.get(awb);
    const order = orders?.size === 1 ? orders.values().next().value : null;
    const expectedPaise = order ? parseRupees(order.final_amount) : null;
    const status = conflict || orders?.size > 1 ? 'conflict' : !order ? 'missing'
      : String(order.payment_type).toLowerCase() !== 'cod' ? 'not_cod'
      : amountPaise == null ? 'courier_amount_unavailable'
      : expectedPaise == null ? 'order_amount_unavailable'
      : !Number(order.delivery_confirmed) ? 'delivery_not_confirmed'
      : amountPaise === expectedPaise ? 'matched' : 'amount_mismatch';
    return { awb, amountPaise, status, orderNumber: order?.order_number || null, expectedPaise };
  });
  const remittances = reports.flatMap((report) => report.summary || []);
  const amounts = remittances.map((entry) => parseRupees(entry.cod_remitted));
  const complete = summariesComplete && shipmentsComplete;
  const netRemittedPaise = summariesComplete && (amounts.length || (shipmentsComplete && !rows.length)) && amounts.every((value) => value != null)
    ? amounts.reduce((sum, value) => sum + value, 0) : null;
  return { status: complete ? 'ok' : 'partial', netRemittedPaise, rows, shipmentsAvailable,
    ...(issues.length ? { issues } : {}),
    matched: rows.filter((row) => row.status === 'matched').length };
}

module.exports = { reconcileCod, parseRupees };
