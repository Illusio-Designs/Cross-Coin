const { Coupon, CouponUsage, Cart, CartItem, Product, Category, ProductVariation } = require('../model/associations.js');
const { Op } = require('sequelize');

// Create a new coupon
module.exports.createCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            type,
            value,
            minPurchase,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            perUserLimit,
            status,
            applicableCategories,
            applicableProducts
        } = req.body;

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({
            where: { code: code.toUpperCase() }
        });

        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        // Validate discount value based on type
        if (type === 'percentage' && (value <= 0 || value > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Percentage discount must be between 0 and 100'
            });
        }

        if (type === 'fixed' && value <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Fixed discount value must be greater than 0'
            });
        }

        // Validate min purchase amount
        if (minPurchase && minPurchase < 0) {
            return res.status(400).json({
                success: false,
                message: 'Minimum purchase amount cannot be negative'
            });
        }

        // Validate max discount
        if (maxDiscount && maxDiscount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Maximum discount cannot be negative'
            });
        }

        // Validate usage limit
        if (usageLimit && usageLimit < 1) {
            return res.status(400).json({
                success: false,
                message: 'Usage limit must be at least 1'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Create the coupon
        const newCoupon = await Coupon.create({
            code: code.toUpperCase(),
            description,
            type,
            value: Number(value),
            minPurchase: minPurchase ? Number(minPurchase) : null,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            startDate: start,
            endDate: end,
            usageLimit: usageLimit || null,
            perUserLimit: perUserLimit || null,
            status: status || 'active',
            applicableCategories: applicableCategories || null,
            applicableProducts: applicableProducts || null
        });

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            coupon: newCoupon
        });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create coupon',
            error: error.message
        });
    }
};

// Get all coupons
module.exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            include: [{
                model: CouponUsage,
                as: 'CouponUsages',
                attributes: ['userId', 'usedAt', 'discountAmount'],
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons',
            error: error.message
        });
    }
};

// Get a single coupon by ID
module.exports.getCouponById = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findByPk(id, {
            include: [{
                model: CouponUsage,
                as: 'CouponUsages',
                attributes: ['userId', 'usedAt', 'discountAmount'],
                required: false
            }]
        });
        
        if (!coupon) {
            return res.status(404).json({ 
                success: false,
                message: 'Coupon not found' 
            });
        }

        res.status(200).json({
            success: true,
            ...coupon.toJSON()
        });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon',
            error: error.message
        });
    }
};

