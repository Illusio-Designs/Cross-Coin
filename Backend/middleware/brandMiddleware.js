const Brand = require('../model/brandModel.js');

/**
 * Middleware to identify and validate brand from request header
 * Requires X-Brand-Name header in all requests
 */
module.exports.identifyBrand = async (req, res, next) => {
    try {
        // Get brand slug from X-Brand-Name header
        const brandSlug = req.headers['x-brand-name'];

        // If no brand header provided, return error
        if (!brandSlug) {
            return res.status(400).json({
                success: false,
                message: 'Brand identifier required. Please provide X-Brand-Name header'
            });
        }

        // Fetch brand from database
        const brand = await Brand.findOne({
            where: { 
                slug: brandSlug.toLowerCase(),
                status: 'active'
            }
        });

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: `Brand '${brandSlug}' not found or inactive`
            });
        }

        // Attach brand to request object
        req.brand = brand;
        req.brandId = brand.id;

        // Cross-tenant access check for write operations
        const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        if (writeMethods.includes(req.method) && req.user) {
            const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];
            if (STAFF_ROLES.includes(req.user.role)) {
                // Staff/admin users can access all brands
            } else if (req.user.role === 'consumer') {
                // Consumers: verify they have orders associated with this brand
                const { Order } = require('../model/orderModel.js');
                const hasAccess = await Order.findOne({
                    where: { user_id: req.user.id, brand_id: brand.id }
                });
                if (!hasAccess) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You do not have access to this brand.'
                    });
                }
            }
        }
        // For read operations or unauthenticated (public) requests, allow — brand identification is just for scoping
        
        console.log(`✅ Brand identified: ${brand.name} (ID: ${brand.id})`);
        next();
    } catch (error) {
        console.error('Brand identification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to identify brand',
            error: error.message
        });
    }
};

/**
 * Optional middleware - allows requests without brand
 * Useful for admin endpoints that manage all brands
 */
module.exports.optionalBrand = async (req, res, next) => {
    try {
        const brandSlug = req.headers['x-brand-name'];
        
        if (brandSlug) {
            const brand = await Brand.findOne({
                where: { slug: brandSlug.toLowerCase(), status: 'active' }
            });
            
            if (brand) {
                req.brand = brand;
                req.brandId = brand.id;
                console.log(`✅ Optional brand identified: ${brand.name} (ID: ${brand.id})`);
            }
        }
        
        next();
    } catch (error) {
        const { logger } = require('../config/logging.js');
        logger.warn('Optional brand middleware error:', error.message);
        next(); // Continue even if brand identification fails
    }
};
