const { Order } = require('../model/orderModel.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
const { Product } = require('../model/productModel.js');
const { ProductVariation } = require('../model/productVariationModel.js');
const { ShippingAddress } = require('../model/shippingAddressModel.js');
const { ShippingFee } = require('../model/shippingFeeModel.js');
const { Payment } = require('../model/paymentModel.js');
const { User } = require('../model/userModel.js');
const { ProductImage } = require('../model/productImageModel.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { createShiprocketOrder, getShiprocketTracking, getShiprocketLabel, requestShiprocketPickup, cancelShiprocketShipment, getAllShiprocketOrders, authenticateShiprocket } = require('../services/shiprocketService.js');
const { setImmediate } = require('timers');
const { sendFacebookEvent } = require('../integration/facebookPixel.js');

// Generate unique order number
const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${year}${month}${day}-${random}`;
};

// Calculate shipping fee based on payment type
const calculateShippingFee = async (paymentType) => {
    try {
        const orderType = paymentType === 'cod' ? 'cod' : 'prepaid';
        const shippingFee = await ShippingFee.findOne({ where: { orderType } });
        return shippingFee ? shippingFee.fee : (orderType === 'cod' ? 5.99 : 0.00);
    } catch (error) {
        console.error('Error calculating shipping fee:', error);
        return orderType === 'cod' ? 5.99 : 0.00; // Default values if calculation fails
    }
};

// Create a new order
module.exports.createOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { shipping_address_id, items, payment_type, notes, coupon_id, discount_amount } = req.body;
        const userId = req.user.id;

        if (!shipping_address_id || !items || !payment_type) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Shipping address, items, and payment type are required' });
        }

        // Validate shipping address belongs to user
        const shippingAddress = await ShippingAddress.findOne({
            where: { id: shipping_address_id, user_id: userId }
        });

        if (!shippingAddress) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipping address not found' });
        }

        // Calculate total amount and validate items
        let totalAmount = 0;
        const validatedItems = [];

        for (const item of items) {
            const { product_id, quantity } = item;
            let { variation_id } = item; // Use a local, mutable variation_id

            if (!product_id || !quantity) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Product ID and quantity are required for each item' });
            }

            const product = await Product.findByPk(product_id);
            if (!product) {
                await transaction.rollback();
                return res.status(404).json({ message: `Product with ID ${product_id} not found` });
            }

            let price;
            let stockAvailable;
            let variation;
            if (variation_id) {
                variation = await ProductVariation.findByPk(variation_id);
                if (!variation || variation.productId !== product_id) {
                    await transaction.rollback();
                    return res.status(404).json({ message: `Invalid variation for product ${product_id}` });
                }
                price = variation.price;
                stockAvailable = variation.stock;
            } else {
                const variations = await ProductVariation.findAll({ where: { productId: product_id } });
                if (variations.length > 0) {
                    // If variations exist but none was chosen, default to the first one
                    variation = variations[0];
                    variation_id = variation.id; // Assign to the local variable
                    price = variation.price;
                    stockAvailable = variation.stock;
                } else {
                    price = product.price;
                    stockAvailable = product.stock_quantity;
                }

                if (!price || price <= 0) {
                    await transaction.rollback();
                    return res.status(400).json({ message: `No price found for product ${product_id}` });
                }
            }

            // STOCK CHECK
            if (typeof stockAvailable !== 'number' || stockAvailable < quantity) {
                await transaction.rollback();
                return res.status(400).json({ message: `Product is out of stock or insufficient quantity for product ${product_id}` });
            }

            // Apply discount if exists (simplified version)
            let discount = 0;
            // You would add discount calculation logic here
            
            const subtotal = (price * quantity) - discount;
            totalAmount += subtotal;

            validatedItems.push({
                product_id,
                variation_id: variation_id || null, // Use the local variable
                quantity,
                price,
                discount,
                subtotal,
                _variation: variation // Pass the variation instance for later stock decrement
            });
        }

        const subTotal = totalAmount;
        const appliedDiscount = discount_amount ? parseFloat(discount_amount) : 0;

        // Calculate shipping fee
        const shippingFee = await calculateShippingFee(payment_type);
        const finalAmount = subTotal - appliedDiscount + shippingFee;

        // Create order
        const order = await Order.create({
            order_number: generateOrderNumber(),
            user_id: userId,
            total_amount: subTotal,
            discount_amount: appliedDiscount,
            coupon_id: coupon_id || null,
            shipping_fee: shippingFee,
            final_amount: finalAmount,
            payment_type,
            payment_status: 'pending',
            status: 'pending',
            notes: notes || null,
        }, { transaction });

        // Create order items
        for (const item of validatedItems) {
            await OrderItem.create({
                order_id: order.id,
                product_id: item.product_id,
                variation_id: item.variation_id,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                subtotal: item.subtotal
            }, { transaction });

            // DECREMENT STOCK
            if (item._variation) {
                item._variation.stock -= item.quantity;
                await item._variation.save({ transaction });
            } else {
                // If no variation, decrement product stock_quantity
                const product = await Product.findByPk(item.product_id);
                if (product) {
                    product.stock_quantity = (product.stock_quantity || 0) - item.quantity;
                    await product.save({ transaction });
                }
            }
        }

        // Create initial status history
        await OrderStatusHistory.create({
            order_id: order.id,
            status: 'pending',
            updated_by: userId,
        }, { transaction });

        // If payment type is not COD, create a payment record
        if (payment_type !== 'cod') {
            await Payment.create({
                order_id: order.id,
                user_id: userId,
                payment_type,
                amount_paid: finalAmount,
                status: 'pending'
            }, { transaction });
        }

        await transaction.commit();

        // Fetch the created order with its items
        const createdOrder = await Order.findByPk(order.id, {
            include: [
                { model: OrderItem, include: [Product] },
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: OrderStatusHistory, order: [['updated_at', 'DESC']] }
            ]
        });

        // Shiprocket integration
        try {
            const user = createdOrder.User;
            const address = createdOrder.ShippingAddress;

            // Validate address and phone
            if (!address || !address.address_line1 || !address.phone) {
                console.error(`Order ${createdOrder.order_number}: Missing address or phone, cannot sync to Shiprocket.`);
                // Optionally, update order status or add a note
                return;
            }

            const orderItems = createdOrder.OrderItems.map(item => ({
                product_name: item.Product.name,
                sku: item.Product.sku || '',
                quantity: item.quantity,
                price: item.price
            }));

            const shiprocketPayload = {
                order_id: createdOrder.order_number,
                order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                pickup_location: 'Default',
                channel_id: "7361105",
                billing_customer_name: user.username,
                billing_last_name: '',
                billing_address: address.address_line1,
                billing_address_2: address.address_line2 || '',
                billing_city: address.city,
                billing_pincode: address.postal_code,
                billing_state: address.state,
                billing_country: address.country || 'India',
                billing_email: user.email,
                billing_phone: address.phone,
                shipping_is_billing: true,
                order_items: orderItems.map(item => ({
                    name: item.product_name,
                    sku: item.sku || '',
                    units: item.quantity,
                    selling_price: item.price.toString(),
                    hsn: 441122
                })),
                payment_method: createdOrder.payment_type === 'cod' ? 'COD' : 'Prepaid',
                shipping_charges: 0,
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: 0,
                sub_total: createdOrder.total_amount,
                length: 10,
                breadth: 15,
                height: 20,
                weight: product.weight || 2.5 // Use product weight if available, fallback to 2.5
            };

            const shipRes = await createShiprocketOrder(shiprocketPayload);

            await createdOrder.update({
                shiprocket_order_id: shipRes.order_id,
                shiprocket_shipment_id: shipRes.shipments?.[0]?.shipment_id || null
            });

            console.log('✅ Shiprocket Order Created:', shipRes.order_id);
        } catch (err) {
            console.error('❌ Failed to create Shiprocket order:', err.message);
        }

        res.status(201).json({
            message: 'Order created successfully',
            order: createdOrder
        });

        // --- Auto-sync all unsynced orders with Shiprocket in the background ---
        try {
            setImmediate(async () => {
                try {
                    await module.exports.syncOrdersWithShiprocket({
                        user: req.user,
                        headers: req.headers,
                        body: {},
                        query: {}
                    }, {
                        status: () => ({ json: () => {} }),
                        json: () => {}
                    });
                } catch (err) {
                    console.error('Background Shiprocket sync failed:', err.message);
                }
            });
        } catch (err) {
            console.error('Failed to trigger background Shiprocket sync:', err.message);
        }
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
};

// Get all orders (admin)
module.exports.getAllOrders = async (req, res) => {
    try {
        const { status, payment_status, start_date, end_date, page = 1, limit = 10 } = req.query;
        
        // Build filter based on query parameters
        const filter = {
            [Op.or]: [
                { payment_type: 'cod' },
                { payment_status: { [Op.ne]: 'pending' } }
            ]
        };
        if (status) filter.status = status;
        if (payment_status) filter.payment_status = payment_status;
        
        // Date range filter
        if (start_date && end_date) {
            filter.createdAt = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        // Pagination
        const offset = (page - 1) * limit;
        
        const orders = await Order.findAndCountAll({
            where: filter,
            include: [
                { model: User, attributes: ['id', 'username', 'email'] },
                { 
                    model: OrderItem, 
                    include: [
                        {
                            model: Product,
                            include: [
                                { model: ProductImage, as: 'ProductImages' }
                            ]
                        }
                    ] 
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(orders.count / limit);

        res.json({
            orders: orders.rows,
            pagination: {
                total: orders.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages
            }
        });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ message: 'Failed to get orders', error: error.message });
    }
};

// Get user's orders
module.exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 10 } = req.query;
        
        // Build filter
        const filter = {
            user_id: userId,
            [Op.or]: [
                { payment_type: 'cod' },
                { payment_status: { [Op.ne]: 'pending' } }
            ]
        };
        if (status) filter.status = status;
        
        // Pagination
        const offset = (page - 1) * limit;

        const orders = await Order.findAndCountAll({
            where: filter,
            include: [
                { 
                    model: OrderItem, 
                    include: [
                        {
                            model: Product,
                            include: [
                                { model: ProductImage, as: 'ProductImages' }
                            ]
                        }
                    ] 
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalPages = Math.ceil(orders.count / limit);
        
        res.json({
            orders: orders.rows,
            pagination: {
                total: orders.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages
            }
        });
    } catch (error) {
        console.error('Error getting user orders:', error);
        res.status(500).json({ message: 'Failed to get orders', error: error.message });
    }
};

// Get Order by ID
module.exports.getOrder = async (req, res) => {
    try {
        const { id } = req.params; // Assuming the order ID is passed as a URL parameter

        const order = await Order.findByPk(id, {
            include: [
                { model: OrderItem },
                { model: User }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order', error: error.message });
    }
};

// Update order status
module.exports.updateOrderStatus = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        const userId = req.user.id;
        
        if (!status) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Status is required' });
        }
        
        // Only admin can update status
        if (req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Only admin can update order status' });
        }
        
        const order = await Order.findByPk(orderId);
        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        // Cannot change status if already delivered or cancelled
        if (order.status === 'delivered' || order.status === 'cancelled') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot change status of ${order.status} orders` });
        }
        
        // Update order status
        order.status = status;
        await order.save({ transaction });
        
        // Create status history entry
        await OrderStatusHistory.create({
            order_id: order.id,
            status,
            updated_by: userId
        }, { transaction });

        // If status is 'cancelled' and payment is 'paid', create refund record
        if (status === 'cancelled' && order.payment_status === 'paid') {
            const payment = await Payment.findOne({ 
                where: { order_id: order.id, status: 'successful' }
            });
            
            if (payment) {
                payment.status = 'refunded';
                await payment.save({ transaction });
                
                order.payment_status = 'refunded';
                await order.save({ transaction });
            }
        }
        
        await transaction.commit();
        
        // Get updated order
        const updatedOrder = await Order.findByPk(orderId, {
            include: [
                { model: OrderItem, include: [Product] },
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: OrderStatusHistory, order: [['updated_at', 'DESC']] },
                { model: Payment }
            ]
        });
        
        // Facebook Pixel: Track purchase when order is delivered/completed
        if (status === 'delivered' || status === 'completed') {
            // Prepare order data for Facebook Pixel
            const orderForPixel = {
                ...updatedOrder.dataValues,
                items: updatedOrder.OrderItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                })),
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                currency: 'INR',
                total_amount: updatedOrder.final_amount
            };
            sendFacebookEvent('Purchase', orderForPixel).catch(console.error);
        }
        
        res.json({
            message: 'Order status updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status', error: error.message });
    }
};

