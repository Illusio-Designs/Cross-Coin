// routes/routesManager.js
import express from 'express';
const router = express.Router();

// Import all route modules
import userRoutes from './userRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import sliderRoutes from './sliderRoutes.js';
import couponRoutes from './couponRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import shippingAddressRoutes from './shippingAddressRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import shippingFeeRoutes from './shippingFeeRoutes.js';
import orderStatusHistoryRoutes from './orderStatusHistoryRoutes.js';
import seoRoutes from './seoRoutes.js';
import attributeRoutes from './attributeRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import cartRoutes from './cartRoutes.js';

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
router.use('/order-status', orderStatusHistoryRoutes);
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

export default router;