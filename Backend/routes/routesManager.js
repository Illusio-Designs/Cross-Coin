// routes/routesManager.js
const express = require('express');
const router = express.Router();

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

// Core Routes
router.use('/users', userRoutes); // This now includes both auth and user routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

// Feature Routes
router.use('/sliders', sliderRoutes);
router.use('/coupons', couponRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/shipping-addresses', shippingAddressRoutes);
router.use('/payments', paymentRoutes);
router.use('/shipping-fees', shippingFeeRoutes);
router.use('/order-status-history', orderStatusHistoryRoutes);
router.use('/seo', seoRoutes);
router.use('/attributes', attributeRoutes);


// Review routes
router.use('/reviews', reviewRoutes);

// Cart routes
router.use('/cart', cartRoutes);

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