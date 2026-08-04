const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

// A browser Web-Push subscription (one row per device/browser that opted in).
const PushSubscription = sequelize.define('PushSubscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  endpoint: { type: DataTypes.TEXT, allowNull: false },
  p256dh: { type: DataTypes.STRING(255), allowNull: false },
  auth: { type: DataTypes.STRING(255), allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Staff user who subscribed' },
  // A short hash of the endpoint, used as the unique key (endpoints are too long
  // to index directly on MySQL utf8mb4).
  endpoint_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
}, { tableName: 'push_subscriptions', timestamps: true, charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

module.exports = { PushSubscription };