// Cancel order (by user)
module.exports.cancelOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const orderId = req.params.id;
        const { reason } = req.body;
        const userId = req.user.id;
        
        const order = await Order.findByPk(orderId);
        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Verify order belongs to user
        if (order.user_id !== userId) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Cannot cancel if already delivered or cancelled
        if (order.status === 'delivered' || order.status === 'cancelled') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot cancel ${order.status} orders` });
        }
        
        // Can only cancel pending or processing orders
        if (order.status !== 'pending' && order.status !== 'processing') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot cancel orders in ${order.status} status` });
        }
        
        // Update order status
        order.status = 'cancelled';
        await order.save({ transaction });
        
        // Create status history entry with user's reason
        await OrderStatusHistory.create({
            order_id: order.id,
            status: 'cancelled',
            updated_by: userId,
            notes: reason
        }, { transaction });
        
        // If payment is 'paid', mark for refund
        if (order.payment_status === 'paid') {
            const payment = await Payment.findOne({ 
                where: { order_id: order.id, status: 'successful' }
            });
            
            if (payment) {
                payment.status = 'refunded';
                await payment.save({ transaction });
                
                order.payment_status = 'refunded';
                await order.save({ transaction });
            }
        }
        
        if (order.shiprocket_shipment_id) {
            try {
                const cancelRes = await cancelShiprocketShipment([order.shiprocket_shipment_id]);
                console.log('Shiprocket shipment cancelled:', cancelRes);
            } catch (err) {
                console.error('Failed to cancel Shiprocket shipment:', err?.response?.data || err.message);
            }
        }
        
        await transaction.commit();
        
        res.json({
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Failed to cancel order', error: error.message });
    }
};

