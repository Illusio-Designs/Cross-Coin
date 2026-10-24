'use strict';

// In-memory SSE client registry
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) { clients.delete(res); }
  }
}

// ── Long-poll waiter registry (cPanel-safe push, no persistent protocol) ────
// A /notifications/poll request that finds nothing new parks here; the next
// emit (or its own timeout) wakes it so it can re-query and return instantly.
// Node's async model means hundreds of parked requests cost almost nothing —
// unlike SSE/WebSocket they hold no special connection state.
const waiters   = new Set(); // any event (orders + whatsapp) — global notifications
const waWaiters = new Set(); // whatsapp-only — the WhatsApp inbox live stream

function notifyAll(set) {
  for (const wake of set) { try { wake(); } catch (_) {} }
  set.clear();
}

// Resolves when a matching event is emitted, or after timeoutMs (whichever first).
function waitOn(set, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      set.delete(finish);
      clearTimeout(timer);
      resolve();
    };
    set.add(finish);
    const timer = setTimeout(finish, timeoutMs);
  });
}

// Cross-process wake-up. emitNewOrder / emitNewWhatsApp only reach waiters in
// THIS process, but an order can be placed through another one (the store
// API while the admin panel talks to admin-api, or a second Passenger
// process). So while anyone is waiting, check every 3 s for a new order or
// WhatsApp message id (MAX(id), primary key: cheap) and wake them.
const DB_CHECK_MS = 3000;
let dbTimer = null;
let lastIds = null; // { order, wa }
async function checkDb() {
  if (!waiters.size && !waWaiters.size) {
    clearInterval(dbTimer); dbTimer = null; lastIds = null;
    return;
  }
  try {
    const { sequelize } = require('../config/db.js');
    const [[o]] = await sequelize.query('SELECT MAX(id) AS id FROM orders');
    let wa = null;
    try { [[{ id: wa }]] = await sequelize.query('SELECT MAX(id) AS id FROM whatsapp_messages'); } catch (_) { /* no WhatsApp tables */ }
    const now = { order: Number(o?.id) || 0, wa: Number(wa) || 0 };
    if (lastIds) {
      if (now.order > lastIds.order || now.wa > lastIds.wa) notifyAll(waiters);
      if (now.wa > lastIds.wa) notifyAll(waWaiters);
    }
    lastIds = now;
  } catch (_) { /* database busy: try again on the next tick */ }
}
function watchDb() {
  if (dbTimer) return;
  dbTimer = setInterval(() => { checkDb(); }, DB_CHECK_MS);
  if (dbTimer.unref) dbTimer.unref();
  checkDb(); // baseline right away
}

function waitForNotification(timeoutMs = 25000) { const p = waitOn(waiters, timeoutMs); watchDb(); return p; }
function waitForWhatsApp(timeoutMs = 25000)     { const p = waitOn(waWaiters, timeoutMs); watchDb(); return p; }

function emitNewOrder(order) {
  broadcast('new_order', {
    id: order.id,
    orderNumber: order.order_number,
    amount: order.final_amount,
    paymentType: order.payment_type,
    createdAt: order.createdAt || new Date(),
  });
  notifyAll(waiters);
}

function emitNewWhatsApp(phone, message) {
  broadcast('new_whatsapp', {
    phone,
    message,
    createdAt: new Date(),
  });
  notifyAll(waiters);   // wakes the global notifications long-poll
  notifyAll(waWaiters); // wakes the WhatsApp inbox live stream
}

module.exports = { emitNewOrder, emitNewWhatsApp, waitForNotification, waitForWhatsApp };
