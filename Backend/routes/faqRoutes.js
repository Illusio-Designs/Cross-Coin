const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/public/faqs', faqController.getPublicFaqs);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/faqs',          authenticate, isAdmin, faqController.listFaqs);
router.post('/admin/faqs',         authenticate, isAdmin, faqController.createFaq);
router.put('/admin/faqs/reorder',  authenticate, isAdmin, faqController.reorderFaqs);
router.put('/admin/faqs/:id',      authenticate, isAdmin, faqController.updateFaq);
router.delete('/admin/faqs/:id',   authenticate, isAdmin, faqController.deleteFaq);

module.exports = router;
