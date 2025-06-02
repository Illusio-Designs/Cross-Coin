import { Coupon, CouponUsage } from '../model/associations.js';
import { Op } from 'sequelize';

// Create a new coupon
export const createCoupon = async (req, res) => {
    try {
        const {
            code,
            type,
            value,
            minPurchase,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            status
        } = req.body;

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({
            where: { code: code.toUpperCase() }
        });

        if (existingCoupon) {
            return res.status(400).json({
                message: 'Coupon code already exists'
            });
        }

        // Validate discount value based on type
        if (type === 'percentage' && (value <= 0 || value > 100)) {
            return res.status(400).json({
                message: 'Percentage discount must be between 0 and 100'
            });
        }

        if (type === 'fixed' && value <= 0) {
            return res.status(400).json({
                message: 'Fixed discount value must be greater than 0'
            });
        }

        // Validate min purchase amount
        if (minPurchase && minPurchase < 0) {
            return res.status(400).json({
                message: 'Minimum purchase amount cannot be negative'
            });
        }

        // Validate max discount
        if (maxDiscount && maxDiscount < 0) {
            return res.status(400).json({
                message: 'Maximum discount cannot be negative'
            });
        }

        // Validate usage limit
        if (usageLimit && usageLimit < 1) {
            return res.status(400).json({
                message: 'Usage limit must be at least 1'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({
                message: 'End date must be after start date'
            });
        }

        // Create the coupon
        const newCoupon = await Coupon.create({
            code: code.toUpperCase(),
            type,
            value: Number(value),
            minPurchase: minPurchase ? Number(minPurchase) : null,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            startDate: start,
            endDate: end,
            usageLimit: usageLimit || null,
            status: status || 'active'
        });

        res.status(201).json({
            message: 'Coupon created successfully',
            coupon: newCoupon
        });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({
            message: 'Failed to create coupon',
            error: error.message
        });
    }
};

// Get all coupons
export const getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            include: [{
                model: CouponUsage,
                as: 'CouponUsages',
                attributes: ['userId', 'usedAt']
            }]
        });

        res.status(200).json({
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({
            message: 'Failed to fetch coupons',
            error: error.message
        });
    }
};

// Get a single coupon by ID
export const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findByPk(id, {
            include: [{
                model: CouponUsage,
                attributes: ['userId', 'usedAt']
            }]
        });
        
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.status(200).json(coupon);
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({
            message: 'Failed to fetch coupon',
            error: error.message
        });
    }
};

// Validate a coupon
export const validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount, userId } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
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
            return res.status(404).json({ message: 'Invalid or expired coupon code' });
        }

        // Check if user has already used this coupon
        const userUsage = await CouponUsage.findOne({
            where: {
                couponId: coupon.id,
                userId: userId
            }
        });

        if (userUsage) {
            return res.status(400).json({ message: 'You have already used this coupon' });
        }

        // Check if coupon is already used to its maximum
        const totalUsage = await CouponUsage.count({
            where: { couponId: coupon.id }
        });

        if (coupon.usageLimit && totalUsage >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon has reached maximum usage limit' });
        }

        // Check if order meets minimum amount
        if (orderAmount < coupon.minPurchase) {
            return res.status(400).json({ 
                message: `Order must be at least ${coupon.minPurchase} to use this coupon` 
            });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.type === 'percentage') {
            discountAmount = (orderAmount * coupon.value) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else {
            discountAmount = coupon.value;
            // Ensure discount doesn't exceed order amount
            if (discountAmount > orderAmount) {
                discountAmount = orderAmount;
            }
        }

        res.status(200).json({
            message: 'Coupon is valid',
            coupon,
            discountAmount,
            finalAmount: orderAmount - discountAmount
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({
            message: 'Failed to validate coupon',
            error: error.message
        });
    }
};

// Apply a coupon (increment used count)
export const applyCoupon = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
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
            return res.status(404).json({ message: 'Invalid or expired coupon code' });
        }

        // Check if user has already used this coupon
        const userUsage = await CouponUsage.findOne({
            where: {
                couponId: coupon.id,
                userId: userId
            }
        });

        if (userUsage) {
            return res.status(400).json({ message: 'You have already used this coupon' });
        }

        // Check if coupon is already used to its maximum
        const totalUsage = await CouponUsage.count({
            where: { couponId: coupon.id }
        });

        if (coupon.usageLimit && totalUsage >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon has reached maximum usage limit' });
        }

        // Record the usage
        await CouponUsage.create({
            couponId: coupon.id,
            userId: userId,
            usedAt: new Date()
        });

        res.status(200).json({
            message: 'Coupon applied successfully',
            coupon
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            message: 'Failed to apply coupon',
            error: error.message
        });
    }
};

