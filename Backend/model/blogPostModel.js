const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogPost = sequelize.define('BlogPost', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(500), allowNull: false },
  slug: { type: DataTypes.STRING(500), allowNull: false },
  author_name: { type: DataTypes.STRING(255), allowNull: true },
  hero_image: { type: DataTypes.STRING(1000), allowNull: true },
  sections: { type: DataTypes.JSON, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'published', 'archived'), defaultValue: 'draft' },
  published_at: { type: DataTypes.DATE, allowNull: true },
  blog_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'blog_categories', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'blog_posts',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  indexes: [
    { unique: true, fields: ['slug'] },
    { fields: ['status'] },
    { fields: ['blog_category_id'] },
    { fields: ['published_at'] }
  ]
});

module.exports = { BlogPost };
