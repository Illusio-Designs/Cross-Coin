const { Payment } = require('../model/paymentModel.js');
const { Order } = require('../model/orderModel.js');
const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { PaymentService } = require('../services/paymentService.js');
const razorpayService = require('../services/razorpayService');
const crypto = require('crypto');
const settingsHelper = require('../services/settingsHelper');
const { toSmallestUnit, fromSmallestUnit } = require('../utils/amountConverter');
const { sendFacebookEvent } = require('../integration/facebookPixel.js');
const { sendGAEvent } = require('../integration/googleAnalytics.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { setImmediate } = require('timers');

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

        // Task 14: Order must be in a refundable state
        const order = await Order.findByPk(payment.order_id, { transaction });
        const REFUNDABLE_STATUSES = ['delivered', 'return_initiated', 'returned_rto', 'cancelled', 'order cancelled'];
        if (order && !REFUNDABLE_STATUSES.includes(order.status)) {
            await transaction.rollback();
            return res.status(400).json({ message: `Refund not allowed for orders in '${order.status}' status.` });
        }

        // Task 14: Refund amount must not exceed original
        const refundAmount = amount || payment.amount_paid;
        if (parseFloat(refundAmount) > parseFloat(payment.amount_paid)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Refund amount cannot exceed the original payment amount.' });
        }

        // Update payment status
        payment.status = 'refunded';
        await payment.save({ transaction });

        // Also update the order's payment status
        if (order) {
            order.payment_status = 'refunded';
            await order.save({ transaction });
        }

        await Payment.create({
            order_id: payment.order_id,
            user_id: userId,
            payment_type: payment.payment_type,
            transaction_id: `REFUND-${payment.transaction_id || payment.id}`,
            amount_paid: -refundAmount,
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
        const { status, payment_type, start_date, end_date, page = 1, limit = 20 } = req.query;
        const cappedLimit = Math.min(parseInt(limit) || 20, 100);
        const offset = (parseInt(page) - 1) * cappedLimit;

        const filter = {};
        if (status) filter.status = status;
        if (payment_type) filter.payment_type = payment_type;
        
        // Date range filter
        if (start_date && end_date) {
            filter.createdAt = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }
        
        const payments = await Payment.findAndCountAll({
            where: filter,
            include: [
                { 
                    model: Order,
                    attributes: ['id', 'order_number', 'payment_type', 'user_id', 'guest_user_id'],
                    include: [
                        { 
                            model: User,
                            attributes: ['id', 'username', 'email'],
                            required: false
                        },
                        {
                            model: GuestUser,
                            as: 'GuestUser',
                            attributes: ['id', 'firstName', 'lastName', 'email'],
                            required: false
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: cappedLimit,
            offset
        });

        const totalPages = Math.ceil(payments.count / cappedLimit);

        res.json({
            success: true,
            payments: payments.rows,
            pagination: {
                total: payments.count,
                page: parseInt(page),
                limit: cappedLimit,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({ success: false, message: 'Failed to get payments', error: error.message });
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
        const { page = 1, limit = 20 } = req.query;

        // Pagination
        const offset = (page - 1) * limit;

        const payments = await Payment.findAndCountAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        if (!payments.count) {
            return res.status(404).json({ 
                success: false,
                message: 'No payments found for this user',
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: 0
                }
            });
        }

        const totalPages = Math.ceil(payments.count / limit);

        res.json({
            success: true,
            data: payments.rows,
            pagination: {
                total: payments.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching user payments:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch user payments', 
            error: error.message 
        });
    }
};

// Process a refund — delegates to refundService (supports full + partial)
module.exports.refundPayment = async (req, res) => {
    try {
        const { payment_id, amount, reason } = req.body;

        if (!payment_id) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Payment ID is required' } });
        if (!reason || reason.trim().length < 5) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Refund reason is required (min 5 chars)' } });

        if (!['admin', 'order_manager'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admin/order manager can process refunds' } });
        }

        const { processRefund } = require('../services/refundService.js');
        const result = await processRefund({
            paymentId: payment_id,
            amount: amount || null,
            reason,
            adminId: req.user.id,
            brandId: req.brand?.id || 1,
        });

        res.json(result);
    } catch (error) {
        const status = error.message.includes('not found') ? 404
            : error.message.includes('Cannot refund') || error.message.includes('not allowed') ? 400
            : 500;
        res.status(status).json({ success: false, error: { code: 'REFUND_FAILED', message: error.message } });
    }
};

// Razorpay order creation
module.exports.createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, brand_id, items, orderId } = req.body;
        console.log('Backend: Received amount to create Razorpay order:', amount);
        if (!amount) {
            return res.status(400).json({ message: 'Amount is required' });
        }

        const brandId = brand_id || (req.brand ? req.brand.id : 1);

        // Create order using centralized Razorpay service
        const order = await razorpayService.createOrder({
            amount,
            currency,
            receipt,
            brandId
        });

        console.log('Backend: Razorpay order created:', { order_id: order.id, amount: order.amount });

        // Store a pending payment record immediately so failed payments are tracked
        if (orderId) {
            try {
                const dbOrder = await Order.findByPk(orderId);
                if (dbOrder) {
                    const existing = await Payment.findOne({ where: { order_id: orderId, razorpay_order_id: order.id } });
                    if (!existing) {
                        await Payment.create({
                            order_id: orderId,
                            user_id: dbOrder.user_id || null,
                            guest_user_id: dbOrder.guest_user_id || null,
                            payment_type: 'razorpay',
                            razorpay_order_id: order.id,
                            amount_paid: toSmallestUnit(parseFloat(amount) / 100, currency),
                            status: 'pending',
                            payment_gateway: 'Razorpay',
                            brand_id: dbOrder.brand_id || brandId,
                        });
                        console.log('Stored pending payment record for Razorpay order:', order.id);
                    }
                }
            } catch (paymentErr) {
                // Non-fatal — log but don't block the response
                console.error('Warning: Could not store pending payment record:', paymentErr.message);
            }
        }

        res.json({ order });

        // Fire InitiateCheckout + AddPaymentInfo events (non-blocking)
        setImmediate(async () => {
            try {
                const amountInRupees = parseFloat(amount) / 100;
                const eventPayload = {
                    brand_id: brandId,
                    order_number: receipt || order.id,
                    total_amount: amountInRupees,
                    final_amount: amountInRupees,
                    currency: currency || 'INR',
                    ip_address: req.ip || null,
                    user_agent: req.headers['user-agent'] || null,
                    fbc: req.cookies?._fbc || req.body?.fbc || null,
                    fbp: req.cookies?._fbp || null,
                    items: items || [],
                };

                // If we have an orderId, enrich with user data
                if (orderId) {
                    const dbOrder = await Order.findByPk(orderId, { attributes: ['user_id', 'guest_user_id', 'brand_id'] });
                    if (dbOrder) {
                        const [orderUser, guestUser] = await Promise.all([
                            dbOrder.user_id ? User.findByPk(dbOrder.user_id, { attributes: ['email', 'username'] }) : null,
                            dbOrder.guest_user_id ? GuestUser.findByPk(dbOrder.guest_user_id, { attributes: ['email', 'firstName', 'lastName', 'phone'] }) : null,
                        ]);
                        eventPayload.email = orderUser?.email || guestUser?.email || null;
                        eventPayload.phone = guestUser?.phone || null;
                        const nameParts = (orderUser?.username || '').trim().split(/\s+/);
                        eventPayload.first_name = orderUser ? (nameParts[0] || null) : (guestUser?.firstName || null);
                        eventPayload.last_name = orderUser ? (nameParts.slice(1).join(' ') || null) : (guestUser?.lastName || null);
                    }
                }

                await sendFacebookEvent('InitiateCheckout', eventPayload);
                await sendGAEvent('begin_checkout', eventPayload);
                await sendFacebookEvent('AddPaymentInfo', eventPayload);
                await sendGAEvent('add_payment_info', eventPayload);
            } catch (err) {
                console.error('Analytics InitiateCheckout/AddPaymentInfo error:', err.message);
            }
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Failed to create Razorpay order', error: error.message });
    }
};

// Update order with payment details after successful payment
module.exports.updateOrderPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    
    console.log('Updating order payment:', { orderId, razorpayPaymentId, razorpayOrderId });

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ message: 'All payment fields are required' });
    }

    // Verify signature using centralized Razorpay service
    const isValidSignature = await razorpayService.verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      1
    );

    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find the order
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Task 9: Guard re-processing paid orders
    if (order.payment_status === 'paid') {
      return res.status(200).json({ success: true, message: 'Payment already processed', order });
    }
    if (['failed', 'cancelled'].includes(order.payment_status)) {
      return res.status(400).json({ message: `Cannot process payment for a ${order.payment_status} order.` });
    }

    // Task 8: Payment ID deduplication
    const existingSuccessful = await Payment.findOne({
      where: { transaction_id: razorpayPaymentId, status: 'successful' }
    });
    if (existingSuccessful) {
      return res.status(400).json({ message: 'Payment already processed.' });
    }

    // Update order status
    order.payment_status = 'paid';
    order.status = 'processing';
    await order.save();

    // Convert order amount to smallest unit for consistent storage
    // Sequelize returns DECIMAL columns as strings — parse to float first
    const amountInSmallestUnit = toSmallestUnit(parseFloat(order.final_amount), 'INR');

    // Find existing payment record — prefer matching by razorpay_order_id (the pending record we stored at createRazorpayOrder)
    let payment = await Payment.findOne({
      where: { order_id: order.id, razorpay_order_id: razorpayOrderId }
    });

    // Fallback: any pending payment for this order
    if (!payment) {
      payment = await Payment.findOne({
        where: { order_id: order.id, status: 'pending' }
      });
    }

    if (payment) {
      // Update existing payment
      await payment.update({
        payment_type: 'razorpay',
        amount_paid: amountInSmallestUnit,
        status: 'successful',
        transaction_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_signature: razorpaySignature,
        brand_id: order.brand_id || 1,
      });
    } else {
      // Create new payment record if none exists
      await Payment.create({
        order_id: order.id,
        user_id: order.user_id || null,
        guest_user_id: order.guest_user_id || null,
        payment_type: 'razorpay',
        amount_paid: amountInSmallestUnit,
        status: 'successful',
        transaction_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_signature: razorpaySignature,
        brand_id: order.brand_id || 1,
      });
    }

    res.json({ 
      success: true, 
      message: 'Order payment updated successfully',
      order: order 
    });

    // Fire Purchase event to Facebook + Google Analytics (non-blocking)
    // This is the SINGLE source of truth for prepaid orders — createOrder skips analytics for non-COD
    setImmediate(async () => {
      try {
        const [items, orderUser, guestUser, shippingAddr] = await Promise.all([
          OrderItem.findAll({ 
            where: { order_id: order.id },
            include: [{ model: require('../model/productModel.js').Product, as: 'Product', attributes: ['id', 'name'] }]
          }),
          order.user_id ? User.findByPk(order.user_id, { attributes: ['email', 'username'] }) : null,
          order.guest_user_id ? GuestUser.findByPk(order.guest_user_id, { attributes: ['email', 'firstName', 'lastName', 'phone'] }) : null,
          order.shipping_address_id ? require('../model/shippingAddressModel.js').ShippingAddress.findByPk(order.shipping_address_id) : null,
        ]);

        // Resolve email/name from registered user or guest user
        const email = orderUser?.email || guestUser?.email || null;
        const phone = shippingAddr?.phone || guestUser?.phone || null;
        let firstName, lastName;
        if (orderUser) {
          const nameParts = (orderUser.username || '').trim().split(/\s+/);
          firstName = nameParts[0] || null;
          lastName = nameParts.slice(1).join(' ') || null;
        } else {
          firstName = guestUser?.firstName || null;
          lastName = guestUser?.lastName || null;
        }

        const eventPayload = {
          brand_id: order.brand_id || 1,
          order_number: order.order_number,
          total_amount: parseFloat(order.final_amount),
          final_amount: parseFloat(order.final_amount),
          currency: 'INR',
          ip_address: req.ip || null,
          user_agent: req.headers['user-agent'] || null,
          email,
          phone,
          first_name: firstName,
          last_name: lastName,
          zip_code: shippingAddr?.pincode || null,
          city: shippingAddr?.city || null,
          state: shippingAddr?.state || null,
          country: 'in',
          fbc: req.cookies?._fbc || req.body?.fbc || null,
          fbp: req.cookies?._fbp || null,
          items: items.map(i => ({ 
            product_id: i.product_id, 
            quantity: i.quantity,
            price: parseFloat(i.price || 0),
            name: i.Product?.name || '',
          })),
        };
        await sendFacebookEvent('Purchase', eventPayload);
        await sendGAEvent('purchase', eventPayload);
      } catch (err) {
        console.error('Analytics Purchase event error:', err.message);
      }
    });

  } catch (error) {
    console.error('Error updating order payment:', error);
    res.status(500).json({ message: 'Failed to update order payment', error: error.message });
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
  const key_secret = await settingsHelper.getSetting(1, 'RAZORPAY_KEY_SECRET');
  const generated_signature = crypto
    .createHmac('sha256', key_secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    // Mark order as paid
    order.payment_status = 'paid';
    order.status = 'processing';
    await order.save();

    // Upsert payment record with full details
    const existingPayment = await Payment.findOne({
      where: { order_id: order.id, razorpay_order_id }
    }) || await Payment.findOne({ where: { order_id: order.id, status: 'pending' } });

    if (existingPayment) {
      await existingPayment.update({
        status: 'successful',
        transaction_id: razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        payment_type: 'razorpay',
        brand_id: order.brand_id || 1,
      });
    } else {
      await Payment.create({
        order_id: order.id,
        user_id: order.user_id || null,
        guest_user_id: order.guest_user_id || null,
        payment_type: 'razorpay',
        transaction_id: razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        amount_paid: toSmallestUnit(parseFloat(order.final_amount), 'INR'),
        status: 'successful',
        payment_gateway: 'Razorpay',
        brand_id: order.brand_id || 1,
      });
    }

    return res.redirect(`/ThankYou?order_number=${order.order_number}`);
  } else {
    // Mark order as failed
    order.payment_status = 'failed';
    order.status = 'pending';
    await order.save();

    // Upsert payment record as failed
    const existingPayment = await Payment.findOne({
      where: { order_id: order.id, razorpay_order_id }
    }) || await Payment.findOne({ where: { order_id: order.id, status: 'pending' } });

    if (existingPayment) {
      await existingPayment.update({
        status: 'failed',
        razorpay_order_id,
        brand_id: order.brand_id || 1,
      });
    } else {
      await Payment.create({
        order_id: order.id,
        user_id: order.user_id || null,
        guest_user_id: order.guest_user_id || null,
        payment_type: 'razorpay',
        razorpay_order_id,
        amount_paid: toSmallestUnit(parseFloat(order.final_amount), 'INR'),
        status: 'failed',
        payment_gateway: 'Razorpay',
        brand_id: order.brand_id || 1,
      });
    }

    return res.redirect('/UnifiedCheckout?payment=failed');
  }
};

// Handle explicit payment failure reported by the client (Razorpay payment.failed event)
module.exports.handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, errorCode, errorDescription } = req.body;

    if (!orderId || !razorpayOrderId) {
      return res.status(400).json({ message: 'orderId and razorpayOrderId are required' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only update if not already paid (don't overwrite a successful payment)
    if (order.payment_status !== 'paid') {
      order.payment_status = 'failed';
      await order.save();
    }

    // Find the pending payment record and mark it failed
    const payment = await Payment.findOne({
      where: { order_id: orderId, razorpay_order_id: razorpayOrderId }
    }) || await Payment.findOne({
      where: { order_id: orderId, status: 'pending' }
    });

    if (payment) {
      await payment.update({
        status: 'failed',
        razorpay_order_id: razorpayOrderId,
        notes: errorDescription ? `${errorCode || 'PAYMENT_FAILED'}: ${errorDescription}` : 'Payment failed',
      });
    } else {
      // Create a failed record if none exists (e.g. createRazorpayOrder was called without orderId)
      await Payment.create({
        order_id: orderId,
        user_id: order.user_id || null,
        guest_user_id: order.guest_user_id || null,
        payment_type: 'razorpay',
        razorpay_order_id: razorpayOrderId,
        amount_paid: toSmallestUnit(parseFloat(order.final_amount), 'INR'),
        status: 'failed',
        payment_gateway: 'Razorpay',
        notes: errorDescription ? `${errorCode || 'PAYMENT_FAILED'}: ${errorDescription}` : 'Payment failed',
        brand_id: order.brand_id || 1,
      });
    }

    console.log(`Payment failure recorded for order ${orderId}, razorpay_order_id: ${razorpayOrderId}`);
    res.json({ success: true, message: 'Payment failure recorded' });
  } catch (error) {
    console.error('Error recording payment failure:', error);
    res.status(500).json({ message: 'Failed to record payment failure', error: error.message });
  }
};

// Razorpay Webhook — server-to-server event handler (Task 13)
// Route must be registered with express.raw() middleware, NOT express.json()
// so req.rawBody is available for signature verification.
module.exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = await settingsHelper.getSetting(1, 'RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(400).json({ message: 'Webhook not configured' });
    }

    // Verify x-razorpay-signature header
    const receivedSig = req.headers['x-razorpay-signature'];
    if (!receivedSig) {
      return res.status(400).json({ message: 'Missing signature header' });
    }

    const rawBody = req.rawBody || req.body;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);
    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');

    if (expectedSig !== receivedSig) {
      console.warn('Razorpay webhook: invalid signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    const eventId = event.id;
    const eventType = event.event;

    // Idempotency: skip if already processed
    if (eventId) {
      const { sequelize: db } = require('../config/db.js');
      try {
        await db.query(
          `INSERT IGNORE INTO webhooks_log (event_id, event_type, processed_at) VALUES (?, ?, NOW())`,
          { replacements: [eventId, eventType] }
        );
        const [rows] = await db.query(
          `SELECT COUNT(*) as cnt FROM webhooks_log WHERE event_id = ? AND processed_at < NOW()`,
          { replacements: [eventId] }
        );
        // If more than 1 row exists, this is a duplicate
        if (rows[0]?.cnt > 1) {
          console.log(`Razorpay webhook: duplicate event ${eventId}, skipping`);
          return res.status(200).json({ status: 'duplicate' });
        }
      } catch (dbErr) {
        // webhooks_log table may not exist yet — non-fatal, continue processing
        console.warn('webhooks_log insert skipped:', dbErr.message);
      }
    }

    // Handle payment.captured — mark order as paid
    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const rzpOrderId = payment.order_id;
        const rzpPaymentId = payment.id;
        const dbOrder = await Order.findOne({ where: { } });

        // Find order via payment record
        const paymentRecord = await Payment.findOne({ where: { razorpay_order_id: rzpOrderId } });
        if (paymentRecord) {
          const order = await Order.findByPk(paymentRecord.order_id);
          if (order && order.payment_status !== 'paid') {
            order.payment_status = 'paid';
            order.status = 'processing';
            await order.save();
            await paymentRecord.update({
              status: 'successful',
              transaction_id: rzpPaymentId,
            });
            console.log(`Webhook: order ${order.order_number} marked paid via payment.captured`);
          }
        }
      }
    }

    // Handle payment.failed
    if (eventType === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const paymentRecord = await Payment.findOne({ where: { razorpay_order_id: payment.order_id } });
        if (paymentRecord && paymentRecord.status === 'pending') {
          await paymentRecord.update({ status: 'failed', notes: payment.error_description || 'Payment failed via webhook' });
          const order = await Order.findByPk(paymentRecord.order_id);
          if (order && order.payment_status === 'pending') {
            order.payment_status = 'failed';
            await order.save();
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay webhook error:', error.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};
