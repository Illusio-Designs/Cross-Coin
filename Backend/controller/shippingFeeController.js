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

// Create or update shipping fee
export const createOrUpdateShippingFee = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { order_type, fee, weight_based_fee, location_based_fee } = req.body;
        
        if (!order_type || fee === undefined) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Order type and fee are required' });
        }
        
        // Check if this order type already exists
        const existingFee = await ShippingFee.findOne({
            where: { order_type },
            transaction
        });
        
        let shippingFee;
        if (existingFee) {
            // Update existing fee
            shippingFee = existingFee;
            shippingFee.fee = fee;
            shippingFee.weight_based_fee = weight_based_fee !== undefined ? weight_based_fee : shippingFee.weight_based_fee;
            shippingFee.location_based_fee = location_based_fee !== undefined ? location_based_fee : shippingFee.location_based_fee;
            await shippingFee.save({ transaction });
        } else {
            // Create new fee
            shippingFee = await ShippingFee.create({
                order_type,
                fee,
                weight_based_fee: weight_based_fee || 0,
                location_based_fee: location_based_fee || 0
            }, { transaction });
        }
        
        await transaction.commit();
        
        res.status(existingFee ? 200 : 201).json({
            message: `Shipping fee ${existingFee ? 'updated' : 'created'} successfully`,
            shippingFee
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating/updating shipping fee:', error);
        res.status(500).json({ message: 'Failed to create/update shipping fee', error: error.message });
    }
};

// Get shipping fee by order type
export const getShippingFeeByType = async (req, res) => {
    try {
        const orderType = req.params.type;
        
        const shippingFee = await ShippingFee.findOne({
            where: { order_type: orderType }
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