const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
const { Order } = require('../model/orderModel.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { User } = require('../model/userModel.js');
const { logger } = require('../config/logging.js');

// Get all status history records (admin)
module.exports.getAllOrderStatusHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        // Server-enforced page limit so a client can't pull the whole table
        // (the dashboard used to request limit=1000 and join client-side).
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const status = (req.query.status || '').trim().toLowerCase();

        // Brand scoping: a brand-scoped admin only sees their brand's history.
        // Super-admins (no brand context) see everything.
        const brandId = req.brand?.id || null;
        const orderWhere = {};
        if (brandId) orderWhere.brand_id = brandId;
        if (search) orderWhere.order_number = { [Op.like]: `%${search}%` };
        const scopeOrder = Object.keys(orderWhere).length > 0;

        const historyWhere = {};
        if (status && status !== 'all') historyWhere.status = status;

        const history = await OrderStatusHistory.findAndCountAll({
            where: historyWhere,
            include: [
                {
                    model: Order,
                    attributes: ['order_number', 'brand_id'],
                    required: scopeOrder, // INNER JOIN only when filtering on order fields
                    where: scopeOrder ? orderWhere : undefined,
                },
                {
                    model: User,
                    as: 'UpdatedBy',
                    attributes: ['username']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        // Status breakdown for the stat cards — respects brand + search scope,
        // ignores the status filter so the cards always show the full picture.
        let stats = { total: history.count };
        try {
            const rows = await OrderStatusHistory.findAll({
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('OrderStatusHistory.id')), 'count']],
                include: scopeOrder ? [{ model: Order, attributes: [], required: true, where: orderWhere }] : [],
                group: ['OrderStatusHistory.status'],
                raw: true,
            });
            stats = rows.reduce((acc, r) => {
                const key = (r.status || '').toLowerCase();
                acc[key] = parseInt(r.count, 10) || 0;
                acc.total += acc[key];
                return acc;
            }, { total: 0 });
        } catch (e) {
            stats = { total: history.count };
        }

        res.json({
            history: history.rows,
            stats,
            pagination: {
                total: history.count,
                page,
                limit,
                totalPages: Math.ceil(history.count / limit)
            }
        });
    } catch (error) {
        logger.error('Error getting all order status history:', error);
        res.status(500).json({ message: 'Failed to get order status history', error: error.message });
    }
};

// Get status history for an order
module.exports.getOrderStatusHistory = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.user.id;
        
        // Verify order exists and user has access
        const order = await Order.findOne({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Only admin or order owner can see status history
        if (req.user.role !== 'admin' && order.user_id !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const statusHistory = await OrderStatusHistory.findAll({
            where: { order_id: orderId },
            order: [['updated_at', 'DESC']]
        });
        
        res.json({ statusHistory });
    } catch (error) {
        logger.error('Error getting order status history:', error);
        res.status(500).json({ message: 'Failed to get order status history', error: error.message });
    }
};

// Add a new status entry (admin only)
module.exports.addOrderStatusEntry = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const orderId = req.params.orderId;
        const { status, notes } = req.body;
        const userId = req.user.id;
        
        if (!status) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Status is required' });
        }
        
        // Only admin can add status entries
        if (req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Only admin can add status entries' });
        }
        
        // Verify order exists
        const order = await Order.findByPk(orderId, { transaction });
        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Add new status entry
        const statusEntry = await OrderStatusHistory.create({
            order_id: orderId,
            status,
            updated_by: userId,
            notes: notes || null
        }, { transaction });
        
        // Update order status
        order.status = status;
        await order.save({ transaction });
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Status entry added successfully',
            statusEntry
        });
    } catch (error) {
        await transaction.rollback();
        logger.error('Error adding status entry:', error);
        res.status(500).json({ message: 'Failed to add status entry', error: error.message });
    }
}; 