const { Coupon } = require('../model/couponModel.js');
const { CouponUsage } = require('../model/couponUsageModel.js');
const { ShippingFee } = require('../model/shippingFeeModel.js');
const { Op } = require('sequelize');
const addressQualityService = require('../services/addressQualityService.js');
const fshipService = require('../services/fshipService.js');
const razorpayService = require('../services/razorpayService');
const { toSmallestUnit } = require('../utils/amountConverter');

/**
 * RAZORPAY MAGIC CHECKOUT — HOW IT WORKS
 * ========================================
 *
 * 1. Frontend creates a Razorpay order via POST /api/payments/magic-checkout/create-order
 *    - MUST include line_items + line_items_total (in paise) to trigger Magic Checkout UI
 *    - Without line_items_total, Razorpay falls back to Standard Checkout
 *
 * 2. Frontend opens the modal with:
 *    - one_click_checkout: true  (NOT magic: true)
 *    - SDK: magic-checkout.js    (NOT checkout.js)
 *
 * 3. Razorpay's servers call YOUR APIs directly (not the frontend):
 *    - GET Promotions: POST /api/payments/magic-checkout/promotions
 *    - Apply Promotion: POST /api/payments/magic-checkout/apply-promotion
 *    - Shipping Info:   POST /api/payments/magic-checkout/shipping-info
 *    These must be publicly accessible (no auth) and configured in Razorpay Dashboard:
 *    Magic Checkout > Setup & Settings > Checkout Settings / Shipping Setup
 *
 * 4. On payment success, frontend verifies signature via POST /api/payments/magic-checkout/verify-payment
 */

// ─────────────────────────────────────────────────────────────────────────────
// GET PROMOTIONS
// Called by Razorpay's servers when checkout modal opens.
// Razorpay sends POST with: order_id (receipt), razorpay_order_id, contact, email
// Response must match Razorpay's expected schema: { promotions: [{ code, summary, description }] }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getPromotions = async (req, res) => {
    try {
        const { contact, email } = req.body;
        const currentDate = new Date();

        const activeCoupons = await Coupon.findAll({
            where: {
                status: 'active',
                startDate: { [Op.lte]: currentDate },
                endDate: { [Op.gte]: currentDate },
            }
        });

        const promotions = [];

        for (const coupon of activeCoupons) {
            // Skip if global usage limit exceeded
            if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) continue;

            // Razorpay schema: code, summary (short), description (long)
            const valueLabel = coupon.type === 'percentage'
                ? `${coupon.value}% off`
                : `₹${coupon.value} off`;

            const minLabel = coupon.minPurchase
                ? ` on orders above ₹${coupon.minPurchase}`
                : '';

            promotions.push({
                code: coupon.code,
                summary: `${valueLabel}${minLabel}`,
                description: coupon.description || `Use code ${coupon.code} to get ${valueLabel}${minLabel}`,
            });
        }

        res.json({ promotions });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ message: 'Failed to fetch promotions', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLY PROMOTION