// Get order statistics
module.exports.getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.count();
        const totalRevenue = await Order.sum('final_amount');
        const totalPendingOrders = await Order.count({ where: { status: 'pending' } });
        const totalDeliveredOrders = await Order.count({ where: { status: 'delivered' } });
        const totalCancelledOrders = await Order.count({ where: { status: 'cancelled' } });

        res.json({
            totalOrders,
            totalRevenue,
            totalPendingOrders,
            totalDeliveredOrders,
            totalCancelledOrders
        });
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({ message: 'Failed to fetch order statistics', error: error.message });
    }
};

// Get Shiprocket tracking info for an order
module.exports.getShiprocketTrackingForOrder = async (req, res) => {
    try {
        const { id } = req.params; // order id
        const order = await Order.findByPk(id);
        if (!order || !order.shiprocket_shipment_id) {
            return res.status(404).json({ message: 'Order or Shiprocket shipment not found' });
        }
        const tracking = await getShiprocketTracking(order.shiprocket_shipment_id);
        res.json({ tracking });
    } catch (error) {
        console.error('Error fetching Shiprocket tracking:', error);
        res.status(500).json({ message: 'Failed to fetch Shiprocket tracking', error: error.message });
    }
};

// Get Shiprocket label for an order
module.exports.getShiprocketLabelForOrder = async (req, res) => {
    try {
        const { id } = req.params; // order id
        const order = await Order.findByPk(id);
        if (!order || !order.shiprocket_shipment_id) {
            return res.status(404).json({ message: 'Order or Shiprocket shipment not found' });
        }
        const labelData = await getShiprocketLabel(order.shiprocket_shipment_id);
        res.json({ label_url: labelData.label_url });
    } catch (error) {
        console.error('Error fetching Shiprocket label:', error);
        res.status(500).json({ message: 'Failed to fetch Shiprocket label', error: error.message });
    }
};

