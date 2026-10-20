// Ads report — GET /api/reports/ads?startDate=&endDate=&brandId=&level=campaign|adset|ad&campaign=&adset=
// Admin only (spend is money data; see routes/reportsRoutes.js).
//
// Meta side: ad_spend_daily (services/metaAdsService.js), by the Meta day in
// the range: spend, impressions, link clicks, Meta-reported purchases/value.
//
// Our side: orders PLACED in the range (cancelled left out), credited to the
// visit that led to them (orders.utm_tracking_id → utm_tracking), when that
// visit came from Meta (utm_source facebook / instagram / fb / ig / meta …,
// any case). An order is matched to a Meta row by NAME, inside the same store:
//   campaign ← utm_campaign, ad set ← utm_term, ad ← utm_content
// after normName() (case, spaces, "+" and %XX encoding ignored) — the ads
// carry utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}.
// Stages use the Overview's rules (salesReportService STAGE_SQL / JOINS / REFUND_SQL):
//   delivered       = delivered + customer-returned (it reached the customer)
//   delivered net   = their order value − refunds
//   RTO %           = RTO ÷ (delivered + RTO);  return % = returned ÷ delivered
//   ROAS            = delivered net ÷ spend   (money that actually came in)
//   Meta ROAS       = Meta purchase value ÷ spend (what Meta claims, before RTO)
//   cost per order  = spend ÷ our orders
//   profit after ads = delivered net − cost price of kept units − spend
//                      (before GST, shipping and payment fees)
//
// Strings from utm_tracking / orders are pinned to one collation (T()) — the
// live tables mix collations. Name matching itself happens in JS.

const { sequelize } = require('../../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../../config/logging.js');
const { parseRange, canSeeCost, brandOf, PLACED_SQL } = require('./common.js');
const { STAGE_SQL, JOINS, REFUND_SQL } = require('../salesReportService.js');
const { normName, ensureSchema } = require('../metaAdsService.js');

