'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../model/userModel.js');
const { addClient, removeClient } = require('../services/notificationService.js');
const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

// SSE stream — token passed as query param (EventSource can't set headers)
router.get('/stream', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).end();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !STAFF_ROLES.includes(user.role)) return res.status(403).end();
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) {}
  }, 25000);

  addClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

module.exports = router;
