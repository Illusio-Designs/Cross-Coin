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

};

module.exports = { PaymentService };
