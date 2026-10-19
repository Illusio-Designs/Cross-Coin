'use strict';

// Dashboard home — "today": the work queues staff act on, the order pipeline
// right now, a few headline numbers and a feed of what just happened. One
// call (GET /api/dashboard/today) so the home renders in one round trip.
// Stage rules match the Orders page (orderController DESK_STAGES) and the
// numbers match the Reports overview (salesReportService).
const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { dayStartTZ } = require('../utils/dateRange.js');

const IST_MS = 330 * 60000;
const istYmd = (d = new Date()) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
const shiftYmd = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const num = (v) => Number(v) || 0;
const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

const TO_CONFIRM = `LOWER(o.status) IN ('awaiting_confirmation','pending') AND LOWER(o.payment_type) = 'cod'`;
const TO_SHIP = `LOWER(o.status) IN ('confirmed','processing','booked','pickup initiated','manifested')`;
const IN_TRANSIT = `LOWER(o.status) IN ('shipped','in transit','out for delivery')`;
const NOT_CANCELLED = `(o.status IS NULL OR LOWER(o.status) NOT IN ('cancelled','order cancelled'))`;

async function q(sql, replacements) {
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}
// A missing optional table (fresh install) must not break the whole home.
async function safe(promise, fallback) {
  try { return await promise; } catch (_) { return fallback; }
}

