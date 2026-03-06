const { Coupon } = require('../model/couponModel.js');
const { CouponUsage } = require('../model/couponUsageModel.js');
const { ShippingFee } = require('../model/shippingFeeModel.js');
const { Op } = require('sequelize');
const addressQualityService = require('../services/addressQualityService.js');
const fshipService = require('../services/fshipService.js');
const Razorpay = require('razorpay');
const settingsHelper = require('../services/settingsHelper');

// Initialize Razorpay instance - will be initialized per request with brand settings
let razorpayInstance = null;

async function getRazorpayInstance(brandId = 1) {
    const key_id = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_ID');
    const key_secret = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_SECRET');
    
    return new Razorpay({
        key_id,
        key_secret
    });
}

/**
 * RAZORPAY DASHBOARD CONFIGURATION REQUIRED
 * ==========================================
 * 
 * To enable Magic Checkout, configure the following in your Razorpay Dashboard:
 * 
 * 1. Navigate to: Settings > Magic Checkout > API Configuration
 * 
 * 2. Set up the following webhook/API endpoint URLs:
 *    - Get Promotions API: https://api.crosscoin.in/api/payments/magic-checkout/promotions
 *    - Apply Promotion API: https://api.crosscoin.in/api/payments/magic-checkout/apply-promotion
 *    - Shipping Info API: https://api.crosscoin.in/api/payments/magic-checkout/shipping-info
 * 
 * 3. Configure webhook URLs for payment callbacks:
 *    - Payment Success Webhook: https://api.crosscoin.in/api/payments/magic-checkout/verify-payment
 *    - Order Creation Webhook: https://api.crosscoin.in/api/payments/magic-checkout/create-order
 * 
 * 4. Enable Magic Checkout features:
 *    - ✓ Saved Addresses
 *    - ✓ Saved Payment Methods
 *    - ✓ Address Quality Validation
 *    - ✓ COD Serviceability
 * 
 * 5. Set authentication method:
 *    - Use API Key authentication with your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * 
 * 6. Test in Razorpay Test Mode first:
 *    - Use test API keys (rzp_test_...)
 *    - Verify all endpoints respond correctly
 *    - Test promotion application and shipping info
 *    - Switch to live keys (rzp_live_...) only after successful testing
 * 
 * Note: Ensure all environment variables are properly configured in Backend/.env
 */

/**
 * Get Promotions Handler
 * Fetches applicable promotions for Magic Checkout
 * 
 * Query Parameters:
 * - order_id: Razorpay order ID
 * - customer_id: Customer identifier (user ID or guest email)
 * - cart_total: Total cart amount in paise
 * 
 * Returns: List of applicable promotions with discount details
 */
module.exports.getPromotions = async (req, res) => {
    try {
        const { order_id, customer_id, cart_total } = req.query;

        // Validate required parameters
        if (!order_id || !cart_total) {
            return res.status(400).json({ 
                message: 'order_id and cart_total are required' 
            });
        }

        const cartTotalAmount = parseFloat(cart_total);
        const currentDate = new Date();

        // 1. Query active coupons from database
        // 2. Filter by date range (start_date, end_date)
        const activeCoupons = await Coupon.findAll({
            where: {
                status: 'active',
                startDate: {
                    [Op.lte]: currentDate
                },
                endDate: {
                    [Op.gte]: currentDate
                }
            }
        });

        const applicablePromotions = [];

        for (const coupon of activeCoupons) {
            let isApplicable = true;
            let reason = null;

            // 3. Check total usage limits
            if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
                isApplicable = false;
                reason = 'Usage limit reached';
                continue;
            }

            // 4. Check per-user usage limits
            if (customer_id && coupon.perUserLimit !== null) {
                // Parse customer_id as integer for database query
                const parsedCustomerId = parseInt(customer_id);
                
                // Only check if we have a valid numeric user ID
                if (!isNaN(parsedCustomerId)) {
                    const userUsageCount = await CouponUsage.count({
                        where: {
                            couponId: coupon.id,
                            userId: parsedCustomerId
                        }
                    });

                    if (userUsageCount >= coupon.perUserLimit) {
                        isApplicable = false;
                        reason = 'Per-user limit reached';
                        continue;
                    }
                }
            }

            // 5. Validate minimum purchase requirements
            if (coupon.minPurchase !== null) {
                const minPurchaseInPaise = parseFloat(coupon.minPurchase) * 100;
                if (cartTotalAmount < minPurchaseInPaise) {
                    isApplicable = false;
                    reason = `Minimum purchase of ₹${coupon.minPurchase} required`;
                    continue;
                }
            }

            // 6. Calculate discount amounts for percentage coupons
            let discountValue = parseFloat(coupon.value);
            let calculatedDiscount = null;

            if (coupon.type === 'percentage') {
                // Calculate percentage discount
                calculatedDiscount = Math.round((cartTotalAmount * discountValue) / 100);
                
                // Apply maximum discount cap
                if (coupon.maxDiscount !== null) {
                    const maxDiscountInPaise = parseFloat(coupon.maxDiscount) * 100;
                    calculatedDiscount = Math.min(calculatedDiscount, maxDiscountInPaise);
                }
            } else if (coupon.type === 'fixed') {
                // Fixed discount in rupees, convert to paise
                calculatedDiscount = Math.round(parseFloat(coupon.value) * 100);
            }

            // 7. Return formatted promotions array
            applicablePromotions.push({
                code: coupon.code,
                description: coupon.description || `${coupon.type === 'percentage' ? coupon.value + '%' : '₹' + coupon.value} off`,
                type: coupon.type,
                value: discountValue,
                min_purchase: coupon.minPurchase ? parseFloat(coupon.minPurchase) * 100 : null,
                max_discount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) * 100 : null,
                applicable: isApplicable,
                estimated_discount: calculatedDiscount,
                reason: reason
            });
        }

        res.json({
            promotions: applicablePromotions
        });

    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ 
            message: 'Failed to fetch promotions', 
            error: error.message 
        });
    }
};

