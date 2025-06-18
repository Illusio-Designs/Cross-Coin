import { ShippingFee } from '../model/shippingFeeModel.js';
import { sequelize } from '../config/db.js';

// Get all shipping fees
export const getAllShippingFees = async (req, res) => {
    try {
        const shippingFees = await ShippingFee.findAll();
        res.json({ shippingFees });
    } catch (error) {
        console.error('Error getting shipping fees:', error);
        res.status(500).json({ message: 'Failed to get shipping fees', error: error.message });
    }
};

// Create a new shipping fee
export const createShippingFee = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { orderType, fee } = req.body;
        
        if (!orderType || fee === undefined) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Order type and fee are required' });
        }
        
        // Check if this order type already exists to prevent duplicates for ENUM type
        const existingFee = await ShippingFee.findOne({
            where: { orderType },
            transaction
        });
        
        if (existingFee) {
            await transaction.rollback();
            return res.status(409).json({ message: 'Shipping fee for this order type already exists. Please update it instead.' });
        }
        
        // Create new fee
        const shippingFee = await ShippingFee.create({
            orderType,
            fee
        }, { transaction });
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Shipping fee created successfully',
            shippingFee
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating shipping fee:', error);
        res.status(500).json({ message: 'Failed to create shipping fee', error: error.message });
    }
};

// Update an existing shipping fee by ID
export const updateShippingFee = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { orderType, fee } = req.body;

        const shippingFee = await ShippingFee.findByPk(id, { transaction });

        if (!shippingFee) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipping fee not found' });
        }

        // Check for duplicate orderType if it's being changed to an already existing one
        if (orderType && orderType !== shippingFee.orderType) {
            const existingFeeWithNewType = await ShippingFee.findOne({
                where: { orderType },
                transaction
            });
            if (existingFeeWithNewType && existingFeeWithNewType.id !== shippingFee.id) {
                await transaction.rollback();
                return res.status(409).json({ message: 'Cannot change to an order type that already has a shipping fee.' });
            }
        }

        // Update existing fee
        await shippingFee.update({
            orderType: orderType || shippingFee.orderType,
            fee: fee !== undefined ? fee : shippingFee.fee
        }, { transaction });
        
        await transaction.commit();
        
        res.json({
            message: 'Shipping fee updated successfully',
            shippingFee
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating shipping fee:', error);
        res.status(500).json({ message: 'Failed to update shipping fee', error: error.message });
    }
};

// Get shipping fee by order type
export const getShippingFeeByType = async (req, res) => {
    try {
        const orderType = req.params.type;
        
        const shippingFee = await ShippingFee.findOne({
            where: { orderType }
        });
        
        if (!shippingFee) {
            return res.status(404).json({ message: 'Shipping fee not found for this order type' });
        }
        
        res.json({ shippingFee });
    } catch (error) {
        console.error('Error getting shipping fee:', error);
        res.status(500).json({ message: 'Failed to get shipping fee', error: error.message });
    }
};

// Delete shipping fee
export const deleteShippingFee = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const feeId = req.params.id;
        
        const shippingFee = await ShippingFee.findByPk(feeId, { transaction });
        if (!shippingFee) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipping fee not found' });
        }
        
        await shippingFee.destroy({ transaction });
        await transaction.commit();
        
        res.json({ message: 'Shipping fee deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting shipping fee:', error);
        res.status(500).json({ message: 'Failed to delete shipping fee', error: error.message });
    }
}; 