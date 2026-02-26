const crypto = require('crypto');
const { Payment } = require('../model/paymentModel.js');

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
     * Verify Magic Checkout payment signature
     * @param {string} orderId - Razorpay order ID
     * @param {string} paymentId - Razorpay payment ID
     * @param {string} signature - Signature received from Razorpay
     * @returns {boolean} - True if signature is valid, false otherwise
     */
    verifyMagicCheckoutSignature: (orderId, paymentId, signature) => {
        try {
            // Generate signature using HMAC SHA256
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(orderId + '|' + paymentId)
                .digest('hex');

            // Compare with received signature
            return generatedSignature === signature;
        } catch (error) {
            console.error('Error verifying Magic Checkout signature:', error);
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
     * @param {number} paymentData.amount_paid - Amount paid
     * @param {string} paymentData.status - Payment status
     * @param {string} paymentData.magic_checkout_order_id - Magic Checkout order ID
     * @param {string} paymentData.magic_checkout_payment_id - Magic Checkout payment ID
     * @param {string} paymentData.magic_checkout_signature - Magic Checkout signature
     * @param {string} paymentData.payment_gateway - Payment gateway name
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
                payment_gateway = 'Razorpay Magic Checkout'
            } = paymentData;

            // Validate required fields
            if (!order_id || !payment_type || !amount_paid || !magic_checkout_order_id || !magic_checkout_payment_id) {
                throw new Error('Missing required payment fields');
            }

            // Create payment record with Magic Checkout fields
            const payment = await Payment.create({
                order_id,
                user_id: user_id || null,
                guest_user_id: guest_user_id || null,
                payment_type,
                transaction_id: magic_checkout_payment_id,
                amount_paid,
                status: status || 'successful',
                payment_gateway,
                magic_checkout_order_id,
                magic_checkout_payment_id,
                magic_checkout_signature
            }, transaction ? { transaction } : {});

            return payment;
        } catch (error) {
            console.error('Error creating Magic Checkout payment:', error);
            throw error;
        }
    }
};

module.exports = { PaymentService };
