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
router.get('/stats/sla', isAuthenticated, isWhatsappManager, ctrl.getSLAStats);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates',          isAuthenticated, isWhatsappManager, ctrl.listTemplates);
router.post('/templates',         isAuthenticated, isWhatsappManager, ctrl.createTemplate);
router.delete('/templates/:name', isAuthenticated, isWhatsappManager, ctrl.deleteTemplate);
router.post('/templates/seed',    isAuthenticated, isAdmin, ctrl.seedTemplates);

// ── Test connection ───────────────────────────────────────────────────────────
router.post('/test', isAuthenticated, isAdmin, ctrl.testConnection);

// ── Conversations / Inbox ─────────────────────────────────────────────────────
router.get('/conversations',                    isAuthenticated, isWhatsappManager, ctrl.getConversations);
router.get('/conversations/:id/messages',       isAuthenticated, isWhatsappManager, ctrl.getMessages);
router.post('/conversations/:id/reply',         isAuthenticated, isWhatsappManager, ctrl.sendReply);
router.put('/conversations/:id/resolve',        isAuthenticated, isWhatsappManager, ctrl.resolveConversation);
router.put('/conversations/:id/assign',         isAuthenticated, isWhatsappManager, ctrl.assignConversation);
router.put('/conversations/:id/tags',           isAuthenticated, isWhatsappManager, ctrl.tagConversation);
router.put('/conversations/:id/optout',         isAuthenticated, isWhatsappManager, ctrl.setOptOut);

// ── Canned Responses ──────────────────────────────────────────────────────────
router.get('/canned-responses',     isAuthenticated, isWhatsappManager, ctrl.getCannedResponses);
router.post('/canned-responses',    isAuthenticated, isWhatsappManager, ctrl.createCannedResponse);
router.put('/canned-responses/:id', isAuthenticated, isWhatsappManager, ctrl.updateCannedResponse);
router.delete('/canned-responses/:id', isAuthenticated, isWhatsappManager, ctrl.deleteCannedResponse);

// ── Broadcast Campaigns ───────────────────────────────────────────────────────
router.get('/broadcasts',         isAuthenticated, isWhatsappManager, ctrl.getBroadcasts);
router.post('/broadcasts',        isAuthenticated, isWhatsappManager, ctrl.createBroadcast);
router.post('/broadcasts/:id/run', isAuthenticated, isAdmin, ctrl.runBroadcast);

// ── Back-in-stock notifications ───────────────────────────────────────────────
router.post('/notify/back-in-stock', isAuthenticated, isAdmin, ctrl.notifyBackInStock);

module.exports = router;