// Get coupon usage history for a user
export const getUserCouponHistory = async (req, res) => {
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
            message: 'Coupon usage history retrieved successfully',
            history: usageHistory
        });
    } catch (error) {
        console.error('Error fetching coupon history:', error);
        res.status(500).json({
            message: 'Failed to fetch coupon history',
            error: error.message
        });
    }
};

// Update a coupon
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            type,
            value,
            minPurchase,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            status
        } = req.body;

        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
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
                    message: 'Coupon code already exists'
                });
            }
        }

        // Validate discount value based on type
        if (type === 'percentage' && (value <= 0 || value > 100)) {
            return res.status(400).json({
                message: 'Percentage discount must be between 0 and 100'
            });
        }

        if (type === 'fixed' && value <= 0) {
            return res.status(400).json({
                message: 'Fixed discount value must be greater than 0'
            });
        }

        // Validate min purchase amount
        if (minPurchase && minPurchase < 0) {
            return res.status(400).json({
                message: 'Minimum purchase amount cannot be negative'
            });
        }

        // Validate max discount
        if (maxDiscount && maxDiscount < 0) {
            return res.status(400).json({
                message: 'Maximum discount cannot be negative'
            });
        }

        // Validate usage limit
        if (usageLimit && usageLimit < 1) {
            return res.status(400).json({
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
                message: 'End date must be after start date'
            });
        }

        // Update the coupon
        await coupon.update({
            code: code ? code.toUpperCase() : coupon.code,
            type: type || coupon.type,
            value: value || coupon.value,
            minPurchase: minPurchase !== undefined ? minPurchase : coupon.minPurchase,
            maxDiscount: maxDiscount !== undefined ? maxDiscount : coupon.maxDiscount,
            startDate: start,
            endDate: end,
            usageLimit: usageLimit || coupon.usageLimit,
            status: status || coupon.status
        });

        res.status(200).json({
            message: 'Coupon updated successfully',
            coupon
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({
            message: 'Failed to update coupon',
            error: error.message
        });
    }
};

// Delete a coupon
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        await coupon.destroy();

        res.status(200).json({
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({
            message: 'Failed to delete coupon',
            error: error.message
        });
    }
};

// Get Coupon by ID
export const getCoupon = async (req, res) => {
    try {
        const { id } = req.params; // Assuming the coupon ID is passed as a URL parameter

        const coupon = await Coupon.findByPk(id);
        
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json(coupon);
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({ message: 'Failed to fetch coupon', error: error.message });
    }
};

// Get all active public coupons
export const getPublicCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            where: {
                status: 'active',
                startDate: { [Op.lte]: new Date() },
                endDate: { [Op.gte]: new Date() }
            },
            attributes: ['id', 'code', 'type', 'value', 'minPurchase', 'maxDiscount', 'endDate']
        });

        res.status(200).json({
            count: coupons.length,
            coupons
        });
    } catch (error) {
        console.error('Error fetching public coupons:', error);
        res.status(500).json({
            message: 'Failed to fetch coupons',
            error: error.message
        });
    }
}; 