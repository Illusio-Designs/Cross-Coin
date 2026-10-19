'use strict';

/**
 * Shipping & courier page (Dashboard → Shipping & courier).
 *
 *  - Per-brand delivery fees exactly as checkout uses them:
 *      shipping_fees rows (orderType prepaid / cod, per brand_id) — the
 *      storefront cart lists these as the payment options and their fee;
 *      checkoutController.calcShippingFee charges the prepaid row;
 *      FREE_SHIPPING_THRESHOLD (brand setting) — the storefront waives the
 *      COD fee at/above it and draws the "add ₹X for FREE shipping" bar;
 *      COD_MAX_ORDER_VALUE (brand setting, default 1500) — orderController
 *      refuses COD above it.
 *  - Courier account status per brand (iThink credentials present) and the
 *    courier webhook log (shipment_webhook_events) with filters + paging.
 */

const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const settingsHelper = require('./settingsHelper.js');
const audit = require('./settingsAuditService.js');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const UNMATCHED = 'ignored: no matching order';
const PROBLEM_STATUSES = ['undelivered', 'rto', 'rto delivered'];

// Value the backend will actually use, and where it comes from.
async function settingWithSource(brandId, key, fallback) {
  const [row] = await q('SELECT value FROM brand_settings WHERE brand_id = :brandId AND `key` = :key LIMIT 1', { brandId, key });
  if (row && row.value !== null && String(row.value).trim() !== '') {
    return { value: String(await settingsHelper.getSetting(brandId, key, fallback)), source: 'brand' };
  }
  if (process.env[key]) return { value: String(process.env[key]), source: 'server' };
  return { value: fallback, source: 'default' };
}

const present = async (brandId, key) => {
  const [row] = await q('SELECT 1 AS ok FROM brand_settings WHERE brand_id = :brandId AND `key` = :key AND value IS NOT NULL AND value <> \'\' LIMIT 1', { brandId, key });
  if (row) return 'brand';
  return process.env[key] ? 'server' : null;
};

async function webhookSummary() {
  const [s] = await q(
    `SELECT COUNT(*) AS total,
            MAX(createdAt) AS last_received_at,
            SUM(createdAt >= NOW() - INTERVAL 24 HOUR) AS last_24h,
            SUM(createdAt >= CURDATE()) AS today,
            SUM(processed = 0 AND processing_error IS NOT NULL) AS failed,
            SUM(processing_error = :unmatched) AS unmatched,
            SUM(processing_error = :unmatched AND createdAt >= NOW() - INTERVAL 7 DAY) AS unmatched_7d,
            SUM((processing_error IS NOT NULL) OR (processed = 0 AND createdAt < NOW() - INTERVAL 10 MINUTE)
                OR mapped_status IN (:problem)) AS problems
       FROM shipment_webhook_events`,
    { unmatched: UNMATCHED, problem: PROBLEM_STATUSES }
  );
  return {
    total: Number(s?.total || 0),
    last24h: Number(s?.last_24h || 0),
    today: Number(s?.today || 0),
    failed: Number(s?.failed || 0),
    unmatched: Number(s?.unmatched || 0),
    unmatched7d: Number(s?.unmatched_7d || 0),
    problems: Number(s?.problems || 0),
    lastReceivedAt: s?.last_received_at || null,
    pushWorking: !!s?.last_received_at,
  };
}

async function overview() {
  const brands = await q('SELECT id, name, display_name, slug, status FROM brands ORDER BY id');
  const fees = await q('SELECT id, orderType, fee, brand_id FROM shipping_fees WHERE brand_id IS NOT NULL');

  const out = [];
  for (const b of brands) {
    const mine = fees.filter((f) => f.brand_id === b.id);
    const pre = mine.find((f) => f.orderType === 'prepaid');
    const cod = mine.find((f) => f.orderType === 'cod');
    const freeOver = await settingWithSource(b.id, 'FREE_SHIPPING_THRESHOLD', '0');
    const codMax = await settingWithSource(b.id, 'COD_MAX_ORDER_VALUE', '1500');
    const creds = {
      accessToken: await present(b.id, 'ITHINK_ACCESS_TOKEN'),
      secretKey: await present(b.id, 'ITHINK_SECRET_KEY'),
      pickupId: await present(b.id, 'ITHINK_PICKUP_ADDRESS_ID'),
      pincode: (await present(b.id, 'ITHINK_WAREHOUSE_PINCODE')) || (await present(b.id, 'DEFAULT_WAREHOUSE_PINCODE')),
    };
    out.push({
      id: b.id, name: b.display_name || b.name, slug: b.slug, status: b.status,
      prepaid: pre ? { id: pre.id, fee: Number(pre.fee) } : null,
      cod: cod ? { id: cod.id, fee: Number(cod.fee) } : null,
      freeOver: { value: Number(freeOver.value) || 0, source: freeOver.source },
      codMax: { value: Number(codMax.value) || 0, source: codMax.source },
      courier: {
        ...creds,
        connected: !!(creds.accessToken && creds.secretKey && creds.pickupId),
        environment: (await settingsHelper.getSetting(b.id, 'ITHINK_ENVIRONMENT', 'production')) || 'production',
      },
    });
  }
  return { brands: out, webhooks: await webhookSummary() };
}

const money = (v, max) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) return NaN;
  return Math.round(n * 100) / 100;
};

/**
 * Save one brand's delivery rules.
 * body: { prepaidFee, codFee, offerCod (bool), freeOver, codMax }
 */
async function saveBrand(brandId, body, userId) {
  const [brand] = await q('SELECT id FROM brands WHERE id = :brandId', { brandId });
  if (!brand) { const e = new Error('Brand not found'); e.status = 404; throw e; }
  const errors = {};
  const prepaidFee = money(body.prepaidFee, 10000);
  const codFee = money(body.codFee, 10000);
  const freeOver = money(body.freeOver, 1000000);
  const codMax = money(body.codMax, 1000000);
  if (Number.isNaN(prepaidFee)) errors.prepaidFee = 'Enter an amount between ₹0 and ₹10,000.';
  if (Number.isNaN(codFee)) errors.codFee = 'Enter an amount between ₹0 and ₹10,000.';
  if (Number.isNaN(freeOver)) errors.freeOver = 'Enter an amount, or 0 to switch it off.';
  if (Number.isNaN(codMax)) errors.codMax = 'Enter an amount.';
  if (Object.keys(errors).length) return { errors };

  const { ShippingFee } = require('../model/shippingFeeModel.js');
  const rows = await ShippingFee.findAll({ where: { brand_id: brandId } });
  const byType = Object.fromEntries(rows.map((r) => [r.orderType, r]));

  const upsertFee = async (type, fee) => {
    if (fee === undefined || fee === null) return;
    const row = byType[type];
    if (row && Number(row.fee) === fee) return;
    if (row) await row.update({ fee });
    else await ShippingFee.create({ orderType: type, fee, brand_id: brandId });
    await audit.record({ brandId, area: 'shipping', key: `${type}_delivery_fee`, action: row ? 'update' : 'create', oldValue: row ? Number(row.fee) : null, newValue: fee, userId, secret: false });
  };
  await upsertFee('prepaid', prepaidFee);
  if (body.offerCod === false) {
    // The storefront lists one payment option per row: no COD row = no COD
    // option. Keep at least a prepaid row so the cart doesn't fall back to
    // its built-in "both free" defaults.
    if (byType.cod) {
      if (!byType.prepaid && (prepaidFee === undefined || prepaidFee === null)) await upsertFee('prepaid', 0);
      await byType.cod.destroy();
      await audit.record({ brandId, area: 'shipping', key: 'cod_delivery_fee', action: 'delete', oldValue: Number(byType.cod.fee), userId, secret: false });
    }
  } else {
    await upsertFee('cod', codFee);
  }

  const settingsService = require('./brandSettingsService.js');
  const setSetting = async (key, value, description) => {
    if (value === undefined || value === null) return;
    const [row] = await q('SELECT value FROM brand_settings WHERE brand_id = :brandId AND `key` = :key LIMIT 1', { brandId, key });
    const v = String(value);
    if (row && String(row.value) === v) return;
    if (row) await settingsService.updateSetting(brandId, key, { value: v, updated_by: userId });
    else await settingsService.createSetting({ brand_id: brandId, key, value: v, category: key === 'FREE_SHIPPING_THRESHOLD' ? 'shipping' : 'payment', description, updated_by: userId });
    await audit.record({ brandId, key, action: row ? 'update' : 'create', oldValue: row ? row.value : null, newValue: v, userId, secret: false });
  };
  await setSetting('FREE_SHIPPING_THRESHOLD', freeOver, 'Free delivery over (₹)');
  await setSetting('COD_MAX_ORDER_VALUE', codMax, 'Cash on delivery allowed up to (₹)');
  settingsHelper.clearCache(brandId);
  return { ok: true };
}

/**
 * Courier updates log — server-side filter, search and paging.
 * opts: { page, pageSize, filter: all|problems|unmatched, q, brandId }
 */
async function listWebhookEvents(opts = {}) {
  const pageSize = Math.max(1, Math.min(parseInt(opts.pageSize, 10) || 25, 200));
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const where = [];
  const rep = { unmatched: UNMATCHED, problem: PROBLEM_STATUSES };
  if (opts.filter === 'unmatched') where.push('e.processing_error = :unmatched');
  else if (opts.filter === 'problems') {
    where.push(`((e.processing_error IS NOT NULL) OR (e.processed = 0 AND e.createdAt < NOW() - INTERVAL 10 MINUTE)
                 OR e.mapped_status IN (:problem))`);
  }
  const term = String(opts.q || '').trim().slice(0, 60);
  if (term) {
    rep.qp = `${term}%`;
    where.push('(e.waybill LIKE :qp OR e.order_ref LIKE :qp OR o.order_number LIKE :qp OR r.return_number LIKE :qp)');
  }
  const brandId = parseInt(opts.brandId, 10);
  if (brandId) { rep.brandId = brandId; where.push('COALESCE(o.brand_id, r.brand_id) = :brandId'); }

  // The two tables use different collations; compare in the orders/returns
  // collation so their waybill indexes are used.
  const FROM = `FROM shipment_webhook_events e
    LEFT JOIN orders o ON o.shipping_waybill = e.waybill COLLATE utf8mb4_general_ci
    LEFT JOIN returns r ON o.id IS NULL AND r.pickup_awb = e.waybill COLLATE utf8mb4_general_ci
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;

  const [{ n }] = await q(`SELECT COUNT(*) AS n ${FROM}`, rep);
  const rows = await q(
    `SELECT e.id, e.provider, e.event_key, e.waybill, e.order_ref, e.courier_status, e.mapped_status,
            e.processed, e.processing_error, e.createdAt, e.processedAt,
            o.id AS order_id, o.order_number, o.status AS order_status,
            r.id AS return_id, r.return_number, r.status AS return_status,
            COALESCE(o.brand_id, r.brand_id) AS brand_id
       ${FROM}
      ORDER BY e.id DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    rep
  );
  return { events: rows, total: Number(n || 0), page, pageSize, summary: await webhookSummary() };
}

module.exports = { overview, saveBrand, listWebhookEvents, webhookSummary };