// Called by Razorpay's servers when customer applies a coupon code.
// Razorpay sends POST with: order_id, razorpay_order_id, contact, email, code
// Response must match Razorpay's schema:
//   { promotions: [{ reference_id, code, type, value, value_type, description }] }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.applyPromotion = async (req, res) => {
    try {
        const { order_id, code, contact, email } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Promotion code is required' });
        }

        const currentDate = new Date();

        const coupon = await Coupon.findOne({ where: { code } });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid promotion code' });
        }

        if (coupon.status !== 'active') {
            return res.status(400).json({ message: 'Promotion is not active' });
        }

        if (currentDate < coupon.startDate || currentDate > coupon.endDate) {
            return res.status(400).json({ message: 'Promotion has expired or not yet started' });
        }

        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Promotion usage limit has been reached' });
        }

        // Calculate discount value in paise
        let valueInPaise = 0;
        let valueType = 'fixed_amount';

        if (coupon.type === 'percentage') {
            // For percentage, Razorpay applies the value as-is in paise regardless of value_type
            // So we send the percentage number (e.g. 10 for 10%) — Razorpay handles the math
            valueInPaise = parseFloat(coupon.value) * 100; // e.g. 10% → 1000 paise representation
            valueType = 'percentage';
        } else {
            valueInPaise = toSmallestUnit(parseFloat(coupon.value), 'INR');
            valueType = 'fixed_amount';
        }

        // Razorpay expected response format for apply-promotion
        res.json({
            promotions: [{
                reference_id: `coupon_${coupon.id}`,
                code: coupon.code,
                type: 'coupon',
                value: valueInPaise,
                value_type: valueType,
                description: coupon.description || `${coupon.type === 'percentage' ? coupon.value + '%' : '₹' + coupon.value} off`,
            }]
        });
    } catch (error) {
        console.error('Error applying promotion:', error);
        res.status(500).json({ message: 'Failed to apply promotion', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SHIPPING INFO
// Called by Razorpay's servers to check serviceability for customer addresses.
// Razorpay sends POST with: order_id, razorpay_order_id, email, contact, addresses[]
// Each address has: id, zipcode, state_code, country
// Response must match Razorpay's schema:
//   { addresses: [{ id, zipcode, country, shipping_methods: [...], cod, cod_fee }] }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getShippingInfo = async (req, res) => {
    try {
        const { order_id, addresses } = req.body;

        if (!addresses || !Array.isArray(addresses)) {
            return res.status(400).json({ message: 'addresses array is required' });
        }

        // Get shipping fees from DB
        const shippingFees = await ShippingFee.findAll();
        const prepaidFee = parseFloat(shippingFees.find(f => f.orderType === 'prepaid')?.fee || 0);
        const codFeeAmount = parseFloat(shippingFees.find(f => f.orderType === 'cod')?.fee || 0);

        const results = [];

        for (const address of addresses) {
            const zipcode = address.zipcode || address.pincode || '';
            let serviceable = false;
            let codAvailable = false;
            let shippingFeeInPaise = toSmallestUnit(prepaidFee, 'INR');
            let codFeeInPaise = 0;
            let estimatedDays = 5;
            const shippingMethods = [];

            try {
                const sourcePincode = process.env.DEFAULT_WAREHOUSE_PINCODE || '400001';
                const serviceabilityResult = await fshipService.checkServiceability(sourcePincode, zipcode);

                if (serviceabilityResult && Array.isArray(serviceabilityResult) && serviceabilityResult.length > 0) {
                    serviceable = true;
                    estimatedDays = serviceabilityResult[0].estimated_delivery_days || 5;

                    const qualityResult = await addressQualityService.calculateAddressQuality(address).catch(() => ({ score: 100 }));
                    const codSupported = serviceabilityResult.some(c => c.cod === 1 || c.cod === true || c.cod === 'yes');

                    if (codSupported && qualityResult.score >= 70) {
                        codAvailable = true;
                        codFeeInPaise = toSmallestUnit(codFeeAmount, 'INR');
                    }
                }
            } catch {
                // FShip unavailable — default to serviceable with prepaid only
                serviceable = true;
            }

            if (serviceable) {
                shippingMethods.push({
                    id: 'standard',
                    name: 'Standard Delivery',
                    description: `Delivered in ${estimatedDays}–7 business days`,
                    // Razorpay expects shipping fee in paise
                    price: shippingFeeInPaise,
                    cod: codAvailable,
                });
            }

            // Razorpay expected response format per address
            results.push({
                id: address.id,
                zipcode,
                country: address.country || 'in',
                serviceable,
                cod: codAvailable,
                cod_fee: codFeeInPaise,
                shipping_methods: shippingMethods,
            });
        }

        res.json({ addresses: results });
    } catch (error) {
        console.error('Error fetching shipping info:', error);
        res.status(500).json({ message: 'Failed to fetch shipping info', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ORDER
// Called by the frontend before opening the Magic Checkout modal.
// amount in rupees, line_items prices in paise, line_items_total in paise.
// line_items_total is MANDATORY — without it Razorpay shows Standard Checkout.
// ─────────────────────────────────────────────────────────────────────────────
module.exports.createOrder = async (req, res) => {
    try {
        const {
            amount,
            currency = 'INR',
            customer_id,
            line_items = [],
            line_items_total = null,
            notes = {}
        } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // line_items_total must be in paise and is MANDATORY for Magic Checkout UI
        const computedLineItemsTotal = line_items_total ||
            line_items.reduce((sum, item) => sum + ((item.offer_price || item.price || 0) * (item.quantity || 1)), 0);

        const order = await razorpayService.createOrder({
            amount,                                          // rupees — service converts to paise
            currency,
            receipt: `order_${Date.now()}_${customer_id || 'guest'}`,
            line_items: line_items.length > 0 ? line_items : null,
            line_items_total: computedLineItemsTotal,        // paise
            notes: {
                customer_id: customer_id || 'guest',
                checkout_type: 'magic_checkout',
                ...notes
            },
            partial_payment: false,
            brandId: 1
        });

        console.log('✅ Magic Checkout order created:', order.id, '₹', amount);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,       // paise — returned to frontend for Razorpay options
            currency: order.currency,
            receipt: order.receipt,
            status: order.status
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY PAYMENT
// Called by the frontend after payment success to verify the signature.
// ─────────────────────────────────────────────────────────────────────────────
module.exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'order_id, payment_id, and signature are required' });
        }

        const isValid = await razorpayService.verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            1
        );

        if (isValid) {
            res.json({ success: true, message: 'Payment verified', order_id: razorpay_order_id, payment_id: razorpay_payment_id });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment', error: error.message });
    }
};
