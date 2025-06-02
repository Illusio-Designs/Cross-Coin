import { OrderStatusHistory } from '../model/orderStatusHistoryModel.js';
import { Order } from '../model/orderModel.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

// Get status history for an order
export const getOrderStatusHistory = async (req, res) => {
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
        console.error('Error getting order status history:', error);
        res.status(500).json({ message: 'Failed to get order status history', error: error.message });
    }
};

// Add a new status entry (admin only)
export const addOrderStatusEntry = async (req, res) => {
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
        console.error('Error adding status entry:', error);
        res.status(500).json({ message: 'Failed to add status entry', error: error.message });
    }
}; 