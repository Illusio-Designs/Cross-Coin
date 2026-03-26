const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const ShippingFee = sequelize.define('ShippingFee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderType: {
        type: DataTypes.ENUM('cod', 'prepaid'),
        allowNull: false
    },
    fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'brands', key: 'id' },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'shipping_fees',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    indexes: [
        { fields: ['orderType'] },
        { fields: ['brand_id'] },
        { unique: true, fields: ['orderType', 'brand_id'] }
    ]
});

module.exports = { ShippingFee }; 