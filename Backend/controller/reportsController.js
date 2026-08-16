const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { logger } = require('../config/logging.js');

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
    const repl = { start, end };

    // Brands
    const brands = await sequelize.query(
      `SELECT id, name, COALESCE(display_name, name) AS display_name FROM brands ORDER BY id`,
      { type: QueryTypes.SELECT }
    );

    // Sessions per brand (one utm_tracking row = one session/visit)
    const sessions = await sequelize.query(
      `SELECT brand_id, COUNT(DISTINCT session_id) AS sessions
       FROM utm_tracking
       WHERE created_at BETWEEN :start AND :end
       GROUP BY brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Orders + revenue per brand (exclude cancelled / failed as non-conversions)
    const orders = await sequelize.query(
      `SELECT brand_id,
              COUNT(*) AS orders,
              COALESCE(SUM(final_amount), 0) AS revenue
       FROM orders
       WHERE created_at BETWEEN :start AND :end
         AND (status IS NULL OR status NOT IN ('cancelled','failed','payment_failed'))
       GROUP BY brand_id`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    // Channel breakdown per brand (source / medium)
    const channels = await sequelize.query(
      `SELECT brand_id,
              COALESCE(utm_source,'direct') AS source,
              COALESCE(utm_medium,'none')   AS medium,
              COUNT(DISTINCT session_id)    AS sessions
       FROM utm_tracking
       WHERE created_at BETWEEN :start AND :end
       GROUP BY brand_id, source, medium
       ORDER BY sessions DESC`,
      { replacements: repl, type: QueryTypes.SELECT }
    );

    const sessMap = new Map(sessions.map((r) => [r.brand_id, Number(r.sessions)]));
    const ordMap = new Map(orders.map((r) => [r.brand_id, r]));
    const chanByBrand = new Map();
    for (const c of channels) {
      if (!chanByBrand.has(c.brand_id)) chanByBrand.set(c.brand_id, []);
      chanByBrand.get(c.brand_id).push({ source: c.source, medium: c.medium, sessions: Number(c.sessions) });
    }

    const rows = brands.map((b) => {
      const s = sessMap.get(b.id) || 0;
      const o = ordMap.get(b.id) || { orders: 0, revenue: 0 };
      const ordersN = Number(o.orders) || 0;
      const revenue = Number(o.revenue) || 0;
      return {
        brand_id: b.id,
        brand: b.display_name,
        sessions: s,
        orders: ordersN,
        revenue: Math.round(revenue),
        conversion_rate: s > 0 ? Number(((ordersN / s) * 100).toFixed(2)) : 0,
        aov: ordersN > 0 ? Math.round(revenue / ordersN) : 0,
        channels: (chanByBrand.get(b.id) || []).slice(0, 6),
      };
    });

    // Totals across brands
    const totals = rows.reduce(
      (t, r) => {
        t.sessions += r.sessions; t.orders += r.orders; t.revenue += r.revenue; return t;
      },
      { sessions: 0, orders: 0, revenue: 0 }
    );
    totals.conversion_rate = totals.sessions > 0 ? Number(((totals.orders / totals.sessions) * 100).toFixed(2)) : 0;
    totals.aov = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;

    res.json({
      success: true,
      range: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      brands: rows.sort((a, b) => b.revenue - a.revenue),
      totals,
    });
  } catch (error) {
    logger.error('getBrandTraffic report failed: ' + error.message);
    res.status(500).json({ success: false, message: 'Failed to build traffic report', error: error.message });
  }
};
