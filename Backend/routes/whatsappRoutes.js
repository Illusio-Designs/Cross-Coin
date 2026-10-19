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
// sync-all MUST come before /:name so Express does not treat "sync-all" as a template name param
router.put('/templates/sync-all',     isAuthenticated, isAdmin, ctrl.syncAllTemplates);
router.put('/templates/:name',        isAuthenticated, isAdmin, ctrl.updateTemplate);
router.delete('/templates/:name',     isAuthenticated, isWhatsappManager, ctrl.deleteTemplate);

// ── Test connection ───────────────────────────────────────────────────────────
router.post('/test', isAuthenticated, isAdmin, ctrl.testConnection);

// ── Conversations / Inbox ─────────────────────────────────────────────────────
router.get('/stream',                           isAuthenticated, isWhatsappManager, ctrl.streamUpdates);
router.get('/conversations',                    isAuthenticated, isWhatsappManager, ctrl.getConversations);
router.get('/conversations/:id/messages',       isAuthenticated, isWhatsappManager, ctrl.getMessages);
router.post('/conversations/:id/reply',         isAuthenticated, isWhatsappManager, ctrl.sendReply);
router.post('/conversations/:id/send-media',    isAuthenticated, isWhatsappManager, waMediaUpload.single('file'), ctrl.sendMediaReply);
router.put('/conversations/:id/resolve',        isAuthenticated, isWhatsappManager, ctrl.resolveConversation);
router.put('/conversations/:id/assign',         isAuthenticated, isWhatsappManager, ctrl.assignConversation);
router.put('/conversations/:id/tags',           isAuthenticated, isWhatsappManager, ctrl.tagConversation);
router.put('/conversations/:id/brand',          isAuthenticated, isWhatsappManager, ctrl.setConversationBrand);
router.put('/conversations/:id/note',           isAuthenticated, isWhatsappManager, ctrl.setConversationNote);
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

// ── Back-in-stock notifications ───────────────────────────────────────────────
router.post('/notify/back-in-stock', isAuthenticated, isAdmin, ctrl.notifyBackInStock);

// ── Canned responses seed ─────────────────────────────────────────────────────
router.post('/canned-responses/seed', isAuthenticated, isAdmin, ctrl.seedCannedResponses);

// ── Send product / catalogue ──────────────────────────────────────────────────
router.post('/conversations/:id/send-product',        isAuthenticated, isWhatsappManager, ctrl.sendProduct);
router.post('/conversations/:id/send-product-link',   isAuthenticated, isWhatsappManager, ctrl.sendProductLink);
router.post('/conversations/:id/send-catalogue', isAuthenticated, isWhatsappManager, ctrl.sendCatalogue);

// Sync products to WhatsApp catalog
router.post('/products/sync-catalog', isAuthenticated, isAdmin, ctrl.syncProductsCatalog);

module.exports = router;
