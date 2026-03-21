const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogFeaturedProduct = sequelize.define('BlogFeaturedProduct', {
  blog_post_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'blog_posts', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'products', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  lifestyle_tag: { type: DataTypes.STRING(255), allowNull: true }
}, {
  tableName: 'blog_featured_products',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci'
});

module.exports = { BlogFeaturedProduct };