// Validate a coupon
module.exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        if (!code) {
            return res.status(400).json({ 
                success: false,
                message: 'Coupon code is required' 
            });
        }

        const coupon = await Coupon.findOne({
            where: {
                code: code.toUpperCase(),
                status: 'active',
                startDate: { [Op.lte]: new Date() },
                endDate: { [Op.gte]: new Date() }
            }
        });

        if (!coupon) {
            return res.status(404).json({ 
                success: false,
                message: 'Invalid or expired coupon code' 
            });
        }

        // Check total usage limit
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ 
                success: false,
                message: 'This coupon has reached its usage limit.' 
            });
        }

        // Check per-user usage limit
        const userUsageCount = await CouponUsage.count({
            where: { couponId: coupon.id, userId: userId }
        });

        if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
            return res.status(400).json({ 
                success: false,
                message: `You have already used this coupon the maximum number of times.` 
            });
        }

        // Specific check for coupons with no per-user limit (implying one-time use)
        if (!coupon.perUserLimit && userUsageCount > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'You have already used this coupon.' 
            });
        }

        // Get user's cart to check applicability and order amount
        const userCart = await Cart.findOne({
            where: { user_id: userId },
            include: [{
                model: CartItem,
                as: 'CartItems',
                include: [{
                    model: Product,
                    include: [{ 
                        model: Category,
                        attributes: ['id', 'name']
                    }, {
                        model: ProductVariation,
                        attributes: ['id', 'price']
                    }]
                }]
            }]
        });

        if (!userCart || !userCart.CartItems || userCart.CartItems.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Your cart is empty.' 
            });
        }

        let cartItems = userCart.CartItems;
        let applicableItems = [];
        let applicableAmount = 0;

        // Defensively parse applicableProducts and applicableCategories
        let applicableProducts = coupon.applicableProducts;
        if (typeof applicableProducts === 'string') {
            try { 
                applicableProducts = JSON.parse(applicableProducts); 
            } catch (e) { 
                applicableProducts = null; 
            }
        }
        if (!Array.isArray(applicableProducts)) {
            applicableProducts = null;
        }

        let applicableCategories = coupon.applicableCategories;
        if (typeof applicableCategories === 'string') {
            try { 
                applicableCategories = JSON.parse(applicableCategories); 
            } catch (e) { 
                applicableCategories = null; 
            }
        }
        if (!Array.isArray(applicableCategories)) {
            applicableCategories = null;
        }

        for (const item of cartItems) {
            const product = item.Product;
            if (!product) continue;

            const isApplicableProduct = !applicableProducts || applicableProducts.length === 0 || applicableProducts.includes(product.id);
            const isApplicableCategory = !applicableCategories || applicableCategories.length === 0 || applicableCategories.includes(product.categoryId);

            if (isApplicableProduct && isApplicableCategory) {
                applicableItems.push(item);
                // Use the price from the cart item or product variation
                const itemPrice = item.price || (product.ProductVariations && product.ProductVariations.length > 0 ? product.ProductVariations[0].price : 0);
                applicableAmount += itemPrice * item.quantity;
            }
        }

        if (applicableItems.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'This coupon is not applicable to any items in your cart.' 
            });
        }

        if (coupon.minPurchase && applicableAmount < coupon.minPurchase) {
            return res.status(400).json({
                success: false,
                message: `You must spend at least ₹${coupon.minPurchase} on eligible items to use this coupon.`
            });
        }

        let discountAmount = 0;
        if (coupon.type === 'percentage') {
            discountAmount = (applicableAmount * parseFloat(coupon.value)) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = parseFloat(coupon.maxDiscount);
            }
        } else { // Fixed amount
            discountAmount = parseFloat(coupon.value);
        }

        // Ensure discount doesn't exceed applicable amount
        if (discountAmount > applicableAmount) {
            discountAmount = applicableAmount;
        }

        const subtotal = cartItems.reduce((sum, item) => {
            const itemPrice = item.price || (item.Product && item.Product.ProductVariations && item.Product.ProductVariations.length > 0 ? item.Product.ProductVariations[0].price : 0);
            return sum + (itemPrice * item.quantity);
        }, 0);
        
        const finalAmount = Math.max(0, subtotal - discountAmount);

        res.status(200).json({
            success: true,
            message: 'Coupon is valid and can be applied!',
            discountAmount: discountAmount.toFixed(2),
            finalAmount: finalAmount.toFixed(2),
            subtotal: subtotal.toFixed(2),
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                description: coupon.description
            }
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon',
            error: error.message
        });
    }
};

// Apply a coupon (increment used count)
module.exports.applyCoupon = async (req, res) => {
    try {
        const { code, orderId, discountAmount } = req.body;
        const userId = req.user.id;

        if (!code) {
            return res.status(400).json({ 
                success: false,
                message: 'Coupon code is required' 
            });
        }

        if (!discountAmount || discountAmount <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Valid discount amount is required' 
            });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({
            where: { 
                code: code.toUpperCase(),
                status: 'active',
                startDate: { [Op.lte]: new Date() },
                endDate: { [Op.gte]: new Date() }
            }
        });

        if (!coupon) {
            return res.status(404).json({ 
                success: false,
                message: 'Invalid or expired coupon code' 
            });
        }

        // Check per-user usage limit
        const userUsageCount = await CouponUsage.count({
            where: { couponId: coupon.id, userId: userId }
        });

        if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
            return res.status(400).json({ 
                success: false,
                message: 'You have already used this coupon the maximum number of times.' 
            });
        }
        if (!coupon.perUserLimit && userUsageCount > 0) {
            return res.status(400).json({ 
                success: false,
                message: 'You have already used this coupon.' 
            });
        }

        // Check if coupon is already used to its maximum
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ 
                success: false,
                message: 'Coupon has reached maximum usage limit' 
            });
        }

        // Record the usage with discount amount and order association
        await CouponUsage.create({
            couponId: coupon.id,
            userId: userId,
            orderId: orderId || null,
            discountAmount: parseFloat(discountAmount),
            usedAt: new Date()
        });

        // Increment usage count on the coupon itself
        await coupon.increment('usageCount');

        res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            coupon: {
                id: coupon.id,
                code: coupon.code,
                discountAmount: parseFloat(discountAmount)
            }
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon',
            error: error.message
        });
    }
};

