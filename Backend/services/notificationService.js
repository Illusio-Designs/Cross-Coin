'use strict';

// In-memory SSE client registry
const clients = new Set();

function addClient(res) {
  clients.add(res);
}

function removeClient(res) {
  clients.delete(res);
}

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

function waitForNotification(timeoutMs = 25000) { return waitOn(waiters, timeoutMs); }
function waitForWhatsApp(timeoutMs = 25000)     { return waitOn(waWaiters, timeoutMs); }

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

module.exports = { addClient, removeClient, emitNewOrder, emitNewWhatsApp, waitForNotification, waitForWhatsApp };
