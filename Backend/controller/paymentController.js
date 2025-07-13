const { Payment } = require('../model/paymentModel.js');
const { Order } = require('../model/orderModel.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { PaymentService } = require('../services/paymentService.js');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Process a payment
module.exports.processPayment = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { order_id, payment_type, payment_details } = req.body;
        const userId = req.user.id;

        if (!order_id || !payment_type) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Order ID and payment type are required' });
        }

        // Validate order exists and belongs to user
        const order = await Order.findOne({
            where: { 
                id: order_id,
                user_id: userId
            },
            transaction
        });

        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if payment already exists for this order
        const existingPayment = await Payment.findOne({
            where: { order_id },
            transaction
        });

        if (existingPayment && existingPayment.status === 'successful') {
            await transaction.rollback();
            return res.status(400).json({ message: 'Payment already processed for this order' });
        }

        // For COD orders, simply mark as pending
        if (payment_type === 'cod') {
            if (order.payment_type !== 'cod') {
                await transaction.rollback();
                return res.status(400).json({ message: 'This order is not configured for COD payment' });
            }

            // Create or update payment record
            let payment;
            if (existingPayment) {
                payment = existingPayment;
                payment.payment_type = 'cod';
                payment.status = 'pending';
                payment.amount_paid = order.final_amount;
                await payment.save({ transaction });
            } else {
                payment = await Payment.create({
                    order_id,
                    user_id: userId,
                    payment_type: 'cod',
                    transaction_id: null,
                    amount_paid: order.final_amount,
                    status: 'pending',
                    payment_gateway: null
                }, { transaction });
            }

            // Update order status if needed
            if (order.payment_status !== 'pending') {
                order.payment_status = 'pending';
                await order.save({ transaction });
            }

            await transaction.commit();

            return res.json({
                message: 'COD payment set. Payment will be collected on delivery.',
                payment,
                order
            });
        }

        // For other payment types, verify payment details
        if (!payment_details) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Payment details are required' });
        }

        // This is where you would integrate with actual payment gateways
        // For demo purposes, we'll simulate payment processing
        
        // Generate a fake transaction ID
        const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 15);
        
        // Determine payment gateway based on type
        let paymentGateway = '';
        switch (payment_type) {
            case 'credit_card':
            case 'debit_card':
                paymentGateway = 'Stripe';
                break;
            case 'upi':
                paymentGateway = 'Razorpay';
                break;
            case 'wallet':
                paymentGateway = 'PayPal';
                break;
            default:
                paymentGateway = 'Other';
        }

        // Create or update payment record
        let payment;
        if (existingPayment) {
            payment = existingPayment;
            payment.payment_type = payment_type;
            payment.transaction_id = transactionId;
            payment.amount_paid = order.final_amount;
            payment.status = 'successful';
            payment.payment_gateway = paymentGateway;
            await payment.save({ transaction });
        } else {
            payment = await Payment.create({
                order_id,
                user_id: userId,
                payment_type,
                transaction_id: transactionId,
                amount_paid: order.final_amount,
                status: 'successful',
                payment_gateway: paymentGateway
            }, { transaction });
        }

        // Update order payment status
        order.payment_status = 'paid';
        await order.save({ transaction });

        await transaction.commit();

        res.json({
            message: 'Payment processed successfully',
            payment,
            order
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error processing payment:', error);
        res.status(500).json({ message: 'Failed to process payment', error: error.message });
    }
};