/**
 * Apply Promotion Handler
 * Validates and applies a promotion code to the order
 * 
 * Request Body:
 * - order_id: Razorpay order ID
 * - promotion_code: Promotion code to apply
 * - customer_id: Customer identifier
 * - cart_total: Total cart amount in paise
 * - cart_items: Array of cart items
 * 
 * Returns: Discount amount and final order total
 */
module.exports.applyPromotion = async (req, res) => {
    try {
        const { 
            order_id, 
            promotion_code, 
            customer_id, 
            cart_total, 
            cart_items 
        } = req.body;

        // Validate required parameters
        if (!order_id || !promotion_code || !cart_total) {
            return res.status(400).json({ 
                success: false,
                message: 'order_id, promotion_code, and cart_total are required' 
            });
        }

        const cartTotalAmount = parseFloat(cart_total);
        const currentDate = new Date();

        // 1. Validate promotion code exists
        const coupon = await Coupon.findOne({
            where: {
                code: promotion_code
            }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid promotion code'
            });
        }

        // 2. Check promotion is active and not expired
        if (coupon.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Promotion is not active'
            });
        }

        if (currentDate < coupon.startDate || currentDate > coupon.endDate) {
            return res.status(400).json({
                success: false,
                message: 'Promotion has expired or not yet started'
            });
        }

        // 3. Verify usage limits not exceeded
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Promotion usage limit has been reached'
            });
        }

        // Check per-user usage limits
        if (customer_id && coupon.perUserLimit !== null) {
            const parsedCustomerId = parseInt(customer_id);
            
            if (!isNaN(parsedCustomerId)) {
                const userUsageCount = await CouponUsage.count({
                    where: {
                        couponId: coupon.id,
                        userId: parsedCustomerId
                    }
                });

                if (userUsageCount >= coupon.perUserLimit) {
                    return res.status(400).json({
                        success: false,
                        message: 'You have already used this promotion the maximum number of times'
                    });
                }
            }
        }

        // 4. Validate minimum purchase requirement
        if (coupon.minPurchase !== null) {
            const minPurchaseInPaise = parseFloat(coupon.minPurchase) * 100;
            if (cartTotalAmount < minPurchaseInPaise) {
                return res.status(400).json({
                    success: false,
                    message: `Minimum purchase of ₹${coupon.minPurchase} required`
                });
            }
        }

        // 5. Calculate discount amount based on type
        let discountAmount = 0;

        if (coupon.type === 'percentage') {
            // Calculate percentage discount
            const discountValue = parseFloat(coupon.value);
            discountAmount = Math.round((cartTotalAmount * discountValue) / 100);
            
            // 6. Apply maximum discount cap for percentage
            if (coupon.maxDiscount !== null) {
                const maxDiscountInPaise = parseFloat(coupon.maxDiscount) * 100;
                discountAmount = Math.min(discountAmount, maxDiscountInPaise);
            }
        } else if (coupon.type === 'fixed') {
            // Fixed discount in rupees, convert to paise
            discountAmount = Math.round(parseFloat(coupon.value) * 100);
            
            // Ensure discount doesn't exceed cart total
            discountAmount = Math.min(discountAmount, cartTotalAmount);
        }

        // 7. Return discount amount and final total
        const finalAmount = Math.max(0, cartTotalAmount - discountAmount);

        res.json({
            success: true,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            promotion: {
                code: coupon.code,
                description: coupon.description || `${coupon.type === 'percentage' ? coupon.value + '%' : '₹' + coupon.value} off`
            }
        });

    } catch (error) {
        console.error('Error applying promotion:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to apply promotion', 
            error: error.message 
        });
    }
};

