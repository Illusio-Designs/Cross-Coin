const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * Sales report — one consistent set of rules for every number on the Reports
 * Overview (orders are counted by the IST day they were placed):
 *
 *   stage      → where the order is in the pipeline (see STAGE_SQL)
 *   placed     → every order, incl. cancelled
 *   booked     → placed minus cancelled (orders that count as demand)
 *   delivered  → reached the customer (incl. ones later returned)
 *   net sales  → delivered value − refunds on those orders
 *   RTO        → courier return (never reached the customer); a customer
 *                return is NOT an RTO (it has a row in `returns`)
 *   refunds    → Razorpay refund rows (payments.amount_paid < 0, paise,
 *                excluding refunds Razorpay reported as failed)
 *                + manual UPI refunds on COD returns (returns.refund_amount)
 *
 * Rates are over CLOSED shipments only (delivered + RTO), so orders still in
 * transit don't dilute the RTO rate.
 */

const STAGE_SQL = `
  CASE
    WHEN o.status IN ('cancelled','order cancelled') THEN 'cancelled'
    WHEN o.status IN ('awaiting_confirmation','pending') THEN 'to_confirm'
    WHEN o.status IN ('confirmed','processing','booked','pickup initiated','manifested') THEN 'to_ship'
    WHEN o.status IN ('shipped','in transit','out for delivery') THEN 'in_transit'
    WHEN o.status IN ('undelivered','exception') THEN 'problems'
    WHEN o.status = 'delivered' THEN 'delivered'
    WHEN o.status IN ('return_initiated','returned_rto') AND rt.order_id IS NOT NULL THEN 'returned'
    WHEN o.status IN ('rto','rto delivered','returned_rto') THEN 'rto'
    ELSE 'other'
  END`;

// Per-order refunds (rupees) and "has a customer return" flag.
const JOINS = `
  LEFT JOIN (SELECT DISTINCT order_id FROM returns) rt ON rt.order_id = o.id
  LEFT JOIN (
    SELECT order_id, SUM(-amount_paid) / 100 AS amt FROM payments WHERE amount_paid < 0 AND status <> 'failed' GROUP BY order_id
  ) gref ON gref.order_id = o.id
  LEFT JOIN (
    SELECT order_id, SUM(refund_amount) AS amt FROM returns WHERE status = 'refunded' AND is_cod = 1 GROUP BY order_id
  ) mref ON mref.order_id = o.id`;

const REFUND_SQL = `(COALESCE(gref.amt, 0) + COALESCE(mref.amt, 0))`;
const IST_DAY = `DATE(CONVERT_TZ(o.created_at, '+00:00', '+05:30'))`;

const num = (v) => Number(v) || 0;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const r2 = (v) => Math.round(num(v) * 100) / 100;

function whereSql({ start, end, brandId }) {
  const parts = ['o.created_at BETWEEN :start AND :end'];
  if (brandId) parts.push('o.brand_id = :brandId');
  return parts.join(' AND ');
}

// Totals per stage × payment type (+ per brand when byBrand).
async function stageRows(range, byBrand = false) {
  return sequelize.query(
    `SELECT ${byBrand ? 'o.brand_id,' : ''} ${STAGE_SQL} AS stage,
            CASE WHEN LOWER(o.payment_type) = 'cod' THEN 'cod' ELSE 'prepaid' END AS pay,
            COUNT(*) AS orders, SUM(o.final_amount) AS value, SUM(${REFUND_SQL}) AS refunds
       FROM orders o ${JOINS}
      WHERE ${whereSql(range)}
      GROUP BY ${byBrand ? 'o.brand_id,' : ''} stage, pay`,
    { replacements: range, type: QueryTypes.SELECT }
  );
}

