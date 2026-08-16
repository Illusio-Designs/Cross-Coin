const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');
const { BOT_SQL_REGEXP } = require('../utils/botDetect');

// Excludes bot/crawler user agents from a utm_tracking scan (belt-and-suspenders
// for rows recorded before ingestion-time bot filtering existed).
const NOT_BOT = `(user_agent IS NULL OR LOWER(user_agent) NOT REGEXP :bot)`;

// Roll a raw source/medium up into the 5 headline channels the business tracks.
function channelOf(source, medium) {
  const s = String(source || '').toLowerCase().trim();
  const m = String(medium || '').toLowerCase();
  if (/facebook|(^|[^a-z])fb([^a-z]|$)|meta$|meta\b/.test(s) || /facebook/.test(m)) return 'Facebook';
  if (s === 'instagram' || s === 'ig' || /instagram/.test(s)) return 'Instagram';
  if (/google/.test(s)) return 'Google';
  if (/chatgpt|openai|perplexity|gemini|bard|copilot|claude|anthropic|poe|phind|deepseek|you\.com|grok|meta\.ai|(^|[^a-z])ai([^a-z]|$)/.test(s)) return 'AI chatbot';
  return 'Other';
}
const CHANNEL_ORDER = ['Facebook', 'Instagram', 'Google', 'AI chatbot', 'Other'];

// Parse a YYYY-MM-DD (or ISO) range, defaulting to the last 30 days. Returns
// JS Date bounds covering full days [start 00:00:00, end 23:59:59].
function parseRange(q) {
  const end = q.endDate ? new Date(q.endDate) : new Date();
  const start = q.startDate ? new Date(q.startDate) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /api/reports/brand-traffic?startDate=&endDate=
// Brand-wise funnel: sessions (first-party visit tracking) → orders → revenue,
// with conversion rate and a channel (source/medium) breakdown per brand.
exports.getBrandTraffic = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const repl = { start, end, bot: BOT_SQL_REGEXP };

    // Brands
    const brands = await sequelize.query(
      `SELECT id, name, COALESCE(display_name, name) AS display_name FROM brands ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    // Sessions per brand (one utm_tracking row = one session/visit)
    const sessions = await sequelize.query(
      `SELECT brand_id, COUNT(DISTINCT session_id) AS sessions
       FROM utm_tracking
       WHERE created_at BETWEEN :start AND :end AND ${NOT_BOT}
       GROUP BY brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Orders + revenue + delivered per brand — ATTRIBUTED to a tracked visit
    // (orders.utm_tracking_id → the session's utm_tracking row). This keeps the
    // funnel consistent: an order always belongs to a visit, so orders can never
    // exceed sessions and conversion stays <= 100%. (Counting ALL orders here
    // mixed historical sales with just-started visit tracking and produced
    // nonsense like 500% conversion / 21000% step rates.) Total store sales
    // regardless of attribution live on the Overview / Ads reports.
    const orders = await sequelize.query(
      `SELECT u.brand_id AS brand_id,
              COUNT(DISTINCT o.id) AS orders,
              COALESCE(SUM(o.final_amount), 0) AS revenue,
              COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) AS delivered
       FROM utm_tracking u
       JOIN orders o ON o.utm_tracking_id = u.id
       WHERE u.created_at BETWEEN :start AND :end AND ${NOT_BOT}
         AND (o.status IS NULL OR o.status NOT IN ('cancelled','failed','payment_failed'))
       GROUP BY u.brand_id`,
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
              COUNT(DISTINCT CASE WHEN o.status IS NULL OR o.status NOT IN ('cancelled','failed','payment_failed') THEN o.id END) AS orders
       FROM utm_tracking u
       LEFT JOIN orders o ON o.utm_tracking_id = u.id
       WHERE u.created_at BETWEEN :start AND :end AND ${NOT_BOT}
       GROUP BY source, medium
       ORDER BY sessions DESC`,
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
      const name = channelOf(c.source, c.medium);
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
        step_rate: st.of != null ? rate(st.count, st.of) : null,
        overall_rate: s > 0 ? rate(st.count, s) : (st.key === 'sessions' ? 100 : 0),
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
      const name = channelOf(r.source, r.medium);
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
    });

    // Granular source/medium rows kept for CSV / drill-down.
    const sources = sourceRows.map((r) => {
      const sess = Number(r.sessions) || 0;
      const ord = Number(r.orders) || 0;
      return {
        source: r.source, medium: r.medium, sessions: sess,
        share: Number(((sess / totalSrcSessions) * 100).toFixed(2)),
        orders: ord,
        conversion_rate: sess > 0 ? Number(((ord / sess) * 100).toFixed(2)) : 0,
      };
    }).slice(0, 25);

    res.json({
      success: true,
      range: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      brands: rows.sort((a, b) => b.revenue - a.revenue),
      totals,
      channels: channelGroups,
      sources,
    });
  } catch (error) {
    logger.error('getBrandTraffic report failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to build traffic report', error: error.message });
  }
};
