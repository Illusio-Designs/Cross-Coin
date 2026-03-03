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