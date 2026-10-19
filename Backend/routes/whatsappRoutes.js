const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controller/whatsappController.js');
const { isAuthenticated, isAdmin, isWhatsappManager } = require('../middleware/authMiddleware.js');
const { verifyWebhookSignature } = require('../middleware/webhookSignature.js');

// In-memory upload for outbound media (streamed straight to Meta, never disk).
// 25 MB covers WhatsApp's image/video/audio limits with headroom.
const waMediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// ── Webhook (no auth — Meta calls these) ─────────────────────────────────────
// GET is the verification handshake (token-based) — no HMAC.
// POST is the event delivery — HMAC-SHA256 verified against
// WHATSAPP_WEBHOOK_SECRET (set this to the App Secret you registered
// on Meta's developer portal under Webhook → "Verify Token" + "App
// Secret"). Until the secret is in env, requests are still accepted
// with a warning so webhook delivery isn't broken during setup.
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', verifyWebhookSignature('whatsapp'), ctrl.receiveWebhook);

// ── Customer contact (public — website chat widget) ───────────────────────────

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', isAuthenticated, isWhatsappManager, ctrl.getStats);
router.get('/stats/sla', isAuthenticated, isWhatsappManager, ctrl.getSLAStats);

// ── Templates ─────────────────────────────────────────────────────────────────
router.get('/templates',              isAuthenticated, isWhatsappManager, ctrl.listTemplates);
router.get('/templates/defaults',     isAuthenticated, isWhatsappManager, ctrl.listDefaultTemplates);
router.post('/templates',             isAuthenticated, isWhatsappManager, ctrl.createTemplate);
router.post('/templates/seed',        isAuthenticated, isAdmin, ctrl.seedTemplates);
// Submit our ready-made templates that don't exist on WhatsApp yet.
router.post('/templates/submit-missing', isAuthenticated, isAdmin, ctrl.submitMissingTemplates);
// sync-all MUST come before /:name so Express does not treat "sync-all" as a template name param
router.put('/templates/sync-all',     isAuthenticated, isAdmin, ctrl.syncAllTemplates);
router.put('/templates/:name',        isAuthenticated, isAdmin, ctrl.updateTemplate);
// Deleting locks the name on Meta for ~4 weeks — admin only.
router.delete('/templates/:name',     isAuthenticated, isAdmin, ctrl.deleteTemplate);

// ── Automatic messages (on/off + 7-day results) ──────────────────────────────
router.get('/automations',            isAuthenticated, isWhatsappManager, ctrl.getAutomations);
router.put('/automations/:key',       isAuthenticated, isAdmin, ctrl.setAutomation);

// ── Test connection ───────────────────────────────────────────────────────────
router.post('/test', isAuthenticated, isAdmin, ctrl.testConnection);

// ── Conversations / Inbox ─────────────────────────────────────────────────────
router.get('/stream',                           isAuthenticated, isWhatsappManager, ctrl.streamUpdates);
router.get('/conversations',                    isAuthenticated, isWhatsappManager, ctrl.getConversations);
router.get('/conversations/:id/messages',       isAuthenticated, isWhatsappManager, ctrl.getMessages);
// Orders, totals and the 24-hour reply window for the panel beside a chat.
router.get('/conversations/:id/context',        isAuthenticated, isWhatsappManager, async (req, res) => {
  try {
    const ctx = await require('../services/chatContextService.js').getChatContext(req.params.id);
    if (!ctx) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, ...ctx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/conversations/:id/reply',         isAuthenticated, isWhatsappManager, ctrl.sendReply);
// Approved template in a chat — the only thing allowed after the 24 h window.
router.get('/conversations/:id/template-options', isAuthenticated, isWhatsappManager, ctrl.getTemplateOptions);
router.post('/conversations/:id/template',      isAuthenticated, isWhatsappManager, ctrl.sendTemplateMessage);
router.post('/conversations/:id/send-media',    isAuthenticated, isWhatsappManager, waMediaUpload.single('file'), ctrl.sendMediaReply);
router.put('/conversations/:id/resolve',        isAuthenticated, isWhatsappManager, ctrl.resolveConversation);
router.put('/conversations/:id/brand',          isAuthenticated, isWhatsappManager, ctrl.setConversationBrand);
router.put('/conversations/:id/note',           isAuthenticated, isWhatsappManager, ctrl.setConversationNote);

// ── Canned Responses ──────────────────────────────────────────────────────────
router.get('/canned-responses',     isAuthenticated, isWhatsappManager, ctrl.getCannedResponses);
router.post('/canned-responses',    isAuthenticated, isWhatsappManager, ctrl.createCannedResponse);
router.put('/canned-responses/:id', isAuthenticated, isWhatsappManager, ctrl.updateCannedResponse);
router.delete('/canned-responses/:id', isAuthenticated, isWhatsappManager, ctrl.deleteCannedResponse);
router.post('/canned-responses/:id/used', isAuthenticated, isWhatsappManager, ctrl.markCannedResponseUsed);

// ── Broadcast Campaigns ───────────────────────────────────────────────────────
router.get('/broadcasts',          isAuthenticated, isWhatsappManager, ctrl.getBroadcasts);
// /broadcasts/audience MUST stay a fixed path (no /:id GET route shadows it).
router.get('/broadcasts/audience', isAuthenticated, isWhatsappManager, ctrl.getBroadcastAudience);
router.post('/broadcasts',         isAuthenticated, isWhatsappManager, ctrl.createBroadcast);
router.put('/broadcasts/:id/cancel', isAuthenticated, isWhatsappManager, ctrl.cancelBroadcast);
router.post('/broadcasts/:id/run', isAuthenticated, isAdmin, ctrl.runBroadcast);

// ── Media proxy ───────────────────────────────────────────────────────────────
// Two ways to authorize a browser <img>/<audio>/<video> request (neither can
// send an Authorization header):
//   1) Preferred: a signed, short-lived URL (?exp=&sig=) scoped to this one
//      (mediaId, brandId). No session JWT travels in the URL. When valid, the
//      per-item signature IS the authorization, so we skip isAuthenticated /
//      isWhatsappManager and serve directly.
//   2) Legacy fallback (kept for backward compatibility): the session JWT in
//      ?token=, copied into the Authorization header, then the normal auth chain.
router.get('/media/:mediaId', (req, res, next) => {
  const { exp, sig } = req.query;
  const brandId = req.query.brandId || 1;
  if (sig && exp && ctrl.verifyMediaAccess(req.params.mediaId, brandId, exp, sig)) {
    return ctrl.proxyMedia(req, res); // authorized by signature — bypass JWT auth
  }
  // Allow token via query param so <audio src="..."> works in browser
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, isAuthenticated, isWhatsappManager, ctrl.proxyMedia);

// ── Canned responses seed ─────────────────────────────────────────────────────
router.post('/canned-responses/seed', isAuthenticated, isAdmin, ctrl.seedCannedResponses);

// ── Send products (photo + buy link) ──────────────────────────────────────────────────
router.post('/conversations/:id/send-product-link',   isAuthenticated, isWhatsappManager, ctrl.sendProductLink);

// Sync products to WhatsApp catalog
router.post('/products/sync-catalog', isAuthenticated, isAdmin, ctrl.syncProductsCatalog);

module.exports = router;
