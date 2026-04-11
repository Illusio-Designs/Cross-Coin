const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const OrderShipment = sequelize.define('OrderShipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'orders', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  // ── Provider info ───────────────────────────────────────────────────────
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'fship',
    comment: 'Shipping provider: fship, iThink, delhivery, etc.',
  },
  provider_order_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Order ID on the shipping provider (e.g. FShip apiorderid)',
  },
  // ── AWB / Tracking ─────────────────────────────────────────────────────
  waybill: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tracking_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  route_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // ── Courier ────────────────────────────────────────────────────────────
  courier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  courier_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // ── Label ──────────────────────────────────────────────────────────────
  label_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  label_downloaded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  label_downloaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  label_downloaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  },
  // ── Sync state ─────────────────────────────────────────────────────────
  sync_status: {
    type: DataTypes.ENUM('pending', 'syncing', 'synced', 'failed'),
    defaultValue: 'pending',
  },
  sync_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  sync_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_synced_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'order_shipments',
  timestamps: true,
  underscored: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  indexes: [
    { name: 'idx_shipment_order_id', fields: ['order_id'], unique: true },
    { name: 'idx_shipment_waybill', fields: ['waybill'] },
    { name: 'idx_shipment_provider', fields: ['provider'] },
    { name: 'idx_shipment_sync_status', fields: ['sync_status'] },
  ],
});

module.exports = { OrderShipment };
