const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'brands', key: 'id' },
    onDelete: 'CASCADE'
  }
}, {
  timestamps: true,
  tableName: 'policies',
  indexes: [{ fields: ['brand_id'] }]
});

// Add sync method to ensure compatibility with setupDatabase.js
Policy.sync = Policy.sync || (async (options) => {
  return await sequelize.sync(options);
});

module.exports = { Policy }; 