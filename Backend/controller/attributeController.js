const { Attribute, AttributeValue } = require('../model/associations.js');
const { sequelize } = require('../config/db.js');
const cacheManager = require('../services/cacheManager.js');
const { logger } = require('../config/logging.js');

// Get all attributes with their values
module.exports.getAllAttributes = async (req, res) => {
    try {
        const where = { status: 'active' };
        if (req.brand && req.brand.id) where.brand_id = req.brand.id;

        const attributes = await Attribute.findAll({
            include: [{
                model: AttributeValue,
                where: { status: 'active' },
                required: false
            }],
            where,
            order: [
                ['displayOrder', 'ASC'],
                [AttributeValue, 'displayOrder', 'ASC']
            ]
        });

        res.json(attributes);
    } catch (error) {
        logger.error('Error fetching attributes:', error);
        res.status(500).json({ message: 'Failed to fetch attributes', error: error.message });
    }
};

// Create a new attribute
module.exports.createAttribute = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { name, values } = req.body;

        // Create attribute
        const attribute = await Attribute.create({
            name,
            type: 'select',
            isRequired: false,
            displayOrder: 0,
            status: 'active',
            brand_id: req.brand ? req.brand.id : null
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
        logger.error('Error creating attribute:', error);
        res.status(500).json({ message: 'Failed to create attribute', error: error.message });
    }
};

// Update an attribute
module.exports.updateAttribute = async (req, res) => {
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
        logger.error('Error updating attribute:', error);
        res.status(500).json({ message: 'Failed to update attribute', error: error.message });
    }
};

// Delete an attribute
module.exports.deleteAttribute = async (req, res) => {
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
        logger.error('Error deleting attribute:', error);
        res.status(500).json({ message: 'Failed to delete attribute', error: error.message });
    }
};

// Add values to an attribute
module.exports.addAttributeValues = async (req, res) => {
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
        logger.error('Error adding attribute values:', error);
        res.status(500).json({ message: 'Failed to add attribute values', error: error.message });
    }
};

// Remove values from an attribute
module.exports.removeAttributeValues = async (req, res) => {
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
        logger.error('Error removing attribute values:', error);
        res.status(500).json({ message: 'Failed to remove attribute values', error: error.message });
    }
};

// Get attribute by ID
module.exports.getAttributeById = async (req, res) => {
    try {
        const { id } = req.params;
        const where = { id, status: 'active' };
        if (req.brand && req.brand.id) where.brand_id = req.brand.id;

        const attribute = await Attribute.findOne({
            include: [{
                model: AttributeValue,
                where: { status: 'active' },
                required: false
            }],
            where
        });

        if (!attribute) {
            return res.status(404).json({ message: 'Attribute not found' });
        }

        res.json(attribute);
    } catch (error) {
        logger.error('Error fetching attribute:', error);
        res.status(500).json({ message: 'Failed to fetch attribute', error: error.message });
    }
}; 

// Get mega menu data: all active attributes with active values and product counts
module.exports.getMegaMenu = async (req, res) => {
    try {
        const brandId = req.brandId || (req.brand && req.brand.id) || null;
        const cacheKey = `mega-menu:${brandId || 'all'}`;

        // Try cache first
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
            return res.json({ success: true, data: cached });
        }

        // Build attribute WHERE clause
        const attrWhere = { status: 'active' };
        if (brandId) attrWhere.brand_id = brandId;

        const attributes = await Attribute.findAll({
            include: [{
                model: AttributeValue,
                where: { status: 'active' },
                required: false
            }],
            where: attrWhere,
            order: [
                ['displayOrder', 'ASC'],
                [AttributeValue, 'displayOrder', 'ASC']
            ]
        });

        // For each attribute value, count active products that have a variation
        // with that attribute value in their attributes JSON
        const result = [];

        for (const attr of attributes) {
            const values = attr.AttributeValues || [];
            const valuesWithCount = [];

            for (const val of values) {
                const attrName = attr.name;
                const attrValue = val.value.replace(/'/g, "''");

                // Count active products with at least one variation matching this attribute value
                const [countRows] = await sequelize.query(
                    `SELECT COUNT(DISTINCT p.id) AS product_count
                     FROM products p
                     WHERE p.status = 'active'
                       AND EXISTS (
                           SELECT 1 FROM product_variations pv
                           WHERE pv.productId = p.id
                             AND pv.status = 'active'
                             AND JSON_EXTRACT(pv.attributes, '$.${attrName}') = '${attrValue}'
                       )`
                );

                const productCount = parseInt(countRows[0]?.product_count || 0, 10);
                if (productCount > 0) {
                    valuesWithCount.push({
                        id: val.id,
                        value: val.value,
                        product_count: productCount
                    });
                }
            }

            if (valuesWithCount.length > 0) {
                result.push({
                    id: attr.id,
                    name: attr.name,
                    values: valuesWithCount
                });
            }
        }

        // Cache for 30 minutes
        await cacheManager.set(cacheKey, result, 1800);

        res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error fetching mega menu:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch mega menu', error: error.message });
    }
};
