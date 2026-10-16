const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');
const { BOT_SQL_REGEXP } = require('../utils/botDetect');
const { dayStartTZ, dayEndTZ, TZ_OFFSET } = require('../utils/dateRange.js');
const { isOwnHost } = require('../utils/ownHosts');

// Excludes bot/crawler user agents from a utm_tracking scan (belt-and-suspenders
// for rows recorded before ingestion-time bot filtering existed).
const NOT_BOT = `(user_agent IS NULL OR LOWER(user_agent) NOT REGEXP :bot)`;

// Roll a raw source/medium up into Shopify-style marketing channels. Shopify
// buckets every session into Direct, Social, Search, Email, SMS and Referral,
// never leaving your own domain showing up as a "source". We keep the three
// social/search names the business actually buys ads on (Facebook, Instagram,
// Google) plus an AI-chatbot bucket, and otherwise follow Shopify's grouping.
//
// `selfHosts` is the set of our own storefront domains (brand `domain` values);
// a session whose source is one of them is a self-referral → Direct, exactly
// like Shopify, so an internal page-to-page hop is never counted as traffic
// from an external site.
function channelOf(source, medium, selfHosts) {
  const s = String(source || '').toLowerCase().trim();
  const m = String(medium || '').toLowerCase().trim();
  // Direct: no source, an explicit direct marker, or a self-referral host.
  if (!s || s === 'direct' || s === '(direct)' || s === 'none' || s === '(none)') return 'Direct';
  if (isOwnHost(s, selfHosts)) return 'Direct';
  // Email / SMS — owned channels, keyed off source or medium.
  if (/^e[-]?mail$|newsletter|klaviyo|mailchimp|sendgrid/.test(s) || /^e[-]?mail$|newsletter/.test(m)) return 'Email';
  if (/^sms$|textmessage|text-message/.test(s) || /^sms$|^text$/.test(m)) return 'SMS';
  // Social / search the business buys ads on — matched by name (covers both the
  // paid utm_source and the organic referrer host, e.g. "l.facebook.com").
  if (/facebook|(^|[^a-z])fb([^a-z]|$)|meta$|meta\b/.test(s) || /facebook/.test(m)) return 'Facebook';
  if (s === 'instagram' || s === 'ig' || /instagram/.test(s)) return 'Instagram';
  if (/google/.test(s)) return 'Google';
  if (/chatgpt|openai|perplexity|gemini|bard|copilot|claude|anthropic|poe|phind|deepseek|you\.com|grok|meta\.ai|(^|[^a-z])ai([^a-z]|$)/.test(s)) return 'AI chatbot';
  // Any other real external site → Referral (Shopify's catch-all for a known
  // referring domain), rather than a vague "Other".
  return 'Referral';
}
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
    const repl = { start, end, bot: BOT_SQL_REGEXP };

    // Brands (incl. domain so we can recognise self-referrals from the live
    // store domains, not just the hard-coded fallback list in utils/ownHosts).
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
       WHERE created_at BETWEEN :start AND :end AND ${NOT_BOT}
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
         AND (status IS NULL OR LOWER(status) NOT IN ('cancelled','order cancelled'))
       GROUP BY brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Funnel events (distinct sessions that reached each stage) per brand
    const funnel = await sequelize.query(
      `SELECT brand_id, event, COUNT(DISTINCT session_id) AS sessions
       FROM funnel_events
       WHERE created_at BETWEEN :start AND :end
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
       WHERE created_at BETWEEN :start AND :end AND ${NOT_BOT}
       GROUP BY brand_id, source, medium
       ORDER BY sessions DESC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Where ALL visitors come from (across brands) + how each source converts.
    // Orders are matched back to the visit via orders.utm_tracking_id.
    const sourceRows = await sequelize.query(
      `SELECT COALESCE(u.utm_source,'direct') AS source,
              COALESCE(u.utm_medium,'none')   AS medium,
              COUNT(DISTINCT u.session_id)     AS sessions,
              COUNT(DISTINCT CASE WHEN o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled') THEN o.id END) AS orders
       FROM utm_tracking u
       LEFT JOIN orders o ON o.utm_tracking_id = u.id
       WHERE u.created_at BETWEEN :start AND :end AND ${NOT_BOT}
       GROUP BY source, medium
       ORDER BY sessions DESC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Campaign-level breakdown (source / medium / campaign) — replaces the old
    // standalone UTM Analytics page. Uses the SAME authoritative rules as the
    // channel/source tables above (DISTINCT tracked sessions, orders & revenue
    // from NON-CANCELLED orders matched via orders.utm_tracking_id), so these
    // numbers reconcile with the headline Orders/Revenue instead of the old
    // UTM page's inflated counts (which included cancelled orders).
    const campaignRows = await sequelize.query(
      `SELECT COALESCE(u.utm_source,'direct')   AS source,
              COALESCE(u.utm_medium,'none')     AS medium,
              COALESCE(u.utm_campaign,'none')   AS campaign,
              COUNT(DISTINCT u.session_id)       AS sessions,
              COUNT(DISTINCT CASE WHEN o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled') THEN o.id END) AS orders,
              COALESCE(SUM(CASE WHEN o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled') THEN o.final_amount ELSE 0 END), 0) AS revenue
       FROM utm_tracking u
       LEFT JOIN orders o ON o.utm_tracking_id = u.id
       WHERE u.created_at BETWEEN :start AND :end AND ${NOT_BOT}
       GROUP BY source, medium, campaign
       ORDER BY revenue DESC, orders DESC, sessions DESC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

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

    const rows = brands.map((b) => {
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
        views,
        carts,
        checkouts,
        orders: ordersN,
        delivered,
        revenue: Math.round(revenue),
        conversion_rate: s > 0 ? Number(((ordersN / s) * 100).toFixed(2)) : 0, // visit → order
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
    totals.conversion_rate = totals.sessions > 0 ? Number(((totals.orders / totals.sessions) * 100).toFixed(2)) : 0;
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
        share: Number(((g.sessions / totalSrcSessions) * 100).toFixed(2)),
        orders: g.orders,
        conversion_rate: g.sessions > 0 ? Number(((g.orders / g.sessions) * 100).toFixed(2)) : 0,
      };
    })
      // Show only channels that actually have data in the window (Shopify hides
      // empty channels) — but always keep Direct as the anchor row.
      .filter((c) => c.channel === 'Direct' || c.sessions > 0 || c.orders > 0);

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
    const cleanSource = (src) => (isOwnHost(src, selfHosts) ? 'direct' : src);

    // Granular source/medium rows kept for CSV / drill-down.
    const sources = sourceRows.map((r) => {
      const sess = Number(r.sessions) || 0;
      const ord = Number(r.orders) || 0;
      return {
        source: cleanSource(r.source), medium: r.medium, sessions: sess,
        share: Number(((sess / totalSrcSessions) * 100).toFixed(2)),
        orders: ord,
        conversion_rate: sess > 0 ? Number(((ord / sess) * 100).toFixed(2)) : 0,
      };
    }).slice(0, 25);

    // Campaign rows (source/medium/campaign) with orders, revenue & conversion —
    // the data that used to live on the UTM Analytics page, now reconciled.
    const campaigns = campaignRows.map((r) => {
      const sess = Number(r.sessions) || 0;
      const ord = Number(r.orders) || 0;
      return {
        source: cleanSource(r.source), medium: r.medium, campaign: r.campaign, sessions: sess,
        share: Number(((sess / totalSrcSessions) * 100).toFixed(2)),
        orders: ord,
        revenue: Math.round(Number(r.revenue) || 0),
        conversion_rate: sess > 0 ? Number(((ord / sess) * 100).toFixed(2)) : 0,
      };
    }).slice(0, 50);

    res.json({
      success: true,
      range: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      brands: rows.sort((a, b) => b.revenue - a.revenue),
      totals,
      channels: channelGroups,
      sources,
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
    const repl = { start, end };

    // Brands (for names)
    const brands = await sequelize.query(
      `SELECT id, name, COALESCE(display_name, name) AS display_name FROM brands ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    // Columns are qualified with the `o` alias — product_variations also has a
    // `status` column, so an unqualified `status` is ambiguous once joined.
    const ORDER_FILTER = `o.created_at BETWEEN :start AND :end
      AND (o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled'))`;

    // Revenue + order count per brand (order-level — no item join, so
    // final_amount isn't multiplied).
    const rev = await sequelize.query(
      `SELECT o.brand_id,
              COUNT(*) AS orders,
              COALESCE(SUM(o.final_amount), 0) AS revenue
       FROM orders o
       WHERE ${ORDER_FILTER}
       GROUP BY o.brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // COGS + units per brand (item-level). cost_price missing → 0. A line also
    // flags whether its cost was known, so the UI can warn when cost data is thin.
    const cogs = await sequelize.query(
      `SELECT o.brand_id,
              COALESCE(SUM(COALESCE(pv.cost_price, 0) * oi.quantity), 0) AS cogs,
              COALESCE(SUM(oi.quantity), 0) AS units,
              COALESCE(SUM(CASE WHEN pv.cost_price IS NULL OR pv.cost_price = 0 THEN oi.quantity ELSE 0 END), 0) AS units_without_cost
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN product_variations pv ON pv.id = oi.variation_id
       WHERE ${ORDER_FILTER}
       GROUP BY o.brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const revMap = new Map(rev.map(r => [r.brand_id, r]));
    const cogsMap = new Map(cogs.map(c => [c.brand_id, c]));

    const rows = brands.map(b => {
      const r = revMap.get(b.id) || {};
      const c = cogsMap.get(b.id) || {};
      const orders = Number(r.orders || 0);
      const revenue = Number(r.revenue || 0);
      const cogsAmt = Number(c.cogs || 0);
      const units = Number(c.units || 0);
      const unitsWithoutCost = Number(c.units_without_cost || 0);
      return {
        brandId: b.id,
        brand: b.display_name,
        orders,
        units,
        unitsWithoutCost,          // units with no cost_price (counted as 0 COGS)
        revenue: Math.round(revenue),
        cogs: Math.round(cogsAmt), // Σ cost_price × qty (0 where unknown)
      };
    }).filter(r => r.orders > 0 || r.revenue > 0);

    const totals = rows.reduce((t, r) => {
      t.orders += r.orders; t.units += r.units; t.unitsWithoutCost += r.unitsWithoutCost;
      t.revenue += r.revenue; t.cogs += r.cogs; return t;
    }, { orders: 0, units: 0, unitsWithoutCost: 0, revenue: 0, cogs: 0 });

    res.json({
      success: true,
      range: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      // Default per-order cost assumptions (the UI can override these live).
      defaults: { shippingPerOrder: 90, servicePerOrder: 30, cppPerOrder: 0 },
      brands: rows.sort((a, b) => b.revenue - a.revenue),
      totals,
    });
  } catch (error) {
    logger.error('getRevenueProfit report failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to build revenue/profit report', error: error.message });
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
         JOIN products p ON p.id = pv.product_id
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