/**
 * Get Shipping Info Handler
 * Returns shipping serviceability and fees for customer addresses
 * 
 * Request Body:
 * - order_id: Razorpay order ID
 * - addresses: Array of customer addresses
 * - cart_total: Total cart amount in paise
 * - payment_method: Payment method (prepaid/cod)
 * 
 * Returns: Shipping info for each address including serviceability and fees
 */
module.exports.getShippingInfo = async (req, res) => {
    try {
        const { 
            order_id, 
            addresses, 
            cart_total, 
            payment_method 
        } = req.body;

        // Validate required parameters
        if (!order_id || !addresses || !Array.isArray(addresses)) {
            return res.status(400).json({ 
                message: 'order_id and addresses array are required' 
            });
        }

        const cartTotalAmount = parseFloat(cart_total || 0);
        const shippingInfoResults = [];

        // Get shipping fees from database
        const shippingFees = await ShippingFee.findAll();
        const prepaidFee = shippingFees.find(f => f.orderType === 'prepaid')?.fee || 0;
        const codFee = shippingFees.find(f => f.orderType === 'cod')?.fee || 0;

        // Process each address
        for (const address of addresses) {
            const addressInfo = {
                address_id: address.id,
                serviceable: false,
                cod_available: false,
                shipping_fee: 0,
                cod_fee: 0,
                estimated_delivery_days: 0,
                address_quality_score: 0,
                reason: null
            };

            // 1. Validate address completeness
            const completeness = addressQualityService.validateAddressCompleteness(address);
            
            if (!completeness.isComplete) {
                addressInfo.reason = `Incomplete address: missing ${completeness.missingFields.join(', ')}`;
                shippingInfoResults.push(addressInfo);
                continue;
            }

            // 2. Calculate address quality score
            const qualityResult = await addressQualityService.calculateAddressQuality(address);
            addressInfo.address_quality_score = qualityResult.score;

            // 3. Check FShip serviceability by pincode
            try {
                // Assume source pincode from environment or default warehouse
                const sourcePincode = process.env.DEFAULT_WAREHOUSE_PINCODE || '400001';
                const serviceabilityResult = await fshipService.checkServiceability(
                    sourcePincode,
                    address.pincode
                );

                // Check if serviceable (FShip returns array of courier data)
                if (serviceabilityResult && Array.isArray(serviceabilityResult) && serviceabilityResult.length > 0) {
                    addressInfo.serviceable = true;
                    
                    // Get estimated delivery days from first courier
                    const firstCourier = serviceabilityResult[0];
                    addressInfo.estimated_delivery_days = firstCourier.estimated_delivery_days || 3;

                    // 4. Determine COD availability based on quality score
                    // COD threshold: quality score must be >= 70
                    const COD_QUALITY_THRESHOLD = 70;
                    
                    // Check if courier supports COD and quality score is sufficient
                    const codSupported = serviceabilityResult.some(courier => 
                        courier.cod === 1 || courier.cod === true || courier.cod === 'yes'
                    );

                    if (codSupported && qualityResult.score >= COD_QUALITY_THRESHOLD) {
                        addressInfo.cod_available = true;
                    } else if (!codSupported) {
                        addressInfo.reason = 'COD not available for this pincode';
                    } else {
                        addressInfo.reason = 'Address quality too low for COD';
                    }

                    // 5. Calculate shipping fees from shipping_fees table
                    // 6. Calculate COD fees if applicable
                    if (payment_method === 'cod' && addressInfo.cod_available) {
                        addressInfo.shipping_fee = parseFloat(codFee) * 100; // Convert to paise
                        addressInfo.cod_fee = parseFloat(codFee) * 100; // Convert to paise
                    } else {
                        addressInfo.shipping_fee = parseFloat(prepaidFee) * 100; // Convert to paise
                        addressInfo.cod_fee = 0;
                    }
                } else {
                    addressInfo.reason = 'Pincode not serviceable';
                }
            } catch (fshipError) {
                console.error('FShip serviceability check failed:', fshipError.message);
                // If FShip fails, mark as not serviceable
                addressInfo.reason = 'Unable to verify serviceability';
            }

            // 7. Return shipping info for each address
            shippingInfoResults.push(addressInfo);
        }

        res.json({
            shipping_info: shippingInfoResults
        });

    } catch (error) {
        console.error('Error fetching shipping info:', error);
        res.status(500).json({ 
            message: 'Failed to fetch shipping info', 
            error: error.message 
        });
    }
};


