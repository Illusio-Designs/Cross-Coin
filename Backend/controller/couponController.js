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
            applicableProducts,
            // New fields
            paymentModeRestriction,
            firstOrderOnly,
            tieredDiscounts,
            quantityBasedDiscounts
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

        if ((type === 'fixed' || type === 'tiered' || type === 'quantity_based') && value <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Discount value must be greater than 0'
            });
        }

        // Validate tiered discounts
        if (type === 'tiered' && (!tieredDiscounts || !Array.isArray(tieredDiscounts) || tieredDiscounts.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Tiered discounts are required for tiered coupon type'
            });
        }

        // Validate quantity-based discounts
        if (type === 'quantity_based' && (!quantityBasedDiscounts || !Array.isArray(quantityBasedDiscounts) || quantityBasedDiscounts.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Quantity-based discounts are required for quantity-based coupon type'
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
            applicableProducts: applicableProducts || null,
            // New fields
            paymentModeRestriction: paymentModeRestriction || 'all',
            firstOrderOnly: firstOrderOnly || false,
            tieredDiscounts: tieredDiscounts || null,
            quantityBasedDiscounts: quantityBasedDiscounts || null
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

// Validate a coupon (works for both authenticated and guest users)
module.exports.validateCoupon = async (req, res) => {
    try {
        const { code, cartTotal, paymentMode, cartItems } = req.body;
        const userId = req.user?.id; // Optional - works for guests too

        if (!code) {
            return res.status(400).json({ 
                success: false,
                message: 'Coupon code is required' 
            });
        }

        if (!cartTotal || cartTotal <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Cart total is required' 
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

        // Check payment mode restriction
        if (coupon.paymentModeRestriction !== 'all' && paymentMode && coupon.paymentModeRestriction !== paymentMode) {
            const modeText = coupon.paymentModeRestriction === 'cod' ? 'Cash on Delivery' : 'Prepaid';
            return res.status(400).json({
                success: false,
                message: `This coupon is only valid for ${modeText} orders`
            });
        }

        // Check first order restriction
        if (coupon.firstOrderOnly && userId) {
            // Check if user has any previous orders
            const { Order } = require('../model/associations.js');
            const previousOrders = await Order.count({
                where: { user_id: userId }
            });
            
            if (previousOrders > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This coupon is only valid for first orders'
                });
            }
        }

        // Check total usage limit
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ 
                success: false,
                message: 'This coupon has reached its usage limit.' 
            });
        }

        // Check per-user usage limit (only for authenticated users)
        if (userId) {
            const { CouponUsage } = require('../model/associations.js');
            const userUsageCount = await CouponUsage.count({
                where: { couponId: coupon.id, userId: userId }
            });

            if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
                return res.status(400).json({ 
                    success: false,
                    message: `You have already used this coupon the maximum number of times.` 
                });
            }

            if (!coupon.perUserLimit && userUsageCount > 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'You have already used this coupon.' 
                });
            }
        }

        // Check minimum purchase requirement
        const applicableAmount = parseFloat(cartTotal);
        
        if (coupon.minPurchase && applicableAmount < coupon.minPurchase) {
            return res.status(400).json({
                success: false,
                message: `You must spend at least ₹${coupon.minPurchase} to use this coupon. Add ₹${(coupon.minPurchase - applicableAmount).toFixed(2)} more to your cart.`
            });
        }

        // Calculate discount based on coupon type
        let discountAmount = 0;
        
        if (coupon.type === 'percentage') {
            discountAmount = (applicableAmount * parseFloat(coupon.value)) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = parseFloat(coupon.maxDiscount);
            }
        } else if (coupon.type === 'fixed') {
            discountAmount = parseFloat(coupon.value);
        } else if (coupon.type === 'tiered') {
            // Find the applicable tier based on cart amount
            let tiers = coupon.tieredDiscounts;
            
            // Ensure tiers is a valid array
            if (!tiers) {
                tiers = [];
            } else if (typeof tiers === 'string') {
                try {
                    tiers = JSON.parse(tiers);
                } catch (e) {
                    tiers = [];
                }
            } else if (!Array.isArray(tiers)) {
                tiers = [];
            }
            
            let applicableTier = null;
            
            if (tiers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This tiered coupon is not properly configured'
                });
            }
            
            for (const tier of tiers.sort((a, b) => b.minAmount - a.minAmount)) {
                if (applicableAmount >= tier.minAmount) {
                    applicableTier = tier;
                    break;
                }
            }
            
            if (applicableTier) {
                discountAmount = parseFloat(applicableTier.discount);
            } else {
                return res.status(400).json({
                    success: false,
                    message: `This coupon requires a minimum purchase amount that you haven't met`
                });
            }
        } else if (coupon.type === 'quantity_based') {
            // Calculate total quantity in cart
            const totalQuantity = cartItems ? cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
            
            if (totalQuantity === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart items are required for quantity-based coupons'
                });
            }
            
            // Find the applicable quantity tier
            let quantityTiers = coupon.quantityBasedDiscounts;
            
            // Ensure quantityTiers is a valid array
            if (!quantityTiers) {
                quantityTiers = [];
            } else if (typeof quantityTiers === 'string') {
                try {
                    quantityTiers = JSON.parse(quantityTiers);
                } catch (e) {
                    quantityTiers = [];
                }
            } else if (!Array.isArray(quantityTiers)) {
                quantityTiers = [];
            }
            
            let applicableQuantityTier = null;
            
            if (quantityTiers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This quantity-based coupon is not properly configured'
                });
            }
            
            for (const tier of quantityTiers.sort((a, b) => b.minQuantity - a.minQuantity)) {
                if (totalQuantity >= tier.minQuantity) {
                    applicableQuantityTier = tier;
                    break;
                }
            }
            
            if (applicableQuantityTier) {
                discountAmount = parseFloat(applicableQuantityTier.discount);
            } else {
                const minQty = Math.min(...quantityTiers.map(t => t.minQuantity));
                return res.status(400).json({
                    success: false,
                    message: `You need at least ${minQty} items in your cart to use this coupon`
                });
            }
        }

        // Ensure discount doesn't exceed cart total
        if (discountAmount > applicableAmount) {
            discountAmount = applicableAmount;
        }

        const finalAmount = Math.max(0, applicableAmount - discountAmount);

        res.status(200).json({
            success: true,
            message: 'Coupon is valid and can be applied!',
            discountAmount: discountAmount.toFixed(2),
            finalAmount: finalAmount.toFixed(2),
            subtotal: applicableAmount.toFixed(2),
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                description: coupon.description,
                paymentModeRestriction: coupon.paymentModeRestriction,
                firstOrderOnly: coupon.firstOrderOnly
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
            attributes: [
                'id', 'code', 'description', 'type', 'value', 'minPurchase', 'maxDiscount', 'endDate',
                'paymentModeRestriction', 'firstOrderOnly', 'tieredDiscounts', 'quantityBasedDiscounts'
            ],
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