// Per India day (order placed): every line of the sales breakdown.
//   order value = gross − discounts + shipping   (final_amount, all orders)
//   net sales   = order value − cancelled − RTO − not delivered yet − refunds
const DONE = `${STAGE_SQL} IN ('delivered','returned')`;
function dailyRows(range) {
  return sequelize.query(
    `SELECT ${IST_DAY} AS day, COUNT(*) AS placed,
            SUM(o.status NOT IN ('cancelled','order cancelled')) AS booked,
            SUM(CASE WHEN o.status NOT IN ('cancelled','order cancelled') THEN o.final_amount ELSE 0 END) AS booked_value,
            SUM(${DONE}) AS delivered,
            SUM(COALESCE(o.total_amount, 0)) AS gross,
            SUM(COALESCE(o.discount_amount, 0)) AS discounts,
            SUM(COALESCE(o.shipping_fee, 0)) AS shipping,
            SUM(COALESCE(o.final_amount, 0)) AS order_value,
            SUM(CASE WHEN ${STAGE_SQL} = 'cancelled' THEN o.final_amount ELSE 0 END) AS cancelled_value,
            SUM(CASE WHEN ${STAGE_SQL} = 'rto' THEN o.final_amount ELSE 0 END) AS rto_value,
            SUM(CASE WHEN ${DONE} THEN o.final_amount ELSE 0 END) AS delivered_value,
            SUM(CASE WHEN ${DONE} THEN ${REFUND_SQL} ELSE 0 END) AS refunds
       FROM orders o ${JOINS} WHERE ${whereSql(range)}
      GROUP BY day ORDER BY day`,
    { replacements: range, type: QueryTypes.SELECT }
  );
}
const dayStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
function dailyOut(d) {
  const orderValue = r2(d.order_value), cancelled = r2(d.cancelled_value), rto = r2(d.rto_value);
  const deliveredValue = r2(d.delivered_value), refunds = r2(d.refunds);
  return {
    day: dayStr(d.day), placed: num(d.placed), booked: num(d.booked), bookedValue: r2(d.booked_value), delivered: num(d.delivered),
    gross: r2(d.gross), discounts: r2(d.discounts), shipping: r2(d.shipping), orderValue,
    cancelled, rto, refunds, deliveredValue,
    pending: r2(orderValue - cancelled - rto - deliveredValue),
    netSales: r2(deliveredValue - refunds),
  };
}

// Fold stage rows into the summary metrics.
function summarize(rows) {
  const s = {
    placed: 0, placedValue: 0, cancelled: 0, cancelledValue: 0,
    toConfirm: 0, inPipeline: 0, pipelineValue: 0, problems: 0,
    delivered: 0, deliveredValue: 0, returned: 0, rto: 0, rtoValue: 0,
    refunds: 0, cod: { orders: 0, delivered: 0, deliveredValue: 0, rto: 0 },
    prepaid: { orders: 0, delivered: 0, deliveredValue: 0, rto: 0 },
    stages: {},
  };
  for (const r of rows) {
    const n = num(r.orders), v = num(r.value), ref = num(r.refunds);
    s.placed += n; s.placedValue += v;
    s.stages[r.stage] = (s.stages[r.stage] || 0) + n;
    const p = s[r.pay];
    if (r.stage !== 'cancelled') p.orders += n;
    switch (r.stage) {
      case 'cancelled': s.cancelled += n; s.cancelledValue += v; break;
      case 'to_confirm': s.toConfirm += n; s.inPipeline += n; s.pipelineValue += v; break;
      case 'to_ship': case 'in_transit': s.inPipeline += n; s.pipelineValue += v; break;
      case 'problems': s.problems += n; s.inPipeline += n; s.pipelineValue += v; break;
      case 'delivered': case 'returned':
        s.delivered += n; s.deliveredValue += v; s.refunds += ref;
        p.delivered += n; p.deliveredValue += v;
        if (r.stage === 'returned') s.returned += n;
        break;
      case 'rto': s.rto += n; s.rtoValue += v; p.rto += n; break;
      default: break;
    }
  }
  const closed = s.delivered + s.rto;
  s.booked = s.placed - s.cancelled;
  s.netSales = r2(s.deliveredValue - s.refunds);
  s.aov = s.delivered ? r2(s.netSales / s.delivered) : 0;
  s.rates = {
    delivery: pct(s.delivered, closed),
    rto: pct(s.rto, closed),
    codRto: pct(s.cod.rto, s.cod.delivered + s.cod.rto),
    prepaidRto: pct(s.prepaid.rto, s.prepaid.delivered + s.prepaid.rto),
    return: pct(s.returned, s.delivered),
    cancellation: pct(s.cancelled, s.placed),
    codShare: pct(s.cod.orders, s.cod.orders + s.prepaid.orders),
  };
  for (const k of ['placedValue', 'cancelledValue', 'pipelineValue', 'deliveredValue', 'rtoValue', 'refunds']) s[k] = r2(s[k]);
  s.cod.deliveredValue = r2(s.cod.deliveredValue); s.prepaid.deliveredValue = r2(s.prepaid.deliveredValue);
  return s;
}

