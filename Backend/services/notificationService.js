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

function emitNewOrder(order) {
  broadcast('new_order', {
    id: order.id,
    orderNumber: order.order_number,
    amount: order.final_amount,
    paymentType: order.payment_type,
    createdAt: order.createdAt || new Date(),
  });
}

function emitNewWhatsApp(phone, message) {
  broadcast('new_whatsapp', {
    phone,
    message,
    createdAt: new Date(),
  });
}

module.exports = { addClient, removeClient, emitNewOrder, emitNewWhatsApp };
