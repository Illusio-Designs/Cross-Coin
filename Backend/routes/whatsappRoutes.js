const express = require('express');
const router = express.Router();
const ctrl = require('../controller/whatsappController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

// Webhook — no auth (Meta calls these)
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', ctrl.receiveWebhook);

// Admin chat — auth required
router.get('/conversations', isAuthenticated, authorize(['admin']), ctrl.getConversations);
router.get('/conversations/:id/messages', isAuthenticated, authorize(['admin']), ctrl.getMessages);
router.post('/conversations/:id/reply', isAuthenticated, authorize(['admin']), ctrl.sendReply);
router.put('/conversations/:id/resolve', isAuthenticated, authorize(['admin']), ctrl.resolveConversation);

module.exports = router;