async function salesSummary({ start, end, brandId }) {
  const range = { start, end, brandId: brandId || null };
  const spanMs = end.getTime() - start.getTime() + 1;
  const prev = { start: new Date(start.getTime() - spanMs), end: new Date(start.getTime() - 1), brandId: range.brandId };

  const [rows, prevRows, brandRowsRaw, daily, prevDaily, topProducts, rtoByCourier, rtoByState, returnsByReason, brands] = await Promise.all([
    stageRows(range),
    stageRows(prev),
    stageRows(range, true),
    dailyRows(range),
    dailyRows(prev),
    sequelize.query(
      `SELECT p.id, p.name, SUM(oi.quantity) AS units, SUM(oi.subtotal) AS value,
              SUM(CASE WHEN ${STAGE_SQL} IN ('delivered','returned') THEN oi.quantity ELSE 0 END) AS delivered_units,
              SUM(CASE WHEN ${STAGE_SQL} = 'returned' THEN oi.quantity ELSE 0 END) AS returned_units,
              SUM(CASE WHEN ${STAGE_SQL} = 'rto' THEN oi.quantity ELSE 0 END) AS rto_units
         FROM order_items oi JOIN orders o ON o.id = oi.order_id ${JOINS}
         JOIN products p ON p.id = oi.product_id
        WHERE ${whereSql(range)} AND o.status NOT IN ('cancelled','order cancelled')
        GROUP BY p.id, p.name ORDER BY units DESC LIMIT 15`,
      { replacements: range, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COALESCE(NULLIF(o.courier_name, ''), 'Unknown') AS courier,
              SUM(${STAGE_SQL} IN ('delivered','returned')) AS delivered, SUM(${STAGE_SQL} = 'rto') AS rto
         FROM orders o ${JOINS} WHERE ${whereSql(range)}
        GROUP BY courier HAVING delivered + rto > 0 ORDER BY rto DESC, delivered DESC LIMIT 10`,
      { replacements: range, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COALESCE(NULLIF(a.state, ''), 'Unknown') AS state,
              SUM(${STAGE_SQL} IN ('delivered','returned')) AS delivered, SUM(${STAGE_SQL} = 'rto') AS rto
         FROM orders o ${JOINS} LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
        WHERE ${whereSql(range)}
        GROUP BY state HAVING rto > 0 ORDER BY rto DESC LIMIT 10`,
      { replacements: range, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT r.reason, COUNT(*) AS returns, SUM(r.status = 'refunded') AS refunded,
              SUM(CASE WHEN r.status = 'refunded' THEN r.refund_amount ELSE 0 END) AS refund_value
         FROM returns r JOIN orders o ON o.id = r.order_id
        WHERE ${whereSql(range)}
        GROUP BY r.reason ORDER BY returns DESC`,
      { replacements: range, type: QueryTypes.SELECT }
    ),
    sequelize.query(`SELECT id, COALESCE(display_name, name) AS name FROM brands`, { type: QueryTypes.SELECT }),
  ]);

  const summary = summarize(rows);
  const dailyRows2 = daily.map(dailyOut);
  const previous = summarize(prevRows);
  const delta = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

  const byBrandRows = new Map();
  for (const r of brandRowsRaw) {
    if (!byBrandRows.has(r.brand_id)) byBrandRows.set(r.brand_id, []);
    byBrandRows.get(r.brand_id).push(r);
  }
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const byBrand = [...byBrandRows.entries()].map(([id, rs]) => {
    const b = summarize(rs);
    return {
      brandId: id, brand: brandName.get(id) || `Brand ${id}`,
      placed: b.placed, booked: b.booked, delivered: b.delivered, netSales: b.netSales, aov: b.aov,
      pipelineValue: b.pipelineValue, rto: b.rto, rtoRate: b.rates.rto, returnRate: b.rates.return,
      cancellationRate: b.rates.cancellation, codShare: b.rates.codShare, refunds: b.refunds,
    };
  }).sort((a, b) => b.netSales - a.netSales || b.booked - a.booked);

  const closedRate = (x) => ({ ...x, delivered: num(x.delivered), rto: num(x.rto), rtoRate: pct(num(x.rto), num(x.delivered) + num(x.rto)) });

  return {
    range: { start, end },
    summary,
    previous: { netSales: previous.netSales, booked: previous.booked, delivered: previous.delivered, rtoRate: previous.rates.rto, aov: previous.aov },
    deltas: {
      netSales: delta(summary.netSales, previous.netSales),
      booked: delta(summary.booked, previous.booked),
      delivered: delta(summary.delivered, previous.delivered),
      aov: delta(summary.aov, previous.aov),
    },
    byBrand,
    daily: dailyRows2,
    previousDaily: prevDaily.map(dailyOut),
    // Order value → net sales, for the whole period (sums of the daily lines).
    breakdown: (() => {
      const t = {};
      for (const k of ['gross', 'discounts', 'shipping', 'orderValue', 'cancelled', 'rto', 'pending', 'refunds', 'deliveredValue', 'netSales', 'placed', 'delivered']) {
        t[k] = r2(dailyRows2.reduce((a, d) => a + num(d[k]), 0));
      }
      return t;
    })(),
    topProducts: topProducts.map((p) => ({ id: p.id, name: p.name, units: num(p.units), value: r2(p.value), deliveredUnits: num(p.delivered_units), returnedUnits: num(p.returned_units), rtoUnits: num(p.rto_units) })),
    rtoByCourier: rtoByCourier.map(closedRate),
    rtoByState: rtoByState.map(closedRate),
    returnsByReason: returnsByReason.map((r) => ({ reason: r.reason, returns: num(r.returns), refunded: num(r.refunded), refundValue: r2(r.refund_value) })),
  };
}

module.exports = { salesSummary, STAGE_SQL, JOINS, REFUND_SQL };
