const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const ProductVariation = sequelize.define('ProductVariation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'idx_sku'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    comparePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    attributes: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'JSON object containing all variation attributes (size, color, etc.)'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    whatsapp_retailer_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: 'WhatsApp product_retailer_id in format "{productId}_{variationId}"'
    }
}, {
    tableName: 'product_variations',
    timestamps: true,
    indexes: [
        {
            name: 'idx_product_id',
            fields: ['productId']
        }
    ]
});

module.exports = { ProductVariation }; 