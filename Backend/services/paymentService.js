const crypto = require('crypto');
const settingsHelper = require('./settingsHelper');
const { Payment } = require('../model/paymentModel.js');
const { Order } = require('../model/orderModel.js');
const { toSmallestUnit, fromSmallestUnit } = require('../utils/amountConverter');
const { logger } = require('../config/logging');

const PaymentService = {
    confirmPayment: async (paymentIntentId) => {
        // Logic to confirm payment with the payment gateway
        // This is a placeholder; implement your actual payment confirmation logic here
        return {
            id: paymentIntentId,
            status: 'confirmed'
        };
    },

    /**
     * Validate brand consistency between order and payment
     * @param {number} orderId - Order ID
     * @param {number} brandId - Brand ID from request context
     * @returns {Promise<boolean>} - True if brand is consistent
     */
    validateBrandConsistency: async (orderId, brandId) => {
        try {
            const order = await Order.findByPk(orderId);
            if (!order) {
                throw new Error(`Order ${orderId} not found`);
            }

            if (order.brand_id !== brandId) {
                logger.warn(
                    `Brand mismatch: Order ${orderId} belongs to brand ${order.brand_id}, ` +
                    `but request context has brand ${brandId}`
                );
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Error validating brand consistency:', error);
            throw error;
        }
    },

    /**
     * Verify Magic Checkout payment signature
     * @param {string} orderId - Razorpay order ID
     * @param {string} paymentId - Razorpay payment ID
     * @param {string} signature - Signature received from Razorpay
     * @returns {boolean} - True if signature is valid, false otherwise
     */
    verifyMagicCheckoutSignature: async (orderId, paymentId, signature) => {
        try {
            // Generate signature using HMAC SHA256
            const key_secret = await settingsHelper.getSetting(1, 'RAZORPAY_KEY_SECRET');
            const generatedSignature = crypto
                .createHmac('sha256', key_secret)
                .update(orderId + '|' + paymentId)
                .digest('hex');

            // Compare with received signature
            return generatedSignature === signature;
        } catch (error) {
            logger.error('Error verifying Magic Checkout signature:', error);
            return false;
        }
    },

    /**
     * Create Magic Checkout payment record
     * @param {Object} paymentData - Payment data object
     * @param {number} paymentData.order_id - Order ID
     * @param {number} paymentData.user_id - User ID (optional for guest orders)
     * @param {number} paymentData.guest_user_id - Guest user ID (optional for registered users)
     * @param {string} paymentData.payment_type - Payment type
     * @param {number} paymentData.amount_paid - Amount paid (in rupees/dollars, will be converted to smallest unit)
     * @param {string} paymentData.status - Payment status
     * @param {string} paymentData.magic_checkout_order_id - Magic Checkout order ID
     * @param {string} paymentData.magic_checkout_payment_id - Magic Checkout payment ID
     * @param {string} paymentData.magic_checkout_signature - Magic Checkout signature
     * @param {string} paymentData.payment_gateway - Payment gateway name
     * @param {string} paymentData.currency - Currency code (default: INR)
     * @param {number} paymentData.brand_id - Brand ID (required for multi-brand support)
     * @param {Object} transaction - Sequelize transaction (optional)
     * @returns {Promise<Object>} - Created payment record
     */
    createMagicCheckoutPayment: async (paymentData, transaction = null) => {
        try {
            const {
                order_id,
                user_id,
                guest_user_id,
                payment_type,
                amount_paid,
                status,
                magic_checkout_order_id,
                magic_checkout_payment_id,
                magic_checkout_signature,
                payment_gateway = 'Razorpay Magic Checkout',
                currency = 'INR',
                brand_id = 1
            } = paymentData;

            // Validate required fields
            if (!order_id || !payment_type || !amount_paid || !magic_checkout_order_id || !magic_checkout_payment_id) {
                throw new Error('Missing required payment fields');
            }

            // Convert amount to smallest unit (paise/cents) for consistent storage
            const amountInSmallestUnit = toSmallestUnit(amount_paid, currency);

            // Create payment record with Magic Checkout fields and brand context
            const payment = await Payment.create({
                order_id,
                user_id: user_id || null,
                guest_user_id: guest_user_id || null,
                payment_type,
                transaction_id: magic_checkout_payment_id,
                amount_paid: amountInSmallestUnit,
                status: status || 'successful',
                payment_gateway,
                magic_checkout_order_id,
                magic_checkout_payment_id,
                magic_checkout_signature,
                brand_id // ✅ Store brand context in payment record
            }, transaction ? { transaction } : {});

            return payment;
        } catch (error) {
            logger.error('Error creating Magic Checkout payment:', error);
            throw error;
        }
    }
};

module.exports = { PaymentService };
