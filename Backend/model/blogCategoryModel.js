const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogCategory = sequelize.define('BlogCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'blog_categories',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  indexes: [{ unique: true, fields: ['slug'] }]
});

module.exports = { BlogCategory };
