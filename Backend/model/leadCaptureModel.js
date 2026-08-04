const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const LeadCapture = sequelize.define('LeadCapture', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  coupon_code: { type: DataTypes.STRING(50), allowNull: true },
  source: { type: DataTypes.STRING(50), defaultValue: 'popup' },
  wa_sent: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'lead_captures',
  timestamps: true,
  indexes: [{ unique: true, fields: ['phone', 'brand_id'] }],
});

module.exports = { LeadCapture };
