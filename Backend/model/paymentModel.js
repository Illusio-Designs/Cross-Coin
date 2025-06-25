const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    payment_type: {
        type: DataTypes.ENUM('cod', 'credit_card', 'debit_card', 'upi', 'wallet'),
        allowNull: false
    },
    transaction_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'successful', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    payment_gateway: {
        type: DataTypes.STRING,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['order_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = { Payment }; 