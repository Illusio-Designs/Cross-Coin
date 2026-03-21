const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogTag = sequelize.define('BlogTag', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'blog_tags',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  indexes: [
    { unique: true, fields: ['name'] },
    { unique: true, fields: ['slug'] }
  ]
});

module.exports = { BlogTag };
