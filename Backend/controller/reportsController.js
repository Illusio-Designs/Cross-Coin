const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');
const { BOT_SQL_REGEXP } = require('../utils/botDetect');
const { dayStartTZ, dayEndTZ, TZ_OFFSET } = require('../utils/dateRange.js');
// Shopify-style channel roll-up (Direct / Facebook / Instagram / Google / AI
// chatbot / Email / SMS / Referral), shared with the tracker and the anonymous
// pageview counter so the buckets never drift. Self-referrals → Direct.
const { channelOf } = require('../utils/channel');
const { isOwnHost } = require('../utils/ownHosts');

// Excludes bot/crawler user agents from a utm_tracking scan (belt-and-suspenders
// for rows recorded before ingestion-time bot filtering existed).
const NOT_BOT = `(user_agent IS NULL OR LOWER(user_agent) NOT REGEXP :bot)`;

const CHANNEL_ORDER = ['Direct', 'Facebook', 'Instagram', 'Google', 'AI chatbot', 'Email', 'SMS', 'Referral'];

// Parse a YYYY-MM-DD (or ISO) range, defaulting to the last 30 days. Day
// boundaries are anchored to the business timezone (IST, +05:30) — the SAME
// anchoring the dashboard/Overview uses (utils/dateRange.js) — so the report
// totals line up with the Overview instead of being shifted by 5.5h on a UTC
// host (which used to drop orders placed between 00:00–05:30 IST).
function parseRange(q) {
  // TZ_OFFSET → minutes, to compute "today" as an IST calendar date.
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(TZ_OFFSET);
  const offMin = m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10)) : 330;
  const istTodayYmd = new Date(Date.now() + offMin * 60000).toISOString().slice(0, 10);

  const endYmd = (q.endDate ? String(q.endDate) : istTodayYmd).slice(0, 10);
  let startYmd;
  if (q.startDate) {
    startYmd = String(q.startDate).slice(0, 10);
  } else {
    const endMidUtc = new Date(`${endYmd}T00:00:00.000Z`);
    startYmd = new Date(endMidUtc.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  // Fall back to the old behaviour only if the helpers can't parse the input.
  const start = dayStartTZ(startYmd) || new Date(new Date(startYmd).setHours(0, 0, 0, 0));
  const end = dayEndTZ(endYmd) || new Date(new Date(endYmd).setHours(23, 59, 59, 999));
  return { start, end };
}

// GET /api/reports/brand-traffic?startDate=&endDate=
// Brand-wise funnel: sessions (first-party visit tracking) → orders → revenue,
// with conversion rate and a channel (source/medium) breakdown per brand.
exports.getBrandTraffic = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    // Optional brand filter (?brandId=) — scopes every figure to one store.
    const brandIdNum = Number.parseInt(req.query.brandId, 10);
    const hasBrand = Number.isFinite(brandIdNum) && brandIdNum > 0;
    const repl = { start, end, bot: BOT_SQL_REGEXP };
    if (hasBrand) repl.brandId = brandIdNum;
    // SQL fragments appended to each WHERE when a brand is selected. The column
    // is `brand_id` on the bare utm_tracking / orders / funnel_events scans, and
    // `u.brand_id` on the source/campaign scans that alias utm_tracking as `u`.
    const bFilt = hasBrand ? ' AND brand_id = :brandId' : '';
    const bFiltU = hasBrand ? ' AND u.brand_id = :brandId' : '';

    // Brands (incl. domain so we can recognise self-referrals from the live
    // store domains, not just the hard-coded fallback list in utils/ownHosts).
    // Always load ALL brands (not just the filtered one) so self-referral
    // detection still knows every family domain.
    const brands = await sequelize.query(
      `SELECT id, name, COALESCE(display_name, name) AS display_name, domain FROM brands ORDER BY id`,
      { type: QueryTypes.SELECT }
    );
    // Set of our own storefront hosts → any session "sourced" from one of these
    // is a self-referral and rolls into Direct (Shopify behaviour).
    const selfHosts = new Set(
      brands
        .map((b) => String(b.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:?#].*$/, '').replace(/^www\./, ''))
        .filter(Boolean)
    );

    // Sessions per brand (one utm_tracking row = one session/visit)
    const sessions = await sequelize.query(
      `SELECT brand_id, COUNT(DISTINCT session_id) AS sessions
       FROM utm_tracking
       WHERE created_at BETWEEN :start AND :end AND ${NOT_BOT}${bFilt}
       GROUP BY brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Orders + revenue + delivered per brand — the REAL store sales in the
    // window, straight from the orders table by brand_id + order date, so it
    // matches the Overview order count.
    //
    // Count every PLACED order, excluding only genuinely cancelled ones. We do
    // NOT drop 'payment_failed'/'failed' here: a prepaid order that is created
    // but whose payment is still pending/failed is a real placed order the
    // merchant counts (that exclusion is exactly why the report showed 3 when
    // the store had 5). We also do NOT restrict to visit-attributed orders
    // (orders.utm_tracking_id) — many real orders have none, which under-counted
    // badly. Per-source attribution below still uses utm_tracking_id (a channel
    // can only claim an order it can prove it drove).
    const orders = await sequelize.query(
      `SELECT brand_id,
              COUNT(*) AS orders,
              COALESCE(SUM(final_amount), 0) AS revenue,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered
       FROM orders
       WHERE created_at BETWEEN :start AND :end
         AND (status IS NULL OR LOWER(status) NOT IN ('cancelled','order cancelled'))${bFilt}
       GROUP BY brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Funnel events (distinct sessions that reached each stage) per brand
    const funnel = await sequelize.query(
      `SELECT brand_id, event, COUNT(DISTINCT session_id) AS sessions
       FROM funnel_events
       WHERE created_at BETWEEN :start AND :end${bFilt}
       GROUP BY brand_id, event`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Channel breakdown per brand (source / medium)
    const channels = await sequelize.query(
      `SELECT brand_id,
              COALESCE(utm_source,'direct') AS source,
              COALESCE(utm_medium,'none')   AS medium,
              COUNT(DISTINCT session_id)    AS sessions
       FROM utm_tracking
       WHERE created_at BETWEEN :start AND :end AND ${NOT_BOT}${bFilt}
       GROUP BY brand_id, source, medium
       ORDER BY sessions DESC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Anonymous, cookieless pageview counts (page_hits) — REAL visit volume for
    // every visitor, not just those who accepted analytics cookies. Aggregate
    // only (brand/day/channel), so it can't tie to orders, but it answers "how
    // many actually landed" next to the consented funnel. Wrapped defensively:
    // the table may not exist yet on a brand-new deploy (no pings recorded).
    const dayOf = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
    let pageHits = [];
    try {
      pageHits = await sequelize.query(
        `SELECT brand_id, channel, SUM(count) AS hits
           FROM page_hits
          WHERE day BETWEEN :startDay AND :endDay${hasBrand ? ' AND brand_id = :brandId' : ''}
          GROUP BY brand_id, channel`,
        { replacements: { startDay: dayOf(start), endDay: dayOf(end), ...(hasBrand ? { brandId: brandIdNum } : {}) }, type: QueryTypes.SELECT }
      );
    } catch (e) {
      logger.warn && logger.warn('page_hits query skipped: ' + e.message);
    }
    const hitsByBrand = new Map();
    const hitsByChannel = new Map();
    let totalHits = 0;
    for (const r of pageHits) {
      const h = Number(r.hits) || 0;
      totalHits += h;
      hitsByBrand.set(r.brand_id, (hitsByBrand.get(r.brand_id) || 0) + h);
      hitsByChannel.set(r.channel, (hitsByChannel.get(r.channel) || 0) + h);
    }

    // Visits and orders per source/campaign. Visits = tracked sessions that
    // STARTED in the window; orders = orders PLACED in the window, credited to
    // the visit that led to them (orders.utm_tracking_id) even when that ad
    // click happened before the window. They used to come from one join keyed
    // on the visit date, which (a) counted orders placed after the window
    // because their visit fell inside it and (b) pushed in-window orders from
    // earlier clicks into "untracked" — so a date range showed old orders and
    // the channels didn't reconcile with the headline Orders.
    const KEY_COLS = `COALESCE(u.utm_source,'direct')   AS source,
              COALESCE(u.utm_medium,'none')     AS medium,
              COALESCE(u.utm_campaign,'none')   AS campaign,
              COALESCE(u.utm_term,'none')       AS adset,
              COALESCE(u.utm_content,'none')    AS ad,
              COALESCE(u.utm_creative,'none')   AS creative`;
    const visitRows = await sequelize.query(
      `SELECT ${KEY_COLS}, COUNT(DISTINCT u.session_id) AS sessions
       FROM utm_tracking u
       WHERE u.created_at BETWEEN :start AND :end AND ${NOT_BOT}${bFiltU}
       GROUP BY source, medium, campaign, adset, ad, creative`,
      { replacements: repl, type: QueryTypes.SELECT }
    );
    const orderRows = await sequelize.query(
      `SELECT ${KEY_COLS}, COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(o.final_amount), 0) AS revenue
       FROM orders o
       JOIN utm_tracking u ON u.id = o.utm_tracking_id
       WHERE o.created_at BETWEEN :start AND :end
         AND (o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled'))${hasBrand ? ' AND o.brand_id = :brandId' : ''}
       GROUP BY source, medium, campaign, adset, ad, creative`,
      { replacements: repl, type: QueryTypes.SELECT }
    );
    const campKey = (r) => [r.source, r.medium, r.campaign, r.adset, r.ad, r.creative].join('\u0001');
    const campMap = new Map();
    for (const r of visitRows) campMap.set(campKey(r), { ...r, sessions: Number(r.sessions) || 0, orders: 0, revenue: 0 });
    for (const r of orderRows) {
      const k = campKey(r);
      const row = campMap.get(k) || { ...r, sessions: 0 };
      row.orders = Number(r.orders) || 0;
      row.revenue = Number(r.revenue) || 0;
      campMap.set(k, row);
    }
    const campaignRows = [...campMap.values()]
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || b.sessions - a.sessions);

    // Same data rolled up to source / medium for the channel tables.
    const srcMap = new Map();
    for (const r of campaignRows) {
      const k = r.source + '\u0001' + r.medium;
      const row = srcMap.get(k) || { source: r.source, medium: r.medium, sessions: 0, orders: 0 };
      row.sessions += r.sessions; row.orders += r.orders;
      srcMap.set(k, row);
    }
    const sourceRows = [...srcMap.values()].sort((a, b) => b.sessions - a.sessions || b.orders - a.orders);

    const sessMap = new Map(sessions.map((r) => [r.brand_id, Number(r.sessions)]));
    const ordMap = new Map(orders.map((r) => [r.brand_id, r]));
    // Per-brand top channels, rolled up into the 5 headline buckets (readable
    // names, not raw utm_source/medium strings).
    const chanByBrand = new Map();
    for (const c of channels) {
      if (!chanByBrand.has(c.brand_id)) chanByBrand.set(c.brand_id, new Map());
      const m = chanByBrand.get(c.brand_id);
      const name = channelOf(c.source, c.medium, selfHosts);
      m.set(name, (m.get(name) || 0) + Number(c.sessions));
    }
    // brand_id -> { view_item, add_to_cart, begin_checkout }
    const funnelByBrand = new Map();
    for (const f of funnel) {
      if (!funnelByBrand.has(f.brand_id)) funnelByBrand.set(f.brand_id, {});
      funnelByBrand.get(f.brand_id)[f.event] = Number(f.sessions);
    }

    // Percent of a stage relative to the previous non-zero anchor.
    const rate = (n, base) => (base > 0 ? Number(((n / base) * 100).toFixed(2)) : 0);
    // The "Orders" stage counts ALL non-cancelled orders for the brand, not only
    // those from tracked sessions (direct/untracked orders have no session), so a
    // brand with few tracked sessions can legitimately have more orders than
    // sessions. Clamp the FUNNEL BAR rates to 100% so a stage never renders wider
    // than the one above it; the raw counts and conversion_rate stay exact.
    const barRate = (n, base) => Math.min(100, rate(n, base));

    // When a brand is selected, only that brand's row is built (and in turn it
    // drives the totals, funnel and channel roll-ups below).
    const rowBrands = hasBrand ? brands.filter((b) => b.id === brandIdNum) : brands;
    const rows = rowBrands.map((b) => {
      const s = sessMap.get(b.id) || 0;
      const o = ordMap.get(b.id) || { orders: 0, revenue: 0, delivered: 0 };
      const fe = funnelByBrand.get(b.id) || {};
      const views = fe.view_item || 0;
      const carts = fe.add_to_cart || 0;
      const checkouts = fe.begin_checkout || 0;
      const ordersN = Number(o.orders) || 0;
      const delivered = Number(o.delivered) || 0;
      const revenue = Number(o.revenue) || 0;

      // Ordered funnel stages. step_rate = % of the previous stage;
      // overall_rate = % of Visits (top of funnel = 100%, purchase the smallest).
      const stages = [
        { key: 'sessions',   label: 'Visits',          count: s },
        { key: 'view_item',  label: 'Product views',   count: views,      of: s },
        { key: 'add_to_cart',label: 'Add to cart',     count: carts,      of: views || s },
        { key: 'begin_checkout', label: 'Checkout',    count: checkouts,  of: carts || views || s },
        { key: 'purchase',   label: 'Orders',          count: ordersN,    of: checkouts || carts || s },
        { key: 'delivered',  label: 'Delivered',       count: delivered,  of: ordersN },
      ].map((st) => ({
        ...st,
        step_rate: st.of != null ? barRate(st.count, st.of) : null,
        overall_rate: s > 0 ? barRate(st.count, s) : (st.key === 'sessions' ? 100 : 0),
      }));

      return {
        brand_id: b.id,
        brand: b.display_name,
        sessions: s,
        allVisits: hitsByBrand.get(b.id) || 0, // anonymous (cookieless) real visits
        views,
        carts,
        checkouts,
        orders: ordersN,
        delivered,
        revenue: Math.round(revenue),
        conversion_rate: s > 0 ? Number(((ordersN / s) * 100).toFixed(2)) : null, // visit → order
        aov: ordersN > 0 ? Math.round(revenue / ordersN) : 0,
        stages,
        channels: [...(chanByBrand.get(b.id) || new Map())]
          .map(([channel, sess]) => ({ channel, sessions: sess }))
          .sort((a, z) => z.sessions - a.sessions)
          .slice(0, 4),
      };
    });

    // Totals across brands
    const totals = rows.reduce(
      (t, r) => {
        t.sessions += r.sessions; t.views += r.views; t.carts += r.carts;
        t.checkouts += r.checkouts; t.orders += r.orders; t.delivered += r.delivered;
        t.revenue += r.revenue; return t;
      },
      { sessions: 0, views: 0, carts: 0, checkouts: 0, orders: 0, delivered: 0, revenue: 0 }
    );
    totals.allVisits = totalHits; // anonymous real visits across the shown brands
    totals.conversion_rate = totals.sessions > 0 ? Number(((totals.orders / totals.sessions) * 100).toFixed(2)) : null;
    totals.aov = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;
    totals.stages = [
      { key: 'sessions', label: 'Visits', count: totals.sessions },
      { key: 'view_item', label: 'Product views', count: totals.views, of: totals.sessions },
      { key: 'add_to_cart', label: 'Add to cart', count: totals.carts, of: totals.views || totals.sessions },
      { key: 'begin_checkout', label: 'Checkout', count: totals.checkouts, of: totals.carts || totals.views || totals.sessions },
      { key: 'purchase', label: 'Orders', count: totals.orders, of: totals.checkouts || totals.carts || totals.sessions },
      { key: 'delivered', label: 'Delivered', count: totals.delivered, of: totals.orders },
    ].map((st) => ({
      ...st,
      step_rate: st.of != null ? rate(st.count, st.of) : null,
      overall_rate: totals.sessions > 0 ? rate(st.count, totals.sessions) : (st.key === 'sessions' ? 100 : 0),
    }));

    // Traffic sources rolled up into the 5 headline channels (Facebook,
    // Instagram, Google, AI chatbot, Other) — visitors, share, orders, conv.
    const totalSrcSessions = sourceRows.reduce((n, r) => n + Number(r.sessions), 0) || 1;
    const groups = new Map();
    for (const r of sourceRows) {
      const name = channelOf(r.source, r.medium, selfHosts);
      const g = groups.get(name) || { sessions: 0, orders: 0 };
      g.sessions += Number(r.sessions) || 0;
      g.orders += Number(r.orders) || 0;
      groups.set(name, g);
    }
    const channelGroups = CHANNEL_ORDER.map((name) => {
      const g = groups.get(name) || { sessions: 0, orders: 0 };
      return {
        channel: name,
        sessions: g.sessions,
        allVisits: hitsByChannel.get(name) || 0, // anonymous real visits in this channel
        share: Number(((g.sessions / totalSrcSessions) * 100).toFixed(2)),
        orders: g.orders,
        conversion_rate: g.sessions > 0 ? Number(((g.orders / g.sessions) * 100).toFixed(2)) : null,
      };
    })
      // Show only channels that actually have data in the window (Shopify hides
      // empty channels) — but always keep Direct as the anchor row.
      .filter((c) => c.channel === 'Direct' || c.sessions > 0 || c.orders > 0 || c.allVisits > 0);

    // Reconciling row: the per-channel orders above only count orders matched to
    // a tracked visit (orders.utm_tracking_id). Real orders with no tracked
    // session — direct, untracked, or placed outside a tracked visit — are in
    // `totals.orders` but belong to no channel, so the channel orders would
    // otherwise sum to LESS than the headline Orders number and look wrong.
    // Surface the remainder explicitly so the breakdown always reconciles.
    const attributedOrders = channelGroups.reduce((n, c) => n + (Number(c.orders) || 0), 0);
    const untrackedOrders = Math.max(0, (Number(totals.orders) || 0) - attributedOrders);
    if (untrackedOrders > 0) {
      channelGroups.push({
        channel: 'Direct / untracked',
        sessions: 0,
        share: 0,
        orders: untrackedOrders,
        // No tracked visits for these orders, so a visit→order rate is N/A.
        conversion_rate: null,
        untracked: true,
      });
    }

    // A self-referral host stored as the source (e.g. "soxbaesocks.com") is
    // relabelled "direct" for display, so our own domains never show up as a
    // traffic source in the drill-down — same rule the channel roll-up uses.
    // Normalise common provider aliases so the same channel isn't split across
    // rows (e.g. utm_source=fb and =facebook, or ig and instagram).
    const SRC_ALIAS = {
      fb: 'facebook', 'facebook.com': 'facebook', 'm.facebook.com': 'facebook',
      'l.facebook.com': 'facebook', 'lm.facebook.com': 'facebook', meta: 'facebook',
      ig: 'instagram', 'instagram.com': 'instagram', 'l.instagram.com': 'instagram',
      'google.com': 'google', 'g': 'google',
    };
    const cleanSource = (src) => {
      if (isOwnHost(src, selfHosts)) return 'direct';
      const k = String(src || '').trim().toLowerCase();
      return SRC_ALIAS[k] || src;
    };

    // Granular source/medium rows kept for CSV / drill-down.
    const sources = sourceRows.map((r) => {
      const sess = Number(r.sessions) || 0;
      const ord = Number(r.orders) || 0;
      return {
        source: cleanSource(r.source), medium: r.medium, sessions: sess,
        share: Number(((sess / totalSrcSessions) * 100).toFixed(2)),
        orders: ord,
        conversion_rate: sess > 0 ? Number(((ord / sess) * 100).toFixed(2)) : null,
      };
    }).slice(0, 25);

    // Campaign rows (source/medium/campaign) with orders, revenue & conversion —
    // the data that used to live on the UTM Analytics page, now reconciled.
    const campaigns = campaignRows.map((r) => {
      const sess = Number(r.sessions) || 0;
      const ord = Number(r.orders) || 0;
      return {
        source: cleanSource(r.source), medium: r.medium, campaign: r.campaign,
        // Ad set (utm_term), ad (utm_content) and the operator's creative code
        // (utm_creative) so the report mirrors Meta's campaign → ad set → ad.
        adset: r.adset, ad: r.ad, creative: r.creative,
        sessions: sess,
        share: Number(((sess / totalSrcSessions) * 100).toFixed(2)),
        orders: ord,
        revenue: Math.round(Number(r.revenue) || 0),
        conversion_rate: sess > 0 ? Number(((ord / sess) * 100).toFixed(2)) : null,
      };
    }).slice(0, 200);

    // Reconciliation row: the campaign rows above only count orders matched to
    // a tracked visit (utm_tracking_id). Surface the remainder — real orders
    // with no tracked session — as one "(untracked)" row so this table sums to
    // the headline Orders instead of silently dropping sales. Computed from the
    // FULL campaignRows (not the sliced display set) so the math is exact.
    const campAttrOrders = campaignRows.reduce((n, r) => n + (Number(r.orders) || 0), 0);
    const campAttrRev = campaignRows.reduce((n, r) => n + (Number(r.revenue) || 0), 0);
    const campUntracked = Math.max(0, (Number(totals.orders) || 0) - campAttrOrders);
    const campUntrackedRev = Math.max(0, Math.round(Number(totals.revenue) || 0) - campAttrRev);
    if (campUntracked > 0) {
      campaigns.push({
        source: '(untracked)', medium: 'none', campaign: 'none', adset: 'none', ad: 'none', creative: 'none',
        sessions: 0, share: 0, orders: campUntracked, revenue: campUntrackedRev, conversion_rate: null,
      });
    }

    // Paid vs Organic vs Direct — the top-level split operators manage against.
    // Paid = any paid medium (paid/cpc/ppc/display/retargeting/sem). Direct =
    // no/own source. Everything else (organic search, social, referral, email,
    // sms) rolls into Organic. Untracked orders fold into Direct so the three
    // buckets reconcile with the headline Orders.
    const isPaidMedium = (m) => /^(paid|cpc|ppc|paid[_-]?social|paidsocial|display|retargeting|remarketing|cpm|sem|ppe)$/i.test(String(m || '').trim());
    const splitBucket = (source, medium) => {
      const s = String(source || '').toLowerCase().trim();
      if (!s || s === 'direct' || s === '(direct)' || s === 'none' || s === '(none)' || s === '(untracked)' || isOwnHost(s, selfHosts)) return 'Direct';
      return isPaidMedium(medium) ? 'Paid' : 'Organic';
    };
    const splitAcc = { Paid: { sessions: 0, orders: 0, revenue: 0 }, Organic: { sessions: 0, orders: 0, revenue: 0 }, Direct: { sessions: 0, orders: 0, revenue: 0 } };
    campaignRows.forEach((r) => {
      const b = splitAcc[splitBucket(r.source, r.medium)];
      b.sessions += Number(r.sessions) || 0;
      b.orders += Number(r.orders) || 0;
      b.revenue += Number(r.revenue) || 0;
    });
    // Orders with no tracked session are unattributed → count them as Direct.
    splitAcc.Direct.orders += campUntracked;
    splitAcc.Direct.revenue += campUntrackedRev;
    const trafficSplit = ['Paid', 'Organic', 'Direct'].map((type) => {
      const a = splitAcc[type];
      // Conversion only from orders tied to a tracked visit — untracked orders
      // (folded into Direct) have no visit, so they'd push Direct over 100%.
      const tracked = a.orders - (type === 'Direct' ? campUntracked : 0);
      return {
        type, sessions: a.sessions, orders: a.orders, revenue: Math.round(a.revenue),
        conversion_rate: a.sessions > 0 ? Number(((tracked / a.sessions) * 100).toFixed(2)) : null,
      };
    });

    res.json({
      success: true,
      range: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      brandId: hasBrand ? brandIdNum : null,
      brands: rows.sort((a, b) => b.revenue - a.revenue),
      totals,
      channels: channelGroups,
      sources,
      trafficSplit,
      campaigns,
    });
  } catch (error) {
    logger.error('getBrandTraffic report failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to build traffic report', error: error.message });
  }
};

// GET /api/reports/revenue-profit?startDate=&endDate=
// Revenue & gross-profit report. The backend returns the raw, non-opinionated
// figures per brand (revenue, COGS, order count, unit count); the dashboard then
// applies the per-order cost knobs (shipping, service charge, CPP) live so the
// operator can tweak CPP — which varies per campaign — without a round-trip.
//
// COGS = Σ(variation cost_price × qty). Items with no cost_price (NULL, or a
// non-variation line) count as 0, exactly as requested — so profit is an UPPER
// bound until cost prices are filled in. Same order set as the traffic report:
// every placed order in the window except genuinely cancelled ones.
exports.getRevenueProfit = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const { STAGE_SQL, JOINS, REFUND_SQL } = require('../services/salesReportService.js');
    const { getBrandGst } = require('../services/invoiceService.js');
    const repl = { start, end };

    const brands = await sequelize.query(
      `SELECT id, name, COALESCE(display_name, name) AS display_name FROM brands ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    // Order-level figures per brand by pipeline stage (same rules as the
    // Overview): revenue = what reached the customer minus refunds.
    const ord = await sequelize.query(
      `SELECT o.brand_id,
              SUM(${STAGE_SQL} IN ('delivered','returned')) AS delivered,
              SUM(${STAGE_SQL} IN ('delivered','returned','rto','in_transit','problems')) AS shipped,
              SUM(${STAGE_SQL} = 'rto') AS rto,
              SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') THEN o.final_amount ELSE 0 END) AS gross,
              SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') THEN ${REFUND_SQL} ELSE 0 END) AS refunds,
              SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') AND LOWER(o.payment_type) <> 'cod' THEN o.final_amount ELSE 0 END) AS prepaid_gross,
              SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') AND LOWER(o.payment_type) = 'cod' THEN o.final_amount ELSE 0 END) AS cod_gross
         FROM orders o ${JOINS}
        WHERE o.created_at BETWEEN :start AND :end
        GROUP BY o.brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // COGS on units the customer KEPT (delivered, not returned/RTO'd — those
    // were restocked). cost_price missing → 0 (flagged).
    const cogs = await sequelize.query(
      `SELECT o.brand_id,
              COALESCE(SUM(COALESCE(pv.cost_price, 0) * oi.quantity), 0) AS cogs,
              COALESCE(SUM(oi.quantity), 0) AS units,
              COALESCE(SUM(CASE WHEN pv.cost_price IS NULL OR pv.cost_price = 0 THEN oi.quantity ELSE 0 END), 0) AS units_without_cost
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN product_variations pv ON pv.id = oi.variation_id
         ${JOINS}
        WHERE o.created_at BETWEEN :start AND :end AND ${STAGE_SQL} = 'delivered'
        GROUP BY o.brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const ordMap = new Map(ord.map((r) => [r.brand_id, r]));
    const cogsMap = new Map(cogs.map((c) => [c.brand_id, c]));
    const n = (v) => Number(v) || 0;

    const rows = [];
    for (const b of brands) {
      const r = ordMap.get(b.id) || {};
      const c = cogsMap.get(b.id) || {};
      const gross = n(r.gross), refunds = n(r.refunds);
      const revenue = gross - refunds;
      // Prices are GST-inclusive: back the brand's GST out of net revenue.
      const gst = await getBrandGst(b.id);
      const rate = gst.rate || 0;
      const revenueExGst = rate ? revenue / (1 + rate / 100) : revenue;
      const row = {
        brandId: b.id,
        brand: b.display_name,
        orders: n(r.delivered),          // delivered orders (the revenue base)
        shippedOrders: n(r.shipped),     // forward shipping was paid on these
        rtoOrders: n(r.rto),             // return shipping on these too
        units: n(c.units),
        unitsWithoutCost: n(c.units_without_cost),
        grossRevenue: Math.round(gross),
        refunds: Math.round(refunds),
        revenue: Math.round(revenue),
        gstRate: gst.rate,
        revenueExGst: Math.round(revenueExGst),
        prepaidRevenue: Math.round(n(r.prepaid_gross)),
        codRevenue: Math.round(n(r.cod_gross)),
        cogs: Math.round(n(c.cogs)),
      };
      if (row.orders || row.shippedOrders || row.rtoOrders) rows.push(row);
    }

    const totals = rows.reduce((t, r) => {
      for (const k of ['orders', 'shippedOrders', 'rtoOrders', 'units', 'unitsWithoutCost', 'grossRevenue', 'refunds', 'revenue', 'revenueExGst', 'prepaidRevenue', 'codRevenue', 'cogs']) t[k] += r[k];
      return t;
    }, { orders: 0, shippedOrders: 0, rtoOrders: 0, units: 0, unitsWithoutCost: 0, grossRevenue: 0, refunds: 0, revenue: 0, revenueExGst: 0, prepaidRevenue: 0, codRevenue: 0, cogs: 0 });

    const ymd = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
    res.json({
      success: true,
      range: { startDate: ymd(start), endDate: ymd(end) },
      // Cost assumptions the UI applies live (editable there):
      // shipping per shipped order, return shipping per RTO order, payment
      // gateway % on prepaid revenue, COD handling % on COD revenue.
      defaults: { shippingPerOrder: 90, rtoShippingPerOrder: 90, gatewayPct: 2, codPct: 2 },
      brands: rows.sort((a, b) => b.revenue - a.revenue),
      totals,
    });
  } catch (error) {
    logger.error('getRevenueProfit report failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to build revenue/profit report', error: error.message });
  }
};

// GET /api/reports/sales-summary?startDate=&endDate=&brandId=
// The Reports Overview: pipeline, net sales, rates, brands, trend, products,
// RTO by courier/state, returns by reason — services/salesReportService.js.
exports.getSalesSummary = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const brandId = parseInt(req.query.brandId, 10) || null;
    const data = await require('../services/salesReportService.js').salesSummary({ start, end, brandId });
    res.json({ success: true, ...data });
  } catch (error) {
    logger.error('getSalesSummary failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to build the sales report', error: error.message });
  }
};

// GET /api/reports/missing-cost-prices
// Lists ACTIVE product variations that have no cost price set (NULL or 0) — the
// exact rows that make the Revenue & Profit report an upper bound. Returns enough
// to identify and jump to each product so staff can fill the cost in.
exports.getMissingCostPrices = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 500, 2000));
    const rows = await sequelize.query(
      `SELECT pv.id            AS variation_id,
              pv.sku           AS sku,
              pv.price         AS price,
              pv.attributes    AS attributes,
              p.id             AS product_id,
              p.name           AS product_name,
              p.slug           AS slug,
              p.brand_id       AS brand_id,
              COALESCE(b.display_name, b.name) AS brand
         FROM product_variations pv
         JOIN products p ON p.id = pv.productId
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE (pv.cost_price IS NULL OR pv.cost_price = 0)
          AND pv.status = 'active'
          AND p.status = 'active'
        ORDER BY b.name, p.name, pv.id
        LIMIT ${limit}`,
      { type: QueryTypes.SELECT }
    );

    const items = rows.map(r => {
      let attrs = r.attributes;
      if (typeof attrs === 'string') { try { attrs = JSON.parse(attrs); } catch (_) { attrs = null; } }
      const variantLabel = attrs && typeof attrs === 'object'
        ? Object.values(attrs).filter(Boolean).join(' / ')
        : '';
      return {
        variationId: r.variation_id,
        productId: r.product_id,
        productName: r.product_name,
        slug: r.slug,
        brandId: r.brand_id,
        brand: r.brand,
        sku: r.sku,
        price: Number(r.price) || 0,
        variant: variantLabel,
      };
    });

    res.json({ success: true, count: items.length, limited: items.length >= limit, items });
  } catch (error) {
    logger.error('getMissingCostPrices report failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to load missing cost prices', error: error.message });
  }
};