// Get coupon usage history for a user
module.exports.getUserCouponHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        const usageHistory = await CouponUsage.findAll({
            where: { userId },
            include: [{
                model: Coupon,
                attributes: ['code', 'type', 'value', 'minPurchase', 'maxDiscount']
            }],
            order: [['usedAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            message: 'Coupon usage history retrieved successfully',
            history: usageHistory
        });
    } catch (error) {
        console.error('Error fetching coupon history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon history',
            error: error.message
        });
    }
};

// Update a coupon
module.exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            description,
            type,
            value,
            minPurchase,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            perUserLimit,
            status,
            applicableCategories,
            applicableProducts
        } = req.body;

        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ 
                success: false,
                message: 'Coupon not found' 
            });
        }

        // Check if updated code already exists (if changing the code)
        if (code && code !== coupon.code) {
            const existingCoupon = await Coupon.findOne({
                where: { 
                    code: code.toUpperCase(),
                    id: { [Op.ne]: id }
                }
            });

            if (existingCoupon) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon code already exists'
                });
            }
        }

        // Validate discount value based on type
        if (type === 'percentage' && (value <= 0 || value > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Percentage discount must be between 0 and 100'
            });
        }

        if (type === 'fixed' && value <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Fixed discount value must be greater than 0'
            });
        }

        // Validate min purchase amount
        if (minPurchase && minPurchase < 0) {
            return res.status(400).json({
                success: false,
                message: 'Minimum purchase amount cannot be negative'
            });
        }

        // Validate max discount
        if (maxDiscount && maxDiscount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Maximum discount cannot be negative'
            });
        }

        // Validate usage limit
        if (usageLimit && usageLimit < 1) {
            return res.status(400).json({
                success: false,
                message: 'Usage limit must be at least 1'
            });
        }

        // Validate dates
        let start = coupon.startDate;
        let end = coupon.endDate;

        if (startDate) start = new Date(startDate);
        if (endDate) end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Update the coupon
        await coupon.update({
            code: code ? code.toUpperCase() : coupon.code,
            description: description !== undefined ? description : coupon.description,
            type: type || coupon.type,
            value: value !== undefined ? Number(value) : coupon.value,
            minPurchase: minPurchase !== undefined ? (minPurchase ? Number(minPurchase) : null) : coupon.minPurchase,
            maxDiscount: maxDiscount !== undefined ? (maxDiscount ? Number(maxDiscount) : null) : coupon.maxDiscount,
            startDate: start,
            endDate: end,
            usageLimit: usageLimit !== undefined ? (usageLimit ? Number(usageLimit) : null) : coupon.usageLimit,
            perUserLimit: perUserLimit !== undefined ? (perUserLimit ? Number(perUserLimit) : null) : coupon.perUserLimit,
            status: status || coupon.status,
            applicableCategories: applicableCategories !== undefined ? applicableCategories : coupon.applicableCategories,
            applicableProducts: applicableProducts !== undefined ? applicableProducts : coupon.applicableProducts
        });

        res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            coupon
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update coupon',
            error: error.message
        });
    }
};

// Delete a coupon
module.exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ 
                success: false,
                message: 'Coupon not found' 
            });
        }

        await coupon.destroy();

        res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete coupon',
            error: error.message
        });
    }
};

// Get Coupon by ID (alias for getCouponById)
module.exports.getCoupon = async (req, res) => {
    return module.exports.getCouponById(req, res);
};

// Get all active public coupons
module.exports.getPublicCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            where: {
                status: 'active',
                startDate: { [Op.lte]: new Date() },
                endDate: { [Op.gte]: new Date() }
            },
            attributes: ['id', 'code', 'description', 'type', 'value', 'minPurchase', 'maxDiscount', 'endDate'],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.error('Error fetching public coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons',
            error: error.message
        });
    }
};