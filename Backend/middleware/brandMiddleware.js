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
        console.error('Optional brand middleware error:', error);
        next(); // Continue even if brand identification fails
    }
};