/**
 * Create Razorpay Order for Magic Checkout
 * Creates an order before opening Magic Checkout modal
 * 
 * Request Body:
 * - amount: Order amount in rupees
 * - currency: Currency code (default: INR)
 * - customer_id: Customer identifier
 * - cart_items: Array of cart items
 * - shipping_address: Shipping address object
 * - notes: Additional order notes
 * 
 * Returns: Razorpay order object with order_id
 */
module.exports.createOrder = async (req, res) => {
    try {
        const { 
            amount, 
            currency = 'INR', 
            customer_id, 
            cart_items = [],
            shipping_address = {},
            notes = {}
        } = req.body;

        // Validate required parameters
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Valid amount is required' 
            });
        }

        // Convert amount to paise (Razorpay expects amount in smallest currency unit)
        const amountInPaise = Math.round(parseFloat(amount) * 100);

        // Format line_items for Magic Checkout (REQUIRED for Magic Checkout UI)
        const formattedLineItems = cart_items.map(item => ({
            type: 'e-commerce',
            sku: item.product_id ? `SKU_${item.product_id}` : 'SKU_UNKNOWN',
            variant_id: item.variation_id ? `VAR_${item.variation_id}` : null,
            price: Math.round(parseFloat(item.price || 0) * 100), // in paise
            offer_price: Math.round(parseFloat(item.price || 0) * 100), // in paise
            tax_amount: 0, // Add tax if applicable
            quantity: item.quantity || 1,
            name: item.name || 'Product',
            description: item.description || '',
            // image_url: item.image_url || '' // Optional: add if available
        }));

        // Calculate line_items_total (sum of all items)
        const lineItemsTotal = formattedLineItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Prepare order options with Magic Checkout parameters
        const orderOptions = {
            amount: amountInPaise,
            currency: currency,
            receipt: `order_${Date.now()}_${customer_id || 'guest'}`,
            // ✅ CRITICAL: line_items and line_items_total are REQUIRED for Magic Checkout
            line_items: formattedLineItems,
            line_items_total: lineItemsTotal,
            notes: {
                customer_id: customer_id || 'guest',
                cart_items: JSON.stringify(cart_items),
                shipping_address: JSON.stringify(shipping_address),
                checkout_type: 'magic_checkout',
                ...notes
            },
            // Disable partial payment for cleaner Magic Checkout experience
            partial_payment: false,
        };

        console.log('Creating Magic Checkout order with line_items:', {
            amount: amountInPaise,
            line_items_count: formattedLineItems.length,
            line_items_total: lineItemsTotal,
            has_line_items: formattedLineItems.length > 0
        });

        // Create order using Razorpay API
        const razorpay = await getRazorpayInstance(1);
        const order = await razorpay.orders.create(orderOptions);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status
        });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create order', 
            error: error.message 
        });
    }
};

/**
 * Verify Payment Signature
 * Verifies the payment signature from Razorpay
 * 
 * Request Body:
 * - razorpay_order_id: Order ID from Razorpay
 * - razorpay_payment_id: Payment ID from Razorpay
 * - razorpay_signature: Signature from Razorpay
 * 
 * Returns: Verification result
 */
module.exports.verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = req.body;

        // Validate required parameters
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false,
                message: 'order_id, payment_id, and signature are required' 
            });
        }

        // Create signature verification string
        const crypto = require('crypto');
        const key_secret = await settingsHelper.getSetting(1, 'RAZORPAY_KEY_SECRET');
        const generatedSignature = crypto
            .createHmac('sha256', key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        // Compare signatures
        if (generatedSignature === razorpay_signature) {
            res.json({
                success: true,
                message: 'Payment verified successfully',
                order_id: razorpay_order_id,
                payment_id: razorpay_payment_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to verify payment', 
            error: error.message 
        });
    }
};
