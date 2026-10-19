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

