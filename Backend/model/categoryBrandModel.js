const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * CategoryBrand - Junction table for many-to-many relationship
 * Allows categories to be assigned to multiple brands
 */
const CategoryBrand = sequelize.define('CategoryBrand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
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
        comment: 'Status of category for this specific brand'
    }
}, {
    tableName: 'category_brands',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['category_id', 'brand_id']
        },
        {
            fields: ['brand_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = { CategoryBrand };
