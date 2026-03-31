const express = require('express');
const router = express.Router();
const ctrl = require('../controller/whatsappController.js');
const { isAuthenticated, requirePermission } = require('../middleware/authMiddleware.js');

// ── Webhook (no auth — Meta calls these) ─────────────────────────────────────
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates',        isAuthenticated, requirePermission('whatsapp:read'),  ctrl.listTemplates);
router.post('/templates',       isAuthenticated, requirePermission('whatsapp:write'), ctrl.createTemplate);
router.delete('/templates/:name', isAuthenticated, requirePermission('whatsapp:write'), ctrl.deleteTemplate);
router.post('/templates/seed',  isAuthenticated, requirePermission('whatsapp:write'), ctrl.seedTemplates);

// ── Test connection ───────────────────────────────────────────────────────────
router.post('/test', isAuthenticated, requirePermission('whatsapp:write'), ctrl.testConnection);

// ── Conversations / Inbox ─────────────────────────────────────────────────────
router.get('/conversations',                  isAuthenticated, requirePermission('whatsapp:read'),  ctrl.getConversations);
router.get('/conversations/:id/messages',     isAuthenticated, requirePermission('whatsapp:read'),  ctrl.getMessages);
router.post('/conversations/:id/reply',       isAuthenticated, requirePermission('whatsapp:write'), ctrl.sendReply);
router.put('/conversations/:id/resolve',      isAuthenticated, requirePermission('whatsapp:write'), ctrl.resolveConversation);

module.exports = router;
