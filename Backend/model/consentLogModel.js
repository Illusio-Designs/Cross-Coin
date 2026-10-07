const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

// DPDP consent record (S6 — consent must be recorded, and withdrawal as easy
// as giving it). Append-only: every change from the cookie banner, the
// customise panel, or a withdrawal writes a NEW row, so the full history of a
// visitor's consent is preserved. Keyed by user_id when logged in, else by the
// shared session_id cookie (the same one UTM tracking uses).
const ConsentLog = sequelize.define('ConsentLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  session_id: { type: DataTypes.STRING(255), allowNull: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: true },
  essential: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  analytics: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  marketing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // accept_all | reject | custom | withdraw | update
  action: { type: DataTypes.STRING(24), allowNull: true },
  // banner | settings | age_gate
  source: { type: DataTypes.STRING(24), allowNull: true },
  notice_version: { type: DataTypes.STRING(40), allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  user_agent: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'consent_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [
    { name: 'idx_consent_user', fields: ['user_id'] },
    { name: 'idx_consent_session', fields: ['session_id'] },
    { name: 'idx_consent_brand_created', fields: ['brand_id', 'created_at'] },
  ],
});

module.exports = { ConsentLog };
