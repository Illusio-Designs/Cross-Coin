// routes/routesManager.js
const express = require('express');
const router = express.Router();
const { identifyBrand, optionalBrand } = require('../middleware/brandMiddleware.js');

// Import all route modules
const userRoutes = require('./userRoutes.js');
const categoryRoutes = require('./categoryRoutes.js');
const productRoutes = require('./productRoutes.js');
const orderRoutes = require('./orderRoutes.js');
const sliderRoutes = require('./sliderRoutes.js');
const couponRoutes = require('./couponRoutes.js');
const wishlistRoutes = require('./wishlistRoutes.js');
const shippingAddressRoutes = require('./shippingAddressRoutes.js');
const paymentRoutes = require('./paymentRoutes.js');
const shippingFeeRoutes = require('./shippingFeeRoutes.js');
const orderStatusHistoryRoutes = require('./orderStatusHistoryRoutes.js');
const seoRoutes = require('./seoRoutes.js');
const attributeRoutes = require('./attributeRoutes.js');
const reviewRoutes = require('./reviewRoutes.js');
const cartRoutes = require('./cartRoutes.js');
const policyRoutes = require('./policyRoutes.js');
const dashboardRoutes = require('./dashboardRoutes.js');

// User routes - shared across brands (optional brand)
router.use('/users', optionalBrand, userRoutes);

// Brand-specific routes (require brand identification)
router.use('/categories', identifyBrand, categoryRoutes);
router.use('/products', identifyBrand, productRoutes);
router.use('/orders', identifyBrand, orderRoutes);
router.use('/sliders', identifyBrand, sliderRoutes);
router.use('/coupons', identifyBrand, couponRoutes);
router.use('/policies', identifyBrand, policyRoutes);
router.use('/seo', identifyBrand, seoRoutes);
router.use('/reviews', identifyBrand, reviewRoutes);
router.use('/attributes', identifyBrand, attributeRoutes);

// User-specific routes (optional brand for cross-brand features)
router.use('/wishlist', optionalBrand, wishlistRoutes);
router.use('/cart', optionalBrand, cartRoutes);
router.use('/shipping-addresses', optionalBrand, shippingAddressRoutes);
router.use('/payments', identifyBrand, paymentRoutes);
router.use('/shipping-fees', identifyBrand, shippingFeeRoutes);
router.use('/order-status-history', identifyBrand, orderStatusHistoryRoutes);

// Dashboard routes (admin, can filter by brand)
router.use('/dashboard', optionalBrand, dashboardRoutes);

// Public serviceability check (no auth required)
router.get('/serviceability/:pincode', optionalBrand, async (req, res) => {
    try {
        const { pincode } = req.params;
        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ success: false, message: 'Invalid pincode. Must be 6 digits.' });
        }
        const fshipService = require('../services/fshipService');
        const sourcePincode = process.env.DEFAULT_WAREHOUSE_PINCODE || '400001';
        const result = await fshipService.checkServiceability(sourcePincode, pincode);
        console.log('Serviceability raw result:', JSON.stringify(result, null, 2));
        if (result && Array.isArray(result) && result.length > 0) {
            const firstCourier = result[0];
            const codSupported = result.some(c =>
                c.cod === 1 || c.cod === true || c.cod === 'yes' ||
                c.COD === 1 || c.COD === true || c.COD === 'yes' ||
                c.is_cod === true || c.is_cod === 1
            );
            return res.json({
                success: true,
                serviceable: true,
                estimated_delivery_days: firstCourier.estimated_delivery_days || firstCourier.edd || 5,
                cod_available: codSupported,
                couriers_available: result.length,
            });
        }
        // Non-array truthy response — log it so we can debug further
        if (result && !Array.isArray(result)) {
            console.warn('Unexpected serviceability response shape:', JSON.stringify(result));
        }
        return res.json({ success: true, serviceable: false, message: 'Delivery not available to this pincode.' });
    } catch (error) {
        console.error('Serviceability check error:', error.message);
        return res.status(500).json({ success: false, message: 'Unable to check serviceability. Please try again.' });
    }
});

// Health Check Route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        message: 'Server is running',
        timestamp: new Date()
    });
});

module.exports = router;