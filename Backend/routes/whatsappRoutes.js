const express = require('express');
const router = express.Router();
const ctrl = require('../controller/whatsappController.js');
const { isAuthenticated, isAdmin, isWhatsappManager } = require('../middleware/authMiddleware.js');

// ── Webhook (no auth — Meta calls these) ─────────────────────────────────────
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);

// ── Customer contact (public — website chat widget) ───────────────────────────
router.post('/customer/contact', ctrl.customerContact);

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', isAuthenticated, isWhatsappManager, ctrl.getStats);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates',          isAuthenticated, isWhatsappManager, ctrl.listTemplates);
router.post('/templates',         isAuthenticated, isWhatsappManager, ctrl.createTemplate);
router.delete('/templates/:name', isAuthenticated, isWhatsappManager, ctrl.deleteTemplate);
router.post('/templates/seed',    isAuthenticated, isAdmin, ctrl.seedTemplates); // admin only

// ── Test connection ───────────────────────────────────────────────────────────
router.post('/test', isAuthenticated, isAdmin, ctrl.testConnection); // admin only

// ── Conversations / Inbox ─────────────────────────────────────────────────────
router.get('/conversations',              isAuthenticated, isWhatsappManager, ctrl.getConversations);
router.get('/conversations/:id/messages', isAuthenticated, isWhatsappManager, ctrl.getMessages);
router.post('/conversations/:id/reply',   isAuthenticated, isWhatsappManager, ctrl.sendReply);
router.put('/conversations/:id/resolve',  isAuthenticated, isWhatsappManager, ctrl.resolveConversation);

module.exports = router;
