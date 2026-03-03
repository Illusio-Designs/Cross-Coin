const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * ProductBrand - Junction table for many-to-many relationship
 * Allows products to be assigned to multiple brands
 */
const ProductBrand = sequelize.define('ProductBrand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'brands',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        comment: 'Status of product for this specific brand'
    },
    price_override: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Optional brand-specific price override'
    },
    stock_override: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Optional brand-specific stock override'
    }
}, {
    tableName: 'product_brands',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['product_id', 'brand_id']
        },
        {
            fields: ['brand_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = { ProductBrand };
