const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController.js');
const { authenticate, isProductManager } = require('../middleware/authMiddleware.js');

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/public/faqs', faqController.getPublicFaqs);

// ── Admin ───────────────────────────────────────────────────────────────────
router.get('/admin/faqs',          authenticate, isProductManager, faqController.listFaqs);
router.post('/admin/faqs',         authenticate, isProductManager, faqController.createFaq);
router.put('/admin/faqs/reorder',  authenticate, isProductManager, faqController.reorderFaqs);
router.put('/admin/faqs/:id',      authenticate, isProductManager, faqController.updateFaq);
router.delete('/admin/faqs/:id',   authenticate, isProductManager, faqController.deleteFaq);

module.exports = router;
