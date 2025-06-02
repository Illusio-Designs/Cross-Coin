import { Attribute, AttributeValue } from '../model/associations.js';
import { sequelize } from '../config/db.js';

// Get all attributes with their values
export const getAllAttributes = async (req, res) => {
    try {
        const attributes = await Attribute.findAll({
            include: [{
                model: AttributeValue,
                where: { status: 'active' },
                required: false
            }],
            where: { status: 'active' },
            order: [
                ['displayOrder', 'ASC'],
                [AttributeValue, 'displayOrder', 'ASC']
            ]
        });

        res.json(attributes);
    } catch (error) {
        console.error('Error fetching attributes:', error);
        res.status(500).json({ message: 'Failed to fetch attributes', error: error.message });
    }
};

// Create a new attribute
export const createAttribute = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { name, values } = req.body;

        // Create attribute
        const attribute = await Attribute.create({
            name,
            type: 'select', // Default to select type since we're using values
            isRequired: false,
            displayOrder: 0,
            status: 'active'
        }, { transaction });

        // Create attribute values if provided
        if (values && values.length > 0) {
            const valuePromises = values.map((value, index) => 
                AttributeValue.create({
                    attributeId: attribute.id,
                    value: value.trim(),
                    displayOrder: index,
                    status: 'active'
                }, { transaction })
            );
            await Promise.all(valuePromises);
        }

        await transaction.commit();

        // Fetch the complete attribute with values
        const completeAttribute = await Attribute.findByPk(attribute.id, {
            include: [AttributeValue]
        });

        res.status(201).json({
            message: 'Attribute created successfully',
            attribute: completeAttribute
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating attribute:', error);
        res.status(500).json({ message: 'Failed to create attribute', error: error.message });
    }
};

// Update an attribute
export const updateAttribute = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { name, type, isRequired, displayOrder, values } = req.body;

        const attribute = await Attribute.findByPk(id, {
            include: [AttributeValue],
            transaction
        });

        if (!attribute) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Attribute not found' });
        }

        // Update attribute
        await attribute.update({
            name,
            type: type || attribute.type,
            isRequired: isRequired !== undefined ? isRequired : attribute.isRequired,
            displayOrder: displayOrder !== undefined ? displayOrder : attribute.displayOrder
        }, { transaction });

        // Update values if provided
        if (values) {
            // Delete existing values
            await AttributeValue.destroy({
                where: { attributeId: id },
                transaction
            });

            // Create new values
            const valuePromises = values.map((value, index) => 
                AttributeValue.create({
                    attributeId: id,
                    value: value,
                    displayOrder: index,
                    status: 'active'
                }, { transaction })
            );
            await Promise.all(valuePromises);
        }

        await transaction.commit();

        // Fetch updated attribute
        const updatedAttribute = await Attribute.findByPk(id, {
            include: [AttributeValue]
        });

        res.json({
            message: 'Attribute updated successfully',
            attribute: updatedAttribute
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating attribute:', error);
        res.status(500).json({ message: 'Failed to update attribute', error: error.message });
    }
};

// Delete an attribute
export const deleteAttribute = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;

        const attribute = await Attribute.findByPk(id, {
            include: [AttributeValue],
            transaction
        });

        if (!attribute) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Attribute not found' });
        }

        // Soft delete attribute and its values
        await attribute.update({ status: 'inactive' }, { transaction });
        await AttributeValue.update(
            { status: 'inactive' },
            { where: { attributeId: id }, transaction }
        );

        await transaction.commit();

        res.json({ message: 'Attribute deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting attribute:', error);
        res.status(500).json({ message: 'Failed to delete attribute', error: error.message });
    }
};

// Add values to an attribute
export const addAttributeValues = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { values } = req.body;

        const attribute = await Attribute.findByPk(id, { transaction });

        if (!attribute) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Attribute not found' });
        }

        // Get current highest display order
        const lastValue = await AttributeValue.findOne({
            where: { attributeId: id },
            order: [['displayOrder', 'DESC']],
            transaction
        });

        const startOrder = lastValue ? lastValue.displayOrder + 1 : 0;

        // Create new values
        const valuePromises = values.map((value, index) => 
            AttributeValue.create({
                attributeId: id,
                value: value,
                displayOrder: startOrder + index,
                status: 'active'
            }, { transaction })
        );
        await Promise.all(valuePromises);

        await transaction.commit();

        // Fetch updated attribute with all values
        const updatedAttribute = await Attribute.findByPk(id, {
            include: [AttributeValue]
        });

        res.json({
            message: 'Values added successfully',
            attribute: updatedAttribute
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error adding attribute values:', error);
        res.status(500).json({ message: 'Failed to add attribute values', error: error.message });
    }
};

// Remove values from an attribute
export const removeAttributeValues = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { valueIds } = req.body;

        const attribute = await Attribute.findByPk(id, { transaction });

        if (!attribute) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Attribute not found' });
        }

        // Soft delete specified values
        await AttributeValue.update(
            { status: 'inactive' },
            { 
                where: { 
                    id: valueIds,
                    attributeId: id 
                },
                transaction 
            }
        );

        await transaction.commit();

        // Fetch updated attribute with remaining values
        const updatedAttribute = await Attribute.findByPk(id, {
            include: [AttributeValue]
        });

        res.json({
            message: 'Values removed successfully',
            attribute: updatedAttribute
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error removing attribute values:', error);
        res.status(500).json({ message: 'Failed to remove attribute values', error: error.message });
    }
}; 