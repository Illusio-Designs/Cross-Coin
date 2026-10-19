'use strict';

// Everything the WhatsApp inbox shows beside a chat: the customer's orders
// (matched by phone — registered account, guest record or shipping address),
// a few totals, and whether WhatsApp's 24-hour reply window is still open
// (free-text replies are only delivered within 24 h of the customer's last
// message; after that only an approved template can be sent).
const { sequelize } = require('../config/db.js');
const { QueryTypes } = require('sequelize');
const { phoneHash } = require('../utils/encryption.js');

const STAGE = [
  [['awaiting_confirmation', 'pending'], 'to_confirm', 'To confirm'],
  [['confirmed', 'processing', 'booked', 'pickup initiated', 'manifested'], 'to_ship', 'To ship'],
  [['shipped', 'in transit', 'out for delivery'], 'in_transit', 'In transit'],
  [['undelivered', 'exception'], 'problems', 'Delivery problem'],
  [['delivered'], 'delivered', 'Delivered'],
  [['return_initiated', 'returned_rto'], 'returns', 'Returned'],
  [['cancelled', 'order cancelled'], 'cancelled_rto', 'Cancelled'],
  [['rto', 'rto delivered'], 'cancelled_rto', 'RTO'],
];
function stageOf(status, paymentType) {
  const s = String(status || '').toLowerCase();
  for (const [list, key, label] of STAGE) {
    if (list.includes(s)) {
      // Prepaid orders awaiting confirmation aren't a COD call — they're just new.
      if (key === 'to_confirm' && String(paymentType || '').toLowerCase() !== 'cod') return { key: 'to_ship', label: 'New' };
      return { key, label };
    }
  }
  return { key: 'other', label: status || '—' };
}

async function getChatContext(conversationId) {
  const [conv] = await sequelize.query(
    `SELECT id, customer_phone, customer_name, brand_id FROM whatsapp_conversations WHERE id = :id`,
    { replacements: { id: conversationId }, type: QueryTypes.SELECT });
  if (!conv) return null;

  const p10 = String(conv.customer_phone || '').replace(/\D/g, '').slice(-10);
  const h = phoneHash(p10);

  // 24-hour customer-service window from the customer's last message.
  const [last] = await sequelize.query(
    `SELECT MAX(createdAt) AS at FROM whatsapp_messages WHERE conversation_id = :id AND direction = 'inbound'`,
    { replacements: { id: conv.id }, type: QueryTypes.SELECT });
  const lastInbound = last?.at ? new Date(last.at) : null;
  const closesAt = lastInbound ? new Date(lastInbound.getTime() + 24 * 3600 * 1000) : null;
  const replyWindow = { open: !!closesAt && closesAt > new Date(), closesAt, lastInboundAt: lastInbound };

  if (p10.length !== 10) return { conversationId: conv.id, replyWindow, customer: null, orders: [], stats: null };

  // Orders for this phone: account phone, guest phone, or the shipping phone.
  const orders = await sequelize.query(
    `SELECT o.id, o.order_number, o.status, o.payment_type, o.payment_status, o.final_amount,
            o.created_at, o.shipping_waybill, o.courier_name, o.shipping_label_url,
            o.user_id, o.guest_user_id, o.shipping_address_id,
            COALESCE(b.display_name, b.name) AS brand
       FROM orders o
       LEFT JOIN brands b ON b.id = o.brand_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN guest_users g ON g.id = o.guest_user_id
       LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
      WHERE ${h ? 'a.phone_hash = :h OR g.phone_hash = :h OR ' : ''}RIGHT(u.phone, 10) = :p10
      ORDER BY o.created_at DESC
      LIMIT 20`,
    { replacements: { h, p10 }, type: QueryTypes.SELECT });

  // Item lines for the newest few orders.
  const top = orders.slice(0, 5);
  const ids = top.map((o) => o.id);
  const items = ids.length ? await sequelize.query(
    `SELECT oi.order_id, oi.quantity, p.name
       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id IN (:ids)`,
    { replacements: { ids }, type: QueryTypes.SELECT }) : [];
  const itemsBy = new Map();
  for (const it of items) {
    if (!itemsBy.has(it.order_id)) itemsBy.set(it.order_id, []);
    itemsBy.get(it.order_id).push(`${it.quantity} × ${it.name || 'item'}`);
  }

  // Shipping address of the latest order, read through the model so the
  // encrypted fields come back decrypted.
  let address = null;
  if (top[0]?.shipping_address_id) {
    try {
      const { ShippingAddress } = require('../model/shippingAddressModel.js');
      const a = await ShippingAddress.findByPk(top[0].shipping_address_id);
      if (a) {
        const sameCount = orders.filter((o) => o.shipping_address_id === a.id && String(o.status).toLowerCase() === 'delivered').length;
        address = {
          text: [a.address, a.city, a.state, a.pincode].filter(Boolean).join(', '),
          name: a.full_name || null,
          deliveredHere: sameCount,
        };
      }
    } catch (_) { /* address is optional */ }
  }

  const delivered = orders.filter((o) => String(o.status).toLowerCase() === 'delivered');
  const latest = orders[0];
  const customer = latest
    ? (latest.user_id ? { kind: 'user', id: latest.user_id } : latest.guest_user_id ? { kind: 'guest', id: latest.guest_user_id } : { kind: 'phone', phone: p10 })
    : null;

  return {
    conversationId: conv.id,
    replyWindow,
    customer,
    address,
    stats: {
      orders: orders.length,
      delivered: delivered.length,
      spent: Math.round(delivered.reduce((n, o) => n + (Number(o.final_amount) || 0), 0)),
      rto: orders.filter((o) => ['rto', 'rto delivered', 'returned_rto'].includes(String(o.status).toLowerCase())).length,
    },
    orders: top.map((o) => {
      const st = stageOf(o.status, o.payment_type);
      return {
        id: o.id,
        orderNumber: o.order_number,
        brand: o.brand,
        status: o.status,
        stage: st.key,
        stageLabel: st.label,
        paymentType: String(o.payment_type || '').toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
        paymentStatus: o.payment_status,
        total: Math.round(Number(o.final_amount) || 0),
        createdAt: o.created_at,
        awb: o.shipping_waybill || null,
        courier: o.courier_name || null,
        labelUrl: o.shipping_label_url || null,
        items: itemsBy.get(o.id) || [],
      };
    }),
  };
}

module.exports = { getChatContext };