// Get payment status for an order
module.exports.getPaymentStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.user.id;

        // First check if the order exists and belongs to the user or is admin
        const order = await Order.findOne({
            where: { id: orderId }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // If not admin and not order owner, deny access
        if (req.user.role !== 'admin' && order.user_id !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const payment = await Payment.findOne({
            where: { order_id: orderId },
            order: [['createdAt', 'DESC']]
        });

        if (!payment) {
            return res.status(404).json({ message: 'No payment found for this order' });
        }

        res.json({ payment, orderStatus: order.status, paymentStatus: order.payment_status });
    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({ message: 'Failed to get payment status', error: error.message });
    }
};

// Process a refund
module.exports.processRefund = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { payment_id, reason, amount } = req.body;
        const userId = req.user.id;

        if (!payment_id) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Payment ID is required' });
        }

        // Only admin can process refunds
        if (req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Only admin can process refunds' });
        }

        const payment = await Payment.findByPk(payment_id, { transaction });
        if (!payment) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Can only refund successful payments
        if (payment.status !== 'successful') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot refund ${payment.status} payments` });
        }

        // Update payment status
        payment.status = 'refunded';
        await payment.save({ transaction });

        // Also update the order's payment status
        const order = await Order.findByPk(payment.order_id, { transaction });
        if (order) {
            order.payment_status = 'refunded';
            await order.save({ transaction });
        }

        // Create a refund record
        // In a real app, you might have a separate Refund model
        // For simplicity, we're just creating a new payment record with negative amount
        const refundAmount = amount || payment.amount_paid;
        
        await Payment.create({
            order_id: payment.order_id,
            user_id: userId, // Admin who processed the refund
            payment_type: payment.payment_type,
            transaction_id: `REFUND-${payment.transaction_id || payment.id}`,
            amount_paid: -refundAmount, // Negative amount to indicate refund
            status: 'successful',
            payment_gateway: payment.payment_gateway,
            notes: reason || 'Refund processed'
        }, { transaction });

        await transaction.commit();

        res.json({
            message: 'Refund processed successfully',
            payment: {
                id: payment.id,
                status: payment.status,
                refundedAmount: refundAmount,
                reason: reason || 'Refund processed'
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Failed to process refund', error: error.message });
    }
};

// Get all payments (admin only)
module.exports.getAllPayments = async (req, res) => {
    try {
        const { status, payment_type, start_date, end_date, page = 1, limit = 10 } = req.query;
        
        // Build filter based on query parameters
        const filter = {};
        if (status) filter.status = status;
        if (payment_type) filter.payment_type = payment_type;
        
        // Date range filter
        if (start_date && end_date) {
            filter.createdAt = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        // Pagination
        const offset = (page - 1) * limit;
        
        const payments = await Payment.findAndCountAll({
            where: filter,
            include: [
                { model: Order }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(payments.count / limit);

        res.json({
            payments: payments.rows,
            pagination: {
                total: payments.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages
            }
        });
    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({ message: 'Failed to get payments', error: error.message });
    }
};

// Confirm Payment
module.exports.confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId } = req.params; // Assuming the payment intent ID is passed as a URL parameter

        // Here you would typically call your payment service to confirm the payment
        const paymentIntent = await PaymentService.confirmPayment(paymentIntentId);

        if (!paymentIntent) {
            return res.status(404).json({ message: 'Payment intent not found' });
        }

        res.status(200).json({
            message: 'Payment confirmed successfully',
            paymentIntent
        });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ message: 'Failed to confirm payment', error: error.message });
    }
};

// Create Payment Intent
module.exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency } = req.body; // Assuming amount and currency are passed in the request body

        // Here you would typically call your payment gateway to create a payment intent
        const paymentIntent = await PaymentService.createPaymentIntent(amount, currency);

        if (!paymentIntent) {
            return res.status(400).json({ message: 'Failed to create payment intent' });
        }

        res.status(201).json({
            message: 'Payment intent created successfully',
            paymentIntent
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
    }
};

// Get all payments for the authenticated user
module.exports.getUserPayments = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming user ID is available in the request

        const payments = await Payment.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']]
        });

        if (!payments.length) {
            return res.status(404).json({ message: 'No payments found for this user' });
        }

        res.json(payments);
    } catch (error) {
        console.error('Error fetching user payments:', error);
        res.status(500).json({ message: 'Failed to fetch user payments', error: error.message });
    }
};

// Process a refund
module.exports.refundPayment = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { payment_id, reason } = req.body; // Assuming payment ID and reason for refund are passed in the request body
        const userId = req.user.id;

        if (!payment_id) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Payment ID is required' });
        }

        // Only admin can process refunds
        if (req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Only admin can process refunds' });
        }

        const payment = await Payment.findByPk(payment_id, { transaction });
        if (!payment) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Can only refund successful payments
        if (payment.status !== 'successful') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot refund ${payment.status} payments` });
        }

        // Update payment status
        payment.status = 'refunded';
        await payment.save({ transaction });

        // Also update the order's payment status
        const order = await Order.findByPk(payment.order_id, { transaction });
        if (order) {
            order.payment_status = 'refunded';
            await order.save({ transaction });
        }

        // Create a refund record
        // In a real app, you might have a separate Refund model
        // For simplicity, we're just creating a new payment record with negative amount
        await Payment.create({
            order_id: payment.order_id,
            user_id: userId, // Admin who processed the refund
            payment_type: payment.payment_type,
            transaction_id: `REFUND-${payment.transaction_id || payment.id}`,
            amount_paid: -payment.amount_paid, // Negative amount to indicate refund
            status: 'successful',
            payment_gateway: payment.payment_gateway,
            notes: reason || 'Refund processed'
        }, { transaction });

        await transaction.commit();

        res.json({
            message: 'Refund processed successfully',
            payment: {
                id: payment.id,
                status: payment.status,
                reason: reason || 'Refund processed'
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Failed to process refund', error: error.message });
    }
};

// Razorpay order creation
module.exports.createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;
        console.log('Backend: Received amount to create Razorpay order:', amount);
        if (!amount) {
            return res.status(400).json({ message: 'Amount is required' });
        }

        // Initialize Razorpay instance
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        // Create order
        const options = {
            amount: amount, // amount is already in paise (frontend sends it in paise)
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
        };
        console.log('Backend: Sending these options to Razorpay:', options);
        const order = await razorpay.orders.create(options);
        res.json({ order });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Failed to create Razorpay order', error: error.message });
    }
};

module.exports.razorpayCallback = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_number } = req.body;

  // Find the order by order_number
  const order = await Order.findOne({ where: { order_number } });
  if (!order) {
    return res.redirect('/UnifiedCheckout?payment=failed');
  }

  // Verify signature
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    // Mark order as paid
    order.payment_status = 'paid';
    order.status = 'processing';
    await order.save();

    // Update payment record as successful
    await Payment.update(
      { status: 'successful', transaction_id: razorpay_payment_id },
      { where: { order_id: order.id } }
    );

    return res.redirect(`/ThankYou?order_number=${order.order_number}`);
  } else {
    // Mark order as failed
    order.payment_status = 'failed';
    order.status = 'pending';
    await order.save();

    // Update payment record as failed
    await Payment.update(
      { status: 'failed' },
      { where: { order_id: order.id } }
    );

    return res.redirect('/UnifiedCheckout?payment=failed');
  }
}; 