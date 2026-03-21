const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogBrand = sequelize.define('BlogBrand', {
  blog_post_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'blog_posts', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  brand_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'brands', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'blog_brands',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci'
});

module.exports = { BlogBrand };