// Get all Shiprocket orders
module.exports.getAllShiprocketOrders = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const shiprocketOrders = await getAllShiprocketOrders({ 
            page: parseInt(page), 
            limit: parseInt(limit) 
        });
        res.json(shiprocketOrders);
    } catch (error) {
        console.error('Error fetching Shiprocket orders:', error);
        res.status(500).json({ message: 'Failed to fetch Shiprocket orders', error: error.message });
    }
};

// Sync existing orders with Shiprocket
module.exports.syncOrdersWithShiprocket = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('=== SHIPROCKET SYNC PROCESS START ===');
        console.log('Request headers:', req.headers);
        console.log('Request user:', req.user);
        
        // First, test Shiprocket authentication
        try {
            console.log('=== TESTING SHIPROCKET AUTHENTICATION ===');
            await authenticateShiprocket();
            console.log('=== SHIPROCKET AUTHENTICATION SUCCESS ===');
        } catch (authError) {
            console.error('=== SHIPROCKET AUTHENTICATION FAILED ===');
            console.error('Auth error:', authError);
            await transaction.rollback();
            return res.status(400).json({ 
                message: 'Shiprocket authentication failed', 
                error: authError.message 
            });
        }

        // Get all orders that don't have Shiprocket IDs
        const unsyncedOrders = await Order.findAll({
            where: {
                [Op.or]: [
                    { shiprocket_order_id: null },
                    { shiprocket_shipment_id: null }
                ]
            },
            include: [
                { model: OrderItem, include: [Product] },
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: ShippingAddress }
            ]
        });

        console.log(`Found ${unsyncedOrders.length} unsynced orders`);

        // Debug: Check all shipping addresses
        const allShippingAddresses = await ShippingAddress.findAll({
            limit: 5
        });
        console.log('Sample shipping addresses:', allShippingAddresses.map(addr => ({
            id: addr.id,
            user_id: addr.user_id,
            address_line1: addr.address_line1,
            address_line2: addr.address_line2,
            city: addr.city,
            postal_code: addr.postal_code,
            state: addr.state,
            country: addr.country,
            phone: addr.phone
        })));

        const syncResults = {
            total: unsyncedOrders.length,
            successful: 0,
            failed: 0,
            errors: []
        };

        for (const order of unsyncedOrders) {
            try {
                // Check if order already has Shiprocket IDs
                if (order.shiprocket_order_id && order.shiprocket_shipment_id) {
                    continue;
                }

                console.log(`Processing order ${order.order_number} for user ${order.user_id}:`);

                // Try multiple ways to get shipping address
                let shippingAddress = null;
                
                // First, try to get from the order's included data
                if (order.ShippingAddress) {
                    shippingAddress = order.ShippingAddress;
                    console.log('Found shipping address from order include');
                } else {
                    // If not included, try to find by user_id
                    shippingAddress = await ShippingAddress.findOne({
                        where: { user_id: order.user_id }
                    });
                    console.log('Found shipping address by user_id query');
                }

                // If still not found, try to find any address for this user
                if (!shippingAddress) {
                    const userAddresses = await ShippingAddress.findAll({
                        where: { user_id: order.user_id }
                    });
                    if (userAddresses.length > 0) {
                        shippingAddress = userAddresses[0];
                        console.log('Found shipping address from user addresses list');
                    }
                }

                console.log('Shipping address found:', !!shippingAddress);
                if (shippingAddress) {
                    console.log('Address data:', {
                        id: shippingAddress.id,
                        user_id: shippingAddress.user_id,
                        address_line1: shippingAddress.address_line1,
                        address_line2: shippingAddress.address_line2,
                        city: shippingAddress.city,
                        postal_code: shippingAddress.postal_code,
                        state: shippingAddress.state,
                        country: shippingAddress.country,
                        phone: shippingAddress.phone
                    });
                }

                if (!shippingAddress) {
                    syncResults.failed++;
                    syncResults.errors.push(`Order ${order.order_number}: No shipping address found for user ${order.user_id}`);
                    continue;
                }

                // Validate and prepare address data with fallbacks
                const billingAddress = shippingAddress.address_line1 || 
                                     shippingAddress.address_line2 || 
                                     'Default Address';
                
                const billingPhone = shippingAddress.phone || 
                                   '9999999999'; // Default phone number
                
                const billingCity = shippingAddress.city || 'Default City';
                const billingPincode = shippingAddress.postal_code || '000000';
                const billingState = shippingAddress.state || 'Default State';

                console.log('Processed address data:', {
                    billingAddress,
                    billingPhone,
                    billingCity,
                    billingPincode,
                    billingState
                });

                // Map order data to Shiprocket's required format
                const shiprocketOrderPayload = {
                    order_id: order.order_number,
                    order_date: order.createdAt.toISOString().slice(0, 19).replace('T', ' '), // Format: "2019-07-24 11:11"
                    pickup_location: 'Default',
                    channel_id: "7361105", // Updated to Cross Coin channel ID
                    comment: `Order from Cross-Coin: ${order.order_number}`,
                    billing_customer_name: order.User.username,
                    billing_last_name: '',
                    billing_address: billingAddress,
                    billing_address_2: shippingAddress.address_line2 || '',
                    billing_city: billingCity,
                    billing_pincode: billingPincode,
                    billing_state: billingState,
                    billing_country: shippingAddress.country || 'India',
                    billing_email: order.User.email,
                    billing_phone: billingPhone,
                    shipping_is_billing: true,
                    shipping_customer_name: '',
                    shipping_last_name: '',
                    shipping_address: '',
                    shipping_address_2: '',
                    shipping_city: '',
                    shipping_pincode: '',
                    shipping_country: '',
                    shipping_state: '',
                    shipping_email: '',
                    shipping_phone: '',
                    order_items: order.OrderItems.map(item => ({
                        name: item.Product.name,
                        sku: item.Product.sku || '',
                        units: item.quantity,
                        selling_price: item.price.toString(),
                        discount: item.discount ? item.discount.toString() : '',
                        tax: '',
                        hsn: 441122 // Default HSN code
                    })),
                    payment_method: order.payment_type === 'cod' ? 'COD' : 'Prepaid',
                    shipping_charges: 0,
                    giftwrap_charges: 0,
                    transaction_charges: 0,
                    total_discount: 0,
                    sub_total: order.total_amount,
                    length: 10,
                    breadth: 15,
                    height: 20,
                    weight: 2.5
                };

                console.log('Shiprocket payload prepared:', {
                    order_id: shiprocketOrderPayload.order_id,
                    billing_address: shiprocketOrderPayload.billing_address,
                    billing_phone: shiprocketOrderPayload.billing_phone,
                    billing_city: shiprocketOrderPayload.billing_city,
                    billing_pincode: shiprocketOrderPayload.billing_pincode
                });

                const shiprocketResponse = await createShiprocketOrder(shiprocketOrderPayload);
                
                // Update order with Shiprocket IDs
                await order.update({
                    shiprocket_order_id: shiprocketResponse.order_id || null,
                    shiprocket_shipment_id: (shiprocketResponse.shipments && shiprocketResponse.shipments[0]?.shipment_id) || null
                }, { transaction });

                // Request pickup if shipment ID exists
                if (shiprocketResponse.shipments && shiprocketResponse.shipments[0]?.shipment_id) {
                    try {
                        await requestShiprocketPickup([shiprocketResponse.shipments[0].shipment_id]);
                    } catch (pickupErr) {
                        console.error('Failed to request pickup for order', order.order_number, pickupErr);
                    }
                }

                syncResults.successful++;
                console.log(`Successfully synced order ${order.order_number} with Shiprocket`);

            } catch (error) {
                syncResults.failed++;
                syncResults.errors.push(`Order ${order.order_number}: ${error.message}`);
                console.error(`Failed to sync order ${order.order_number}:`, error);
            }
        }

        await transaction.commit();
        console.log('=== SHIPROCKET SYNC PROCESS COMPLETED ===');
        console.log('Final results:', syncResults);
        
        res.json({
            message: 'Order sync completed',
            results: syncResults
        });
    } catch (error) {
        await transaction.rollback();
        console.error('=== SHIPROCKET SYNC PROCESS FAILED ===');
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status
        });
        res.status(500).json({ message: 'Failed to sync orders with Shiprocket', error: error.message });
    }
};

// Test Shiprocket credentials
module.exports.testShiprocketCredentials = async (req, res) => {
    try {
        await authenticateShiprocket();
        res.json({ message: 'Shiprocket credentials are valid', status: 'success' });
    } catch (error) {
        res.status(400).json({ message: 'Shiprocket credentials are invalid', error: error.message, status: 'error' });
    }
};


