const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'draft'),
        defaultValue: 'draft'
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'categories',
            key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    },
    // Review-related fields
    avg_rating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        defaultValue: null
    },
    review_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    has_video_reviews: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    featured_review_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        constraints: false
        // Note: The reference to reviews table is defined in associations.js
        // to avoid circular dependencies
    },
    // Badge field
    badge: {
        type: DataTypes.ENUM('new_arrival', 'hot_selling', 'low_stock', 'none'),
        defaultValue: 'none'
    },
    // Badge calculation fields
    total_sold: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // Product-wide physical properties
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
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'products',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    indexes: [
        {
            unique: true,
            fields: ['slug']
        },
        {
            fields: ['categoryId']
        },
        {
            fields: ['badge']
        }
    ]
});

module.exports = { Product };