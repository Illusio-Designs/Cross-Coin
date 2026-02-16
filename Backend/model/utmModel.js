const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UTMTracking = sequelize.define('UTMTracking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  guest_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'guest_users',
      key: 'id'
    }
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  utm_source: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_medium: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_campaign: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_term: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_content: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  landing_page: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  referrer: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'utm_tracking',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = UTMTracking;
