'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, isStaff } = require('../middleware/authMiddleware.js');
const { Order } = require('../model/orderModel.js');
const { WhatsappConversation, WhatsappMessage } = require('../model/whatsappConversationModel.js');
const { Op } = require('sequelize');

// Poll for new notifications since a given timestamp
// GET /api/notifications/poll?since=<ISO timestamp>
router.get('/poll', authenticate, isStaff, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 10000);

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
          attributes: ['direction'],
          where: { direction: 'inbound', createdAt: { [Op.gt]: since } },
          required: true,
          limit: 1,
          order: [['createdAt', 'DESC']],
        }],
        order: [['last_message_at', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      orders: newOrders,
      whatsapp: newMessages,
      serverTime: new Date(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
