const express = require('express');
const {
    getAllShippingFees,
    createShippingFee,
    updateShippingFee,
    getShippingFeeByType,
    deleteShippingFee
} = require('../controller/shippingFeeController.js');
const { isAuthenticated, isOrderManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// ── Dashboard → Shipping & courier (registered before '/:type') ──────────
const shippingAdmin = require('../services/shippingAdminService.js');
// Every brand's fees / free-delivery threshold / COD limit, courier account and webhook summary.
router.get('/admin/overview', isAuthenticated, isOrderManager, async (req, res) => {
    try { res.json({ success: true, ...(await shippingAdmin.overview()) }); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
// Save one brand: { prepaidFee, codFee, offerCod, freeOver, codMax }
router.put('/admin/brand/:brandId', isAuthenticated, isOrderManager, async (req, res) => {
    try {
        const result = await shippingAdmin.saveBrand(parseInt(req.params.brandId, 10), req.body || {}, req.user?.id || null);
        if (result.errors) return res.status(400).json({ success: false, message: 'Some amounts need fixing', errors: result.errors });
        res.json({ success: true, ...(await shippingAdmin.overview()) });
    } catch (err) { res.status(err.status || 500).json({ success: false, message: err.message }); }
});

// Public routes
router.get('/', getAllShippingFees);
router.get('/:type', getShippingFeeByType);

// Order Manager routes
router.post('/', isAuthenticated, isOrderManager, createShippingFee);
router.put('/:id', isAuthenticated, isOrderManager, updateShippingFee);
router.delete('/:id', isAuthenticated, isOrderManager, deleteShippingFee);

module.exports = router; 