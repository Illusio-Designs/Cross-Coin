const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for guest users
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    guest_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for registered users
        references: {
            model: 'guest_users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    order_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'idx_order_number'
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    shipping_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    final_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_type: {
        type: DataTypes.ENUM('cod', 'credit_card', 'debit_card', 'upi', 'wallet'),
        allowNull: false
    },
    coupon_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'coupons',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    shiprocket_order_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shiprocket_shipment_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'orders',
    timestamps: true, // This will add createdAt and updatedAt fields
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    underscored: true,
    indexes: [
        { name: 'idx_user_id', fields: ['user_id'] },
        { name: 'idx_status', fields: ['status'] },
        { name: 'idx_payment_status', fields: ['payment_status'] }
    ]
});

module.exports = { Order };