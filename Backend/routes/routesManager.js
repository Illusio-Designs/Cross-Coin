// routes/routesManager.js
const express = require('express');
const router = express.Router();
const { optionalBrand } = require('../middleware/brandMiddleware.js');

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
const blogRoutes = require('./blogRoutes.js');
const loyaltyRoutes = require('./loyaltyRoutes.js');
const adminLoyaltyRoutes = require('./adminLoyaltyRoutes.js');
const lookbookRoutes = require('./lookbookRoutes.js');
const reelRoutes = require('./reelRoutes.js');
const instagramRoutes = require('./instagramRoutes.js');
const whatsappRoutes = require('./whatsappRoutes.js');
const brandSettingsRoutes = require('./brandSettingsRoutes.js');
const leadRoutes = require('./leadRoutes.js');
const notificationRoutes = require('./notificationRoutes.js');

// User routes - shared across brands (optional brand)
router.use('/users', optionalBrand, userRoutes);

// Brand-specific routes — use optionalBrand so admin endpoints work without X-Brand-Name header.
// Controllers handle brand filtering internally: public endpoints check req.brandId/req.brand,
// admin endpoints see all brands when no header is present.
router.use('/categories', optionalBrand, categoryRoutes);
router.use('/products', optionalBrand, productRoutes);
router.use('/orders', optionalBrand, orderRoutes);
router.use('/sliders', optionalBrand, sliderRoutes);
router.use('/coupons', optionalBrand, couponRoutes);
router.use('/policies', optionalBrand, policyRoutes);
router.use('/seo', optionalBrand, seoRoutes);
router.use('/reviews', optionalBrand, reviewRoutes);
router.use('/attributes', optionalBrand, attributeRoutes);

// User-specific routes (optional brand for cross-brand features)
router.use('/wishlist', optionalBrand, wishlistRoutes);
router.use('/cart', optionalBrand, cartRoutes);
router.use('/shipping-addresses', optionalBrand, shippingAddressRoutes);
router.use('/payments', optionalBrand, paymentRoutes);
router.use('/shipping-fees', optionalBrand, shippingFeeRoutes);
router.use('/order-status-history', optionalBrand, orderStatusHistoryRoutes);

// Dashboard routes (admin, can filter by brand)
router.use('/dashboard', optionalBrand, dashboardRoutes);

// Blog routes (public routes use req.brandId for scoping; admin routes ignore it)
router.use('/blogs', optionalBrand, blogRoutes);
router.use('/loyalty', optionalBrand, loyaltyRoutes);
router.use('/admin/loyalty', optionalBrand, adminLoyaltyRoutes);
router.use('/lookbooks', optionalBrand, lookbookRoutes);
router.use('/reels', optionalBrand, reelRoutes);
router.use('/instagram', optionalBrand, instagramRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/leads', leadRoutes);
router.use('/admin', brandSettingsRoutes);
router.use('/notifications', notificationRoutes);

// Public serviceability check (no auth required)
router.get('/serviceability/:pincode', optionalBrand, async (req, res) => {
    try {
        const { pincode } = req.params;
        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ success: false, message: 'Invalid pincode. Must be 6 digits.' });
        }
        const fshipService = require('../services/fshipService');
        const settingsHelper = require('../services/settingsHelper');
        const sourcePincode = await settingsHelper.getSetting(req.brandId || 1, 'DEFAULT_WAREHOUSE_PINCODE', '363641');
        const result = await fshipService.checkServiceability(sourcePincode, pincode);
        console.log('Serviceability raw result:', JSON.stringify(result, null, 2));
        if (result && Array.isArray(result) && result.length > 0) {
            const firstCourier = result[0];

            // FShip returns a single object with "delivery": "Yes"/"No" and "cod": "Yes"/"No"
            const isDeliverable = result.some(c =>
                (c.delivery || '').toString().toLowerCase() === 'yes' || c.status === true
            );

            if (!isDeliverable) {
                return res.json({ success: true, serviceable: false, message: 'Delivery not available to this pincode.' });
            }

            const codSupported = result.some(c =>
                (c.cod || '').toString().toLowerCase() === 'yes'
            );

            const edd = firstCourier.estimated_delivery_days || firstCourier.edd ||
                firstCourier.tat || firstCourier.TAT || firstCourier.delivery_days || 5;

            return res.json({
                success: true,
                serviceable: true,
                estimated_delivery_days: typeof edd === 'string' ? parseInt(edd) || 5 : edd,
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

// WhatsApp routes are handled by whatsappRoutes.js (mounted at /whatsapp above)

module.exports = router;