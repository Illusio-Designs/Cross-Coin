const express = require('express');
const router = express.Router();

const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');
const { upload, validateMagicBytes } = require('../middleware/uploadMiddleware.js');
const {
  createReturn,
  getMyReturns,
  getReturn,
  listReturns,
  approveReturn,
  rejectReturn,
  uploadProof,
} = require('../controller/returnController.js');

// ── Consumer (logged-in shopper) ──────────────────────────────────────────
// Create a return request with up to 4 evidence photos (field name: images).
router.post('/', isAuthenticated, upload.array('images', 4), validateMagicBytes, createReturn);
// List the current user's own return requests.
router.get('/my', isAuthenticated, getMyReturns);

// ── Admin / order manager ─────────────────────────────────────────────────
router.get('/', isAuthenticated, isOrderManager, listReturns);
router.post('/:id/approve', isAuthenticated, isOrderManager, approveReturn);
router.post('/:id/reject', isAuthenticated, isOrderManager, rejectReturn);
// Upload the manual payout proof screenshot (field name: proof).
router.post('/:id/proof', isAuthenticated, isOrderManager, upload.single('proof'), validateMagicBytes, uploadProof);

// ── Shared (owner or staff) — declared last so /my and / resolve first ─────
router.get('/:id', isAuthenticated, getReturn);

module.exports = router;
