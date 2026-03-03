const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Coupon = sequelize.define('Coupon', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('percentage', 'fixed', 'tiered', 'quantity_based'),
        allowNull: false
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    minPurchase: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    maxDiscount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    // New fields for advanced coupon types
    paymentModeRestriction: {
        type: DataTypes.ENUM('all', 'cod', 'prepaid'),
        defaultValue: 'all',
        comment: 'Restrict coupon to specific payment modes'
    },
    firstOrderOnly: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Coupon only valid for first orders'
    },
    tieredDiscounts: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of {minAmount, discount} for tiered discounts'
    },
    quantityBasedDiscounts: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of {minQuantity, discount} for quantity-based discounts'
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    perUserLimit: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'expired'),
        defaultValue: 'active'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    applicableCategories: {
        type: DataTypes.JSON,
        allowNull: true
    },
    applicableProducts: {
        type: DataTypes.JSON,
        allowNull: true
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
            model: 'brands',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
}, {
    timestamps: true,
    tableName: 'coupons'
});

module.exports = { Coupon }; 