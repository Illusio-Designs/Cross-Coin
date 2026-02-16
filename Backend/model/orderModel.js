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
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled', 'refund_pending'),
        defaultValue: 'pending'
    },
    status: {
        type: DataTypes.ENUM(
            'pending', 
            'processing', 
            'booked', 
            'pickup initiated', 
            'manifested', 
            'in transit', 
            'shipped', 
            'out for delivery', 
            'delivered', 
            'undelivered',
            'rto',
            'rto delivered',
            'cancelled', 
            'order cancelled', 
            'exception'
        ),
        defaultValue: 'pending'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // FShip integration fields
    fship_order_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fship_waybill: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fship_route_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fship_courier_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fship_label_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fship_label_downloaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    fship_label_downloaded_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    fship_label_downloaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    fship_tracking_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tracking_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    courier_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tracking_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    shipping_address_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'shipping_addresses',
            key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    },
    utm_tracking_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'utm_tracking',
            key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
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