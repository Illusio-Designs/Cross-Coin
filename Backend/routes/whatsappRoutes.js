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
router.get('/templates',              isAuthenticated, isWhatsappManager, ctrl.listTemplates);
router.post('/templates',             isAuthenticated, isWhatsappManager, ctrl.createTemplate);
router.post('/templates/seed',        isAuthenticated, isAdmin, ctrl.seedTemplates);
// sync-all MUST come before /:name so Express does not treat "sync-all" as a template name param
router.put('/templates/sync-all',     isAuthenticated, isAdmin, ctrl.syncAllTemplates);
router.put('/templates/:name',        isAuthenticated, isAdmin, ctrl.updateTemplate);
router.delete('/templates/:name',     isAuthenticated, isWhatsappManager, ctrl.deleteTemplate);

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

// ── Media proxy (supports token via query param for browser audio/video/img tags) ──
router.get('/media/:mediaId(*)', async (req, res, next) => {
  // Allow token via query param so <audio src="..."> works in browser
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, isAuthenticated, isWhatsappManager, ctrl.proxyMedia);

// ── Back-in-stock notifications ───────────────────────────────────────────────
router.post('/notify/back-in-stock', isAuthenticated, isAdmin, ctrl.notifyBackInStock);

// ── Canned responses seed ─────────────────────────────────────────────────────
router.post('/canned-responses/seed', isAuthenticated, isAdmin, ctrl.seedCannedResponses);

// ── Send product / catalogue ──────────────────────────────────────────────────
router.post('/conversations/:id/send-product',   isAuthenticated, isWhatsappManager, ctrl.sendProduct);
router.post('/conversations/:id/send-catalogue', isAuthenticated, isWhatsappManager, ctrl.sendCatalogue);

module.exports = router;
