const { ShippingAddress } = require('../model/shippingAddressModel.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');

// Create a new shipping address
module.exports.createShippingAddress = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { address, city, state, postal_code, country, phone_number, is_default } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!address || !city || !state || !postal_code || !country || !phone_number) {
            await transaction.rollback();
            return res.status(400).json({ message: 'All fields are required' });
        }

        // If setting as default, unset any existing default address
        if (is_default) {
            await ShippingAddress.update(
                { is_default: false },
                { 
                    where: { 
                        user_id: userId,
                        is_default: true
                    },
                    transaction
                }
            );
        }

        // Check if this is the first address for the user
        const addressCount = await ShippingAddress.count({ 
            where: { user_id: userId },
            transaction
        });

        // If it's the first address, set it as default regardless of input
        const makeDefault = addressCount === 0 ? true : (is_default || false);

        // Create the shipping address
        const shippingAddress = await ShippingAddress.create({
            user_id: userId,
            address,
            city,
            state,
            postal_code,
            country,
            phone_number,
            is_default: makeDefault
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Shipping address created successfully',
            shippingAddress
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating shipping address:', error);
        res.status(500).json({ message: 'Failed to create shipping address', error: error.message });
    }
};

// Get all shipping addresses for a user
module.exports.getUserShippingAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        const shippingAddresses = await ShippingAddress.findAll({
            where: { user_id: userId },
            order: [
                ['is_default', 'DESC'], // Default address first
                ['createdAt', 'DESC']   // Then newest first
            ]
        });

        res.json({ shippingAddresses });
    } catch (error) {
        console.error('Error getting shipping addresses:', error);
        res.status(500).json({ message: 'Failed to get shipping addresses', error: error.message });
    }
};

// Get a shipping address by ID
module.exports.getShippingAddressById = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.id;

        const shippingAddress = await ShippingAddress.findOne({
            where: {
                id: addressId,
                user_id: userId
            }
        });

        if (!shippingAddress) {
            return res.status(404).json({ message: 'Shipping address not found' });
        }

        res.json({ shippingAddress });
    } catch (error) {
        console.error('Error getting shipping address:', error);
        res.status(500).json({ message: 'Failed to get shipping address', error: error.message });
    }
};

// Update a shipping address
module.exports.updateShippingAddress = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const addressId = req.params.id;
        const userId = req.user.id;
        const { address, city, state, postal_code, country, phone_number, is_default } = req.body;

        // Find the address to update
        const shippingAddress = await ShippingAddress.findOne({
            where: {
                id: addressId,
                user_id: userId
            },
            transaction
        });

        if (!shippingAddress) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipping address not found' });
        }

        // If setting as default, unset any existing default address
        if (is_default) {
            await ShippingAddress.update(
                { is_default: false },
                { 
                    where: { 
                        user_id: userId,
                        is_default: true,
                        id: { [Op.ne]: addressId } // Don't update the current one
                    },
                    transaction
                }
            );
        }

        // Update the address
        await shippingAddress.update({
            address: address || shippingAddress.address,
            city: city || shippingAddress.city,
            state: state || shippingAddress.state,
            postal_code: postal_code || shippingAddress.postal_code,
            country: country || shippingAddress.country,
            phone_number: phone_number || shippingAddress.phone_number,
            is_default: is_default !== undefined ? is_default : shippingAddress.is_default
        }, { transaction });

        await transaction.commit();

        // Fetch the updated address
        const updatedAddress = await ShippingAddress.findByPk(addressId);

        res.json({
            message: 'Shipping address updated successfully',
            shippingAddress: updatedAddress
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating shipping address:', error);
        res.status(500).json({ message: 'Failed to update shipping address', error: error.message });
    }
};

// Delete a shipping address
module.exports.deleteShippingAddress = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const addressId = req.params.id;
        const userId = req.user.id;

        // Find the address to delete
        const shippingAddress = await ShippingAddress.findOne({
            where: {
                id: addressId,
                user_id: userId
            },
            transaction
        });

        if (!shippingAddress) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipping address not found' });
        }

        // Check if this was the default address
        const wasDefault = shippingAddress.is_default;

        // Delete the address
        await shippingAddress.destroy({ transaction });

        // If the deleted address was the default, set a new default
        if (wasDefault) {
            const anotherAddress = await ShippingAddress.findOne({
                where: { user_id: userId },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (anotherAddress) {
                anotherAddress.is_default = true;
                await anotherAddress.save({ transaction });
            }
        }

        await transaction.commit();

        res.json({ message: 'Shipping address deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting shipping address:', error);
        res.status(500).json({ message: 'Failed to delete shipping address', error: error.message });
    }
};

// Set a shipping address as default
module.exports.setDefaultShippingAddress = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const addressId = req.params.id;
        const userId = req.user.id;

        // Verify the address exists and belongs to user
        const shippingAddress = await ShippingAddress.findOne({
            where: {
                id: addressId,
                user_id: userId
            },
            transaction
        });

        if (!shippingAddress) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Shipping address not found' });
        }

        // Unset any existing default address
        await ShippingAddress.update(
            { is_default: false },
            { 
                where: { 
                    user_id: userId,
                    is_default: true
                },
                transaction
            }
        );

        // Set this address as default
        shippingAddress.is_default = true;
        await shippingAddress.save({ transaction });

        await transaction.commit();

        res.json({
            message: 'Default shipping address updated successfully',
            shippingAddress
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error setting default shipping address:', error);
        res.status(500).json({ message: 'Failed to set default shipping address', error: error.message });
    }
}; 