'use strict';

// WhatsApp Studio — abandoned carts, analytics and settings.
// Mounted at /api/whatsapp AFTER whatsappRoutes.js (see routesManager.js), so
// none of these paths may collide with the ones defined there.

const express = require('express');
const router = express.Router();
const ctrl = require('../controller/whatsappInsightsController.js');
const { isAuthenticated, isAdmin, isWhatsappManager } = require('../middleware/authMiddleware.js');

// ── Abandoned carts ──────────────────────────────────────────────────────────
router.get('/carts',                isAuthenticated, isWhatsappManager, ctrl.getCarts);
router.put('/carts/rules',          isAuthenticated, isAdmin, ctrl.saveCartRules);
router.post('/carts/:id/send-now',  isAuthenticated, isAdmin, ctrl.sendCartNow);

// ── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics',            isAuthenticated, isWhatsappManager, ctrl.getAnalytics);

// ── Settings (admins only) ───────────────────────────────────────────────────
router.get('/settings/health',      isAuthenticated, isAdmin, ctrl.getHealth);
router.get('/settings/failed',      isAuthenticated, isAdmin, ctrl.getFailed);
router.get('/settings/opted-out',   isAuthenticated, isAdmin, ctrl.getOptedOut);
router.post('/settings/test',       isAuthenticated, isAdmin, ctrl.sendTest);
router.get('/settings',             isAuthenticated, isAdmin, ctrl.getSettings);
router.put('/settings',             isAuthenticated, isAdmin, ctrl.saveSettings);

module.exports = router;
