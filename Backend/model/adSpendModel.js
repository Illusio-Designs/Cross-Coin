const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * ad_spends — one row per (brand, day). The ONLY manual input for Ads Reporting;
 * every other figure (orders, revenue, cancelled, RTO, prepaid/COD) is derived
 * from the orders table for the same brand + date range.
 */
const AdSpend = sequelize.define('AdSpend', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    brand_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, {
    tableName: 'ad_spends',
    timestamps: true,
    indexes: [{ unique: true, fields: ['brand_id', 'date'] }],
});

module.exports = AdSpend;