const T = (expr) => `CONVERT(${expr} USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
const META_SOURCES = ['facebook', 'instagram', 'fb', 'ig', 'meta', 'facebook.com', 'instagram.com', 'an', 'msg', 'messenger', 'audience_network'];
const SOURCE_SQL = `LOWER(TRIM(${T('u.utm_source')})) IN (:sources)`;
const IST_DAY = `DATE(CONVERT_TZ(o.created_at, '+00:00', '+05:30'))`;
const LEVELS = ['campaign', 'adset', 'ad'];

const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(num(v) * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const ratio = (a, b) => (b > 0 ? Math.round((a / b) * 100) / 100 : null);
const dayStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10));
const isMacro = (s) => /\{\{|\}\}|%7b%7b/i.test(String(s || ''));

// Key of a row at a level: store | campaign [| ad set [| ad]] (normalised names).
function keyAt(level, brandId, c, a, d) {
  const parts = [String(brandId), normName(c)];
  if (level !== 'campaign') parts.push(normName(a));
  if (level === 'ad') parts.push(normName(d));
  return parts.join('\u0001');
}

// ── Queries ──────────────────────────────────────────────────────────────────
function metaRows({ startDay, endDay, brandId }) {
  return q(
    `SELECT brand_id, campaign_name, adset_name, ad_id, ad_name, MAX(currency) AS currency,
            COUNT(DISTINCT campaign_id) AS campaign_ids,
            SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks,
            SUM(meta_purchases) AS purchases, SUM(meta_purchase_value) AS purchase_value
       FROM ad_spend_daily
      WHERE day BETWEEN :startDay AND :endDay AND brand_id IS NOT NULL${brandId ? ' AND brand_id = :brandId' : ''}
      GROUP BY brand_id, campaign_name, adset_name, ad_id, ad_name`,
    { startDay, endDay, brandId }
  );
}

function metaDaily({ startDay, endDay, brandId }) {
  return q(
    `SELECT brand_id, day, campaign_name, adset_name, SUM(spend) AS spend
       FROM ad_spend_daily
      WHERE day BETWEEN :startDay AND :endDay AND brand_id IS NOT NULL${brandId ? ' AND brand_id = :brandId' : ''}
      GROUP BY brand_id, day, campaign_name, adset_name`,
    { startDay, endDay, brandId }
  );
}

// Our Meta-tagged orders, grouped by store, India day and the raw utm names.
function orderRows({ start, end, brandId }) {
  return q(
    `SELECT o.brand_id, ${IST_DAY} AS day,
            ${T('u.utm_campaign')} AS campaign, ${T('u.utm_term')} AS adset, ${T('u.utm_content')} AS ad,
            COUNT(*) AS orders,
            SUM(${STAGE_SQL} IN ('delivered','returned')) AS delivered,
            SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') THEN o.final_amount - ${REFUND_SQL} ELSE 0 END) AS delivered_net,
            SUM(${STAGE_SQL} = 'rto') AS rto,
            SUM(${STAGE_SQL} = 'returned') AS returned,
            SUM(CASE WHEN ${STAGE_SQL} = 'delivered' THEN COALESCE(ck.cogs, 0) ELSE 0 END) AS cogs,
            SUM(CASE WHEN ${STAGE_SQL} = 'delivered' THEN COALESCE(ck.uncosted, 0) ELSE 0 END) AS uncosted
       FROM orders o
       JOIN utm_tracking u ON u.id = o.utm_tracking_id
       LEFT JOIN (
         SELECT oi.order_id,
                SUM(COALESCE(pv.cost_price, 0) * oi.quantity) AS cogs,
                SUM(CASE WHEN pv.cost_price IS NULL OR pv.cost_price = 0 THEN oi.quantity ELSE 0 END) AS uncosted
           FROM order_items oi
           JOIN orders o2 ON o2.id = oi.order_id AND o2.created_at BETWEEN :start AND :end
           LEFT JOIN product_variations pv ON pv.id = oi.variation_id
          GROUP BY oi.order_id
       ) ck ON ck.order_id = o.id
       ${JOINS}
      WHERE o.created_at BETWEEN :start AND :end AND ${PLACED_SQL} AND ${SOURCE_SQL}${brandId ? ' AND o.brand_id = :brandId' : ''}
      GROUP BY o.brand_id, day, campaign, adset, ad`,
    { start, end, brandId, sources: META_SOURCES }
  );
}

// Campaign names seen on Meta-tagged visits in the range (any outcome).
function visitCampaigns({ start, end, brandId }) {
  return q(
    `SELECT DISTINCT u.brand_id, ${T('u.utm_campaign')} AS campaign
       FROM utm_tracking u
      WHERE u.created_at BETWEEN :start AND :end AND ${SOURCE_SQL} AND u.utm_campaign IS NOT NULL${brandId ? ' AND u.brand_id = :brandId' : ''}`,
    { start, end, brandId, sources: META_SOURCES }
  );
}

// ── Building rows ────────────────────────────────────────────────────────────
const emptyOurs = () => ({ orders: 0, delivered: 0, deliveredNet: 0, rto: 0, returned: 0, cogs: 0, uncosted: 0 });
function addOurs(a, r) {
  a.orders += num(r.orders); a.delivered += num(r.delivered); a.deliveredNet += num(r.delivered_net);
  a.rto += num(r.rto); a.returned += num(r.returned); a.cogs += num(r.cogs); a.uncosted += num(r.uncosted);
  return a;
}

function finishRow(m, o, admin) {
  const spend = r2(m.spend);
  const row = {
    key: m.key, brandId: m.brandId, brand: m.brand, campaign: m.campaign, adset: m.adset, ad: m.ad, name: m.name,
    ads: m.ads, currency: m.currency,
    spend, impressions: num(m.impressions), clicks: num(m.clicks),
    ctr: pct(num(m.clicks), num(m.impressions)), cpc: ratio(spend, num(m.clicks)),
    metaPurchases: r2(m.purchases), metaPurchaseValue: r2(m.purchaseValue), metaRoas: ratio(m.purchaseValue, spend),
    orders: o.orders, delivered: o.delivered, deliveredNet: r2(o.deliveredNet), rto: o.rto, returned: o.returned,
    rtoPct: pct(o.rto, o.delivered + o.rto), returnPct: pct(o.returned, o.delivered),
    costPerOrder: o.orders ? r2(spend / o.orders) : null,
    roas: ratio(o.deliveredNet, spend),
    tracked: m.tracked,
  };
  if (admin) {
    row.cogs = r2(o.cogs);
    row.uncostedUnits = o.uncosted;
    row.profitAfterAds = r2(o.deliveredNet - o.cogs - spend);
  }
  return row;
}

async function handler(req, res) {
  try {
    const query = req.query || {};
    const { start, end } = parseRange(query);
    const brandId = brandOf(query);
    const admin = canSeeCost(req.user);
    const ymd = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
    const startDay = ymd(start);
    const endDay = ymd(end);
    const campaign = query.campaign ? String(query.campaign).slice(0, 255) : null;
    const adset = campaign && query.adset ? String(query.adset).slice(0, 255) : null;
    let level = LEVELS.includes(query.level) ? query.level : 'campaign';
    if (level === 'adset' && !campaign) level = 'campaign';
    if (level === 'ad' && !campaign) level = 'campaign';
    // A drill-down needs the store when more than one store is shown.
    const scopeBrand = campaign && query.scopeBrandId ? Number.parseInt(query.scopeBrandId, 10) || null : null;

    await ensureSchema();
    const p = { start, end, startDay, endDay, brandId };
    const [mRows, mDaily, oRows, vCamps, brands, linked, syncInfo] = await Promise.all([
      metaRows(p), metaDaily(p), orderRows(p), visitCampaigns(p),
      q('SELECT id, COALESCE(display_name, name) AS name FROM brands ORDER BY id'),
      q("SELECT brand_id, value FROM brand_settings WHERE `key` = 'META_AD_ACCOUNT_ID' AND value IS NOT NULL AND value <> ''"),
      q('SELECT MAX(last_synced_at) AS last_synced_at, COUNT(*) AS accounts, SUM(last_error IS NOT NULL) AS errors FROM ad_spend_sync WHERE brand_id IS NOT NULL'),
    ]);
    const brandName = new Map(brands.map((b) => [Number(b.id), b.name]));
    const linkedBrands = new Set(linked.map((l) => Number(l.brand_id)));

    // Scope (drill-down) filter on normalised names.
    const nc = campaign ? normName(campaign) : null;
    const na = adset !== null ? normName(adset) : null;
    const inScope = (bId, c, a) => (!nc || (normName(c) === nc && (!scopeBrand || Number(bId) === scopeBrand)))
      && (na === null || normName(a) === na);

    // Campaign names with Meta-tagged visits, per store.
    const visited = new Set(vCamps.map((v) => `${v.brand_id}\u0001${normName(v.campaign)}`));
    for (const o of oRows) visited.add(`${o.brand_id}\u0001${normName(o.campaign)}`);

    // ── Meta rows at the chosen level ──
    const meta = new Map();
    const currencies = new Set();
    for (const r of mRows) {
      if (r.currency) currencies.add(r.currency);
      if (!inScope(r.brand_id, r.campaign_name, r.adset_name)) continue;
      const k = keyAt(level, r.brand_id, r.campaign_name, r.adset_name, r.ad_name);
      let m = meta.get(k);
      if (!m) {
        m = {
          key: k, brandId: Number(r.brand_id), brand: brandName.get(Number(r.brand_id)) || `Store ${r.brand_id}`,
          campaign: r.campaign_name, adset: level !== 'campaign' ? r.adset_name : null, ad: level === 'ad' ? r.ad_name : null,
          ads: new Set(), currency: r.currency || null, spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0, _top: -1,
          tracked: visited.has(`${r.brand_id}\u0001${normName(r.campaign_name)}`),
        };
        meta.set(k, m);
      }
      // Display the spelling with the most spend.
      if (num(r.spend) > m._top) {
        m._top = num(r.spend);
        m.campaign = r.campaign_name;
        if (level !== 'campaign') m.adset = r.adset_name;
        if (level === 'ad') m.ad = r.ad_name;
      }
      m.ads.add(r.ad_id);
      m.spend += num(r.spend); m.impressions += num(r.impressions); m.clicks += num(r.clicks);
      m.purchases += num(r.purchases); m.purchaseValue += num(r.purchase_value);
    }
    for (const m of meta.values()) {
      m.name = level === 'campaign' ? m.campaign : level === 'adset' ? m.adset : m.ad;
      m.ads = m.ads.size;
    }

    // ── Our orders at the chosen level ──
    const ours = new Map();
    const oursDaily = new Map(); // day -> delivered net of matched orders
    let taggedOrders = 0;
    let taggedDeliveredNet = 0;
    for (const r of oRows) {
      if (!inScope(r.brand_id, r.campaign, r.adset)) continue;
      taggedOrders += num(r.orders);
      taggedDeliveredNet += num(r.delivered_net);
      const k = keyAt(level, r.brand_id, r.campaign, r.adset, r.ad);
      addOurs(ours.get(k) || ours.set(k, emptyOurs()).get(k), r);
      if (meta.has(k)) {
        const d = dayStr(r.day);
        oursDaily.set(d, (oursDaily.get(d) || 0) + num(r.delivered_net));
      }
    }

    const rows = [...meta.values()]
      .map((m) => finishRow(m, ours.get(m.key) || emptyOurs(), admin))
      .sort((a, b) => b.spend - a.spend || b.orders - a.orders);

    // ── KPIs (current scope) ──
    const sum = (k) => rows.reduce((s, r) => s + num(r[k]), 0);
    const spend = r2(sum('spend'));
    const matchedOrders = sum('orders');
    const deliveredNet = r2(sum('deliveredNet'));
    const metaPurchases = r2(sum('metaPurchases'));
    const metaPurchaseValue = r2(sum('metaPurchaseValue'));
    const delivered = sum('delivered');
    const rto = sum('rto');
    const kpis = {
      spend,
      orders: matchedOrders,
      costPerOrder: matchedOrders ? r2(spend / matchedOrders) : null,
      deliveredNet,
      roas: ratio(deliveredNet, spend),
      metaPurchases,
      metaPurchaseValue,
      metaRoas: ratio(metaPurchaseValue, spend),
      metaOverCountPct: matchedOrders ? Math.round(((metaPurchases - matchedOrders) / matchedOrders) * 1000) / 10 : null,
      rtoPct: pct(rto, delivered + rto),
      spendNoOrders: r2(rows.filter((r) => !r.orders).reduce((s, r) => s + r.spend, 0)),
      rowsNoOrders: rows.filter((r) => !r.orders && r.spend > 0).length,
      taggedOrders,
      unmatchedOrders: Math.max(0, taggedOrders - matchedOrders),
      unmatchedDeliveredNet: r2(Math.max(0, taggedDeliveredNet - deliveredNet)),
      impressions: sum('impressions'),
      clicks: sum('clicks'),
    };
    if (admin) {
      kpis.cogs = r2(sum('cogs'));
      kpis.profitAfterAds = r2(deliveredNet - kpis.cogs - spend);
      kpis.uncostedUnits = sum('uncostedUnits');
    }

    // ── Gaps (always at campaign level, whole store scope) ──
    const metaCamps = new Map();
    for (const r of mRows) {
      const k = `${r.brand_id}\u0001${normName(r.campaign_name)}`;
      const g = metaCamps.get(k) || { brandId: Number(r.brand_id), campaign: r.campaign_name, spend: 0 };
      g.spend += num(r.spend);
      metaCamps.set(k, g);
    }
    const untagged = [...metaCamps.entries()]
      .filter(([k, g]) => g.spend > 0 && !visited.has(k))
      .map(([, g]) => ({ brandId: g.brandId, brand: brandName.get(g.brandId) || `Store ${g.brandId}`, campaign: g.campaign, spend: r2(g.spend) }))
      .sort((a, b) => b.spend - a.spend);
    const orderCamps = new Map();
    for (const r of oRows) {
      const k = `${r.brand_id}\u0001${normName(r.campaign)}`;
      const g = orderCamps.get(k) || { brandId: Number(r.brand_id), campaign: r.campaign, orders: 0, deliveredNet: 0 };
      g.orders += num(r.orders); g.deliveredNet += num(r.delivered_net);
      orderCamps.set(k, g);
    }
    const noSpend = [...orderCamps.entries()]
      .filter(([k, g]) => g.orders > 0 && !metaCamps.has(k))
      .map(([, g]) => ({
        brandId: g.brandId, brand: brandName.get(g.brandId) || `Store ${g.brandId}`,
        campaign: g.campaign || null, orders: g.orders, deliveredNet: r2(g.deliveredNet),
        reason: !g.campaign ? 'no_campaign' : isMacro(g.campaign) ? 'macro' : !linkedBrands.has(g.brandId) ? 'no_account' : 'no_spend',
      }))
      .sort((a, b) => b.orders - a.orders);

    // ── Daily series: spend vs delivered net sales of matched orders ──
    const spendDaily = new Map();
    for (const r of mDaily) {
      if (!inScope(r.brand_id, r.campaign_name, r.adset_name)) continue;
      const d = dayStr(r.day);
      spendDaily.set(d, (spendDaily.get(d) || 0) + num(r.spend));
    }
    const daily = [];
    for (let d = startDay; d <= endDay && daily.length < 400;) {
      daily.push({ day: d, spend: r2(spendDaily.get(d) || 0), deliveredNet: r2(oursDaily.get(d) || 0) });
      const nd = new Date(`${d}T00:00:00Z`); nd.setUTCDate(nd.getUTCDate() + 1); d = nd.toISOString().slice(0, 10);
    }

    const s = syncInfo[0] || {};
    return res.json({
      success: true,
      range: { startDate: startDay, endDate: endDay },
      brandId,
      level,
      scope: { campaign, adset, brandId: scopeBrand },
      canSeeCost: admin,
      currencies: [...currencies],
      sync: {
        lastSyncedAt: s.last_synced_at ? new Date(s.last_synced_at).toISOString() : null,
        accounts: num(s.accounts), accountsWithErrors: num(s.errors),
        linkedStores: [...linkedBrands],
      },
      hasSpendData: mRows.length > 0,
      kpis,
      rows,
      gaps: { untagged, noSpend },
      daily,
    });
  } catch (error) {
    logger.error('Ads report failed: ' + error.message);
    return res.status(500).json({ success: false, message: 'Failed to build the ads report' });
  }
}

module.exports = { handler, normName, keyAt, META_SOURCES };