async function getToday({ brandId = null } = {}) {
  const now = new Date();
  const today = istYmd(now);
  const todayStart = dayStartTZ(today);
  const yStart = dayStartTZ(shiftYmd(today, -1));
  const yNow = new Date(now.getTime() - 24 * 3600 * 1000);
  const b = brandId ? ' AND o.brand_id = :brandId' : '';
  const bPlain = brandId ? ' AND brand_id = :brandId' : '';
  const R = { brandId, todayStart, yStart, yNow, now, overdue: new Date(now.getTime() - 24 * 3600 * 1000) };

  const [
    [confirm], [ship], [transit], [deliveredToday], [closedToday],
    [ret], [ndr], [refundFailed], [bookingFailed], [wa], [stock], [reviews],
  ] = await Promise.all([
    q(`SELECT COUNT(*) AS n, SUM(o.created_at < :overdue) AS overdue, MIN(o.created_at) AS oldest
         FROM orders o WHERE ${TO_CONFIRM}${b}`, R),
    q(`SELECT COUNT(*) AS n,
              SUM(o.shipping_label_url IS NOT NULL AND (o.shipping_label_downloaded IS NULL OR o.shipping_label_downloaded = 0)) AS labels_pending,
              SUM(o.shipping_waybill IS NULL) AS not_booked
         FROM orders o WHERE ${TO_SHIP}${b}`, R),
    q(`SELECT COUNT(*) AS n FROM orders o WHERE ${IN_TRANSIT}${b}`, R),
    q(`SELECT COUNT(DISTINCT o.id) AS n, COALESCE(SUM(o.final_amount), 0) AS value
         FROM orders o WHERE LOWER(o.status) = 'delivered'${b}
          AND EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id = o.id AND LOWER(h.status) = 'delivered' AND h.created_at >= :todayStart)`, R),
    q(`SELECT COUNT(DISTINCT o.id) AS n FROM orders o
        WHERE LOWER(o.status) IN ('cancelled','order cancelled','rto','rto delivered','returned_rto')${b}
          AND EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id = o.id AND h.created_at >= :todayStart
                      AND LOWER(h.status) IN ('cancelled','order cancelled','rto','rto delivered','returned_rto'))`, R),
    safe(q(`SELECT SUM(status IN ('requested','under_review')) AS to_review,
                   SUM(status = 'received') AS to_refund,
                   COALESCE(SUM(CASE WHEN status = 'received' THEN requested_amount END), 0) AS owed,
                   SUM(status NOT IN ('refunded','rejected')) AS open_n
              FROM returns WHERE 1=1${bPlain}`, R), [{}]),
    safe(q(`SELECT SUM(status <> 'closed') AS open_n,
                   SUM(status <> 'closed' AND customer_action IS NOT NULL) AS replied
              FROM ndr_cases WHERE 1=1${bPlain}`, R), [{}]),
    safe(q(`SELECT COUNT(DISTINCT o.id) AS n, COALESCE(SUM(-p.amount_paid) / 100, 0) AS amount
              FROM payments p JOIN orders o ON o.id = p.order_id
             WHERE p.amount_paid < 0 AND p.status = 'failed' AND LOWER(o.payment_status) = 'refund_pending'${b}`, R), [{}]),
    q(`SELECT COUNT(*) AS n, MAX(o.shipping_sync_error) AS sample
         FROM orders o WHERE ${TO_SHIP} AND o.shipping_waybill IS NULL AND LOWER(o.shipping_sync_status) = 'failed'${b}`, R),
    safe(q(`SELECT COUNT(*) AS chats, COALESCE(SUM(unread_count), 0) AS messages, MIN(last_message_at) AS oldest
              FROM whatsapp_conversations WHERE unread_count > 0${bPlain}`, R), [{}]),
    safe(q(`SELECT SUM(pv.stock <= 0) AS out_n, SUM(pv.stock > 0 AND pv.stock < 10) AS low_n
              FROM product_variations pv JOIN products p ON p.id = pv.productId
             WHERE p.status = 'active'${brandId ? ' AND EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId)' : ''}`, R), [{}]),
    safe(q(`SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'${brandId ? ' AND brandId = :brandId' : ''}`, R), [{}]),
  ]);

  const hoursSince = (d) => (d ? Math.floor((now - new Date(d)) / 3600000) : null);
  let nextBatch = null;
  try { nextBatch = require('./pickupScheduleService.js').nextBatchDate(now); } catch (_) { /* optional */ }

  // ── Work queues (only non-empty ones are shown by the UI) ──
  const queues = [
    { key: 'to_confirm', priority: 'urgent', tab: 'to_confirm', count: num(confirm.n), overdue: num(confirm.overdue), oldestHours: hoursSince(confirm.oldest) },
    { key: 'ndr', priority: 'urgent', tab: 'problems', count: num(ndr.open_n), replied: num(ndr.replied) },
    { key: 'refund_failed', priority: 'urgent', tab: 'refund_due', count: num(refundFailed.n), amount: Math.round(num(refundFailed.amount)) },
    { key: 'to_ship', priority: 'today', tab: 'to_ship', count: num(ship.n), labelsPending: num(ship.labels_pending), notBooked: num(ship.not_booked), nextBatch },
    { key: 'returns_refund', priority: 'today', tab: 'returns', count: num(ret.to_refund), amount: Math.round(num(ret.owed)), toReview: num(ret.to_review) },
    { key: 'booking_failed', priority: 'today', tab: 'to_ship', count: num(bookingFailed.n), sample: bookingFailed.sample || null },
    { key: 'whatsapp', priority: 'today', view: 'whatsapp-chat', count: num(wa.chats), messages: num(wa.messages), oldestHours: hoursSince(wa.oldest) },
    { key: 'stock', priority: 'later', view: 'products', count: num(stock.out_n), low: num(stock.low_n) },
    { key: 'reviews', priority: 'later', view: 'reviews', count: num(reviews.n) },
  ];

  const pipeline = {
    toConfirm: num(confirm.n), toShip: num(ship.n), inTransit: num(transit.n),
    deliveredToday: num(deliveredToday.n), deliveredTodayValue: Math.round(num(deliveredToday.value)),
    problems: num(ndr.open_n), returnsOpen: num(ret.open_n), closedToday: num(closedToday.n),
  };

  // ── Today vs the same time yesterday ──
  const [[t], [y]] = await Promise.all([
    q(`SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN ${NOT_CANCELLED} THEN o.final_amount END), 0) AS booked,
              SUM(${NOT_CANCELLED}) AS booked_n
         FROM orders o WHERE o.created_at >= :todayStart AND o.created_at <= :now${b}`, R),
    q(`SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN ${NOT_CANCELLED} THEN o.final_amount END), 0) AS booked
         FROM orders o WHERE o.created_at >= :yStart AND o.created_at <= :yNow${b}`, R),
  ]);

  // Month-to-date net sales and 30-day RTO, from the Reports engine.
  const { salesSummary } = require('./salesReportService.js');
  const monthStart = dayStartTZ(today.slice(0, 8) + '01');
  const [month, last30] = await Promise.all([
    salesSummary({ start: monthStart, end: now, brandId }),
    salesSummary({ start: dayStartTZ(shiftYmd(today, -29)), end: now, brandId }),
  ]);

  const kpis = {
    ordersToday: num(t.orders), ordersDelta: pct(num(t.orders), num(y.orders)),
    bookedToday: Math.round(num(t.booked)), bookedDelta: pct(num(t.booked), num(y.booked)),
    aovToday: num(t.booked_n) > 0 ? Math.round(num(t.booked) / num(t.booked_n)) : 0,
    netSalesMonth: Math.round(month.summary.netSales || 0), refundsMonth: Math.round(month.summary.refunds || 0),
    rto30: last30.summary.rates.rto, rto30Prev: last30.previous.rtoRate,
    codRto30: last30.summary.rates.codRto, prepaidRto30: last30.summary.rates.prepaidRto,
  };

  // ── Last 7 IST days, booked value ──
  const weekRows = await q(
    `SELECT DATE(CONVERT_TZ(o.created_at, '+00:00', '+05:30')) AS day, COALESCE(SUM(o.final_amount), 0) AS value, COUNT(*) AS n
       FROM orders o WHERE o.created_at >= :weekStart AND ${NOT_CANCELLED}${b}
      GROUP BY day`, { ...R, weekStart: dayStartTZ(shiftYmd(today, -6)) });
  const byDay = new Map(weekRows.map((r) => [String(r.day instanceof Date ? r.day.toISOString() : r.day).slice(0, 10), r]));
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftYmd(today, -i);
    const r = byDay.get(d);
    week.push({ day: d, value: Math.round(num(r?.value)), orders: num(r?.n) });
  }

  // ── Today by brand ──
  const brands = brandId ? [] : await q(
    `SELECT COALESCE(br.display_name, br.name) AS brand, br.id AS brand_id,
            SUM(o.created_at >= :todayStart) AS orders,
            COALESCE(SUM(CASE WHEN o.created_at >= :todayStart AND ${NOT_CANCELLED} THEN o.final_amount END), 0) AS booked,
            SUM(${TO_CONFIRM}) AS to_confirm
       FROM orders o JOIN brands br ON br.id = o.brand_id
      WHERE o.created_at >= :todayStart OR (${TO_CONFIRM})
      GROUP BY br.id, brand
      ORDER BY booked DESC`, R);

  // ── Just happened: newest events across orders, deliveries, returns,
  //    refunds and WhatsApp replies ──
  const since = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
  const [newOrders, statusEvents, waIn, returnEvents, refundEvents] = await Promise.all([
    q(`SELECT o.id, o.order_number, o.final_amount, o.payment_type, o.created_at AS at, COALESCE(br.display_name, br.name) AS brand
         FROM orders o LEFT JOIN brands br ON br.id = o.brand_id
        WHERE o.created_at >= :since${b} ORDER BY o.created_at DESC LIMIT 8`, { ...R, since }),
    q(`SELECT o.id, o.order_number, h.status, h.notes, h.created_at AS at
         FROM order_status_history h JOIN orders o ON o.id = h.order_id
        WHERE h.created_at >= :since AND LOWER(h.status) IN ('delivered','undelivered','rto','rto delivered','returned_rto','cancelled','exception')${b}
        ORDER BY h.created_at DESC LIMIT 8`, { ...R, since }),
    safe(q(`SELECT c.id AS conversation_id, c.customer_name, c.customer_phone, m.body, m.type, m.createdAt AS at
              FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
             WHERE m.direction = 'inbound' AND m.createdAt >= :since${brandId ? ' AND c.brand_id = :brandId' : ''}
             ORDER BY m.id DESC LIMIT 6`, { ...R, since }), []),
    safe(q(`SELECT r.return_number, r.status, r.refund_amount, r.requested_amount, r.updated_at AS at, o.order_number
              FROM returns r JOIN orders o ON o.id = r.order_id
             WHERE r.updated_at >= :since${b} ORDER BY r.updated_at DESC LIMIT 6`, { ...R, since }), []),
    safe(q(`SELECT o.order_number, p.status, -p.amount_paid / 100 AS amount, p.updated_at AS at
              FROM payments p JOIN orders o ON o.id = p.order_id
             WHERE p.amount_paid < 0 AND p.updated_at >= :since${b} ORDER BY p.updated_at DESC LIMIT 6`, { ...R, since }), []),
  ]);
  const rupee = (n) => '₹' + Math.round(num(n)).toLocaleString('en-IN');
  const STATUS_TEXT = {
    delivered: ['ok', 'delivered'], undelivered: ['bad', 'delivery attempt failed'], exception: ['bad', 'shipment exception'],
    rto: ['warn', 'is returning to us (RTO)'], 'rto delivered': ['warn', 'came back to us (RTO)'], returned_rto: ['warn', 'returned to us'],
    cancelled: ['mut', 'cancelled'],
  };
  const waText = (m) => {
    if (m.type && m.type !== 'text' && m.type !== 'button' && m.type !== 'interactive') return `[${m.type}]`;
    let t = m.body || '';
    try { const j = JSON.parse(t); t = j.text || j.title || j.body || t; } catch (_) { /* plain text */ }
    return String(t).replace(/\s+/g, ' ').slice(0, 80);
  };
  const feed = [
    ...newOrders.map((o) => ({ tone: 'info', at: o.at, orderId: o.id, text: `New ${String(o.payment_type).toLowerCase() === 'cod' ? 'COD' : 'prepaid'} order ${o.order_number} · ${rupee(o.final_amount)}${o.brand ? ` · ${o.brand}` : ''}` })),
    ...statusEvents.map((e) => {
      const [tone, verb] = STATUS_TEXT[String(e.status).toLowerCase()] || ['mut', e.status];
      return { tone, at: e.at, orderId: e.id, text: `${e.order_number} ${verb}` };
    }),
    ...waIn.map((m) => ({ tone: 'wa', at: m.at, conversationId: m.conversation_id, text: `${m.customer_name || ('+' + String(m.customer_phone || '').slice(-10))} on WhatsApp: “${waText(m)}”` })),
    ...returnEvents.map((r) => ({
      tone: 'return', at: r.at,
      text: r.status === 'received' ? `Return ${r.return_number} (${r.order_number}) received — refund ${rupee(r.requested_amount)} due`
        : r.status === 'refunded' ? `Return ${r.return_number} refunded ${rupee(r.refund_amount)}`
        : `Return ${r.return_number} (${r.order_number}): ${String(r.status).replace(/_/g, ' ')}`,
    })),
    ...refundEvents.map((p) => ({
      tone: p.status === 'failed' ? 'bad' : 'ok', at: p.at,
      text: p.status === 'failed' ? `Refund failed for ${p.order_number} · ${rupee(p.amount)}` : `Refund ${rupee(p.amount)} sent for ${p.order_number}`,
    })),
  ].filter((e) => e.at).sort((a, z) => new Date(z.at) - new Date(a.at)).slice(0, 10);

  return {
    generatedAt: now.toISOString(),
    queues,
    pipeline,
    kpis,
    week,
    brands: brands.map((r) => ({ brandId: r.brand_id, brand: r.brand, orders: num(r.orders), booked: Math.round(num(r.booked)), toConfirm: num(r.to_confirm) })),
    feed,
  };
}

module.exports = { getToday };
