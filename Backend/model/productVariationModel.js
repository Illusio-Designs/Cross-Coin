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
    weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    weightUnit: {
        type: DataTypes.ENUM('g', 'kg', 'lb', 'oz'),
        allowNull: true
    },
    dimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'JSON object containing length, width, height'
    },
    dimensionUnit: {
        type: DataTypes.ENUM('cm', 'm', 'in', 'ft'),
        allowNull: true
    },
    attributes: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'JSON object containing all variation attributes (size, color, etc.)'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
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