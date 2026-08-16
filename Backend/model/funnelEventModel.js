const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

// First-party funnel events (view_item / add_to_cart / begin_checkout), keyed
// to the same session_id cookie as utm_tracking so the Traffic & Conversion
// report can build a full per-brand funnel: visit → view → cart → checkout →
// purchase. Purchase/delivered/revenue come from the orders table, not here.
const FunnelEvent = sequelize.define('FunnelEvent', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: true },
  session_id: { type: DataTypes.STRING(255), allowNull: true },
  event: { type: DataTypes.STRING(32), allowNull: false }, // view_item | add_to_cart | begin_checkout
  value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
}, {
  tableName: 'funnel_events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { name: 'idx_fe_brand_event_created', fields: ['brand_id', 'event', 'created_at'] },
    { name: 'idx_fe_session', fields: ['session_id'] },
  ],
});

module.exports = FunnelEvent;
