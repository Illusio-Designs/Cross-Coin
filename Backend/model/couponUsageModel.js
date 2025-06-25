const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const CouponUsage = sequelize.define('CouponUsage', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    couponId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'coupons',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    usedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    tableName: 'coupon_usages',
    indexes: [
        {
            fields: ['couponId']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['orderId']
        }
    ]
});

module.exports = { CouponUsage }; 