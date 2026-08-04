'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, isStaff } = require('../middleware/authMiddleware.js');
const { Order } = require('../model/orderModel.js');
const { WhatsappConversation, WhatsappMessage } = require('../model/whatsappConversationModel.js');
const { Op } = require('sequelize');

// Long-poll for new notifications since a given timestamp.
// GET /api/notifications/poll?since=<ISO timestamp>[&wait=0]
// If nothing is new, the request is HELD open (up to ~25s) and returns the
// moment a new order / inbound WhatsApp is emitted — near-instant delivery with
// a fraction of the requests of fixed-interval polling. Pass wait=0 to disable
// the hold (immediate return, for a one-off check). cPanel-safe: it's a normal
// HTTP request, not a persistent SSE/WebSocket connection.
const LONG_POLL_MS = 25000;

router.get('/poll', authenticate, isStaff, async (req, res) => {
  try {
    const notificationService = require('../services/notificationService.js');
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 10000);
    const longPoll = req.query.wait !== '0';

    const fetchSince = async () => {
      const [newOrders, newMessages] = await Promise.all([
        Order.findAll({
          where: { createdAt: { [Op.gt]: since } },
          attributes: ['id', 'order_number', 'final_amount', 'payment_type', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 10,
        }),
        WhatsappConversation.findAll({
          where: { last_message_at: { [Op.gt]: since }, status: 'open' },
          attributes: ['id', 'customer_phone', 'last_message', 'last_message_at'],
          include: [{
            model: WhatsappMessage,
            as: 'Messages',
            attributes: ['direction', 'createdAt'],
            where: { direction: 'inbound', createdAt: { [Op.gt]: since } },
            required: true,
            limit: 1,
            order: [['createdAt', 'DESC']],
          }],
          order: [['last_message_at', 'DESC']],
          limit: 10,
        }),
      ]);
      return { orders: newOrders, whatsapp: newMessages };
    };

    let result = await fetchSince();

    // Nothing yet → park the request until an emit wakes us or it times out,
    // then re-query once (a small settle delay lets a just-committed row land).
    if (longPoll && result.orders.length === 0 && result.whatsapp.length === 0) {
      let closed = false;
      req.on('close', () => { closed = true; });
      await notificationService.waitForNotification(LONG_POLL_MS);
      if (closed) return; // client navigated away — nothing to send
      await new Promise((r) => setTimeout(r, 150));
      result = await fetchSince();
    }

    res.json({
      success: true,
      orders: result.orders,
      whatsapp: result.whatsapp,
      serverTime: new Date(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Web Push: browser notifications that fire even with the dashboard closed ──
const pushService = require('../services/pushService.js');

// Public VAPID key so the browser can subscribe.
router.get('/push/vapid-public-key', authenticate, isStaff, (req, res) => {
  res.json({ success: true, enabled: pushService.isEnabled(), publicKey: pushService.getPublicKey() });
});

// Save a browser subscription for the signed-in staff user.
router.post('/push/subscribe', authenticate, isStaff, async (req, res) => {
  try {
    await pushService.saveSubscription(req.body?.subscription || req.body, req.user?.id || null);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
