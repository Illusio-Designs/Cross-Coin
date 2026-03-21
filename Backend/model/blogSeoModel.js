const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogSEO = sequelize.define('BlogSEO', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  blog_post_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'blog_posts', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  meta_title: { type: DataTypes.STRING(255), allowNull: true },
  meta_description: { type: DataTypes.TEXT, allowNull: true },
  meta_keywords: { type: DataTypes.STRING(500), allowNull: true },
  og_title: { type: DataTypes.STRING(255), allowNull: true },
  og_description: { type: DataTypes.TEXT, allowNull: true },
  og_image: { type: DataTypes.STRING(1000), allowNull: true },
  canonical_url: { type: DataTypes.STRING(1000), allowNull: true },
  structured_data: { type: DataTypes.JSON, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'blog_seo',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  indexes: [{ unique: true, fields: ['blog_post_id'] }]
});

module.exports = { BlogSEO };
