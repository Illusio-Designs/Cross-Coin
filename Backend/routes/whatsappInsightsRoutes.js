'use strict';

// WhatsApp Studio — abandoned carts, analytics, settings and the profile page.
// Mounted at /api/whatsapp AFTER whatsappRoutes.js (see routesManager.js), so
// none of these paths may collide with the ones defined there.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controller/whatsappInsightsController.js');
const profile = require('../controller/whatsappProfileController.js');
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

// ── Profile, connection keys, per-store identity (admins only) ───────────────
// One square photo, kept in memory and streamed to Meta (never written to disk).
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const onePhoto = (req, res, next) => photoUpload.single('photo')(req, res, (err) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo is bigger than 5 MB. Pick a smaller one.'
    : err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT' ? 'Send one photo in the “photo” field.'
      : 'Couldn’t read the photo. Try again with a JPG or PNG.';
  res.status(400).json({ success: false, message });
});

router.get('/profile',              isAuthenticated, isAdmin, profile.getProfile);
router.put('/profile',              isAuthenticated, isAdmin, profile.updateProfile);
router.post('/profile/photo',       isAuthenticated, isAdmin, onePhoto, profile.uploadPhoto);
router.post('/profile/name',        isAuthenticated, isAdmin, profile.requestName);
router.get('/keys',                 isAuthenticated, isAdmin, profile.getKeys);
router.put('/keys',                 isAuthenticated, isAdmin, profile.saveKeys);
router.get('/stores-identity',      isAuthenticated, isAdmin, profile.storesIdentity);

module.exports = router;
