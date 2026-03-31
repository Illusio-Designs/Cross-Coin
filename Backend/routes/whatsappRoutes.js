const express = require('express');
const router = express.Router();
const ctrl = require('../controller/whatsappController.js');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware.js');

// ── Webhook (no auth — Meta calls these) ─────────────────────────────────────
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates',          isAuthenticated, isAdmin, ctrl.listTemplates);
router.post('/templates',         isAuthenticated, isAdmin, ctrl.createTemplate);
router.delete('/templates/:name', isAuthenticated, isAdmin, ctrl.deleteTemplate);
router.post('/templates/seed',    isAuthenticated, isAdmin, ctrl.seedTemplates);

// ── Test connection ───────────────────────────────────────────────────────────
router.post('/test', isAuthenticated, isAdmin, ctrl.testConnection);

// ── Conversations / Inbox ─────────────────────────────────────────────────────
router.get('/conversations',              isAuthenticated, isAdmin, ctrl.getConversations);
router.get('/conversations/:id/messages', isAuthenticated, isAdmin, ctrl.getMessages);
router.post('/conversations/:id/reply',   isAuthenticated, isAdmin, ctrl.sendReply);
router.put('/conversations/:id/resolve',  isAuthenticated, isAdmin, ctrl.resolveConversation);

module.exports = router;
