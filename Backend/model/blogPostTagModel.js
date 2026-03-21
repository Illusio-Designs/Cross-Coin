const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BlogPostTag = sequelize.define('BlogPostTag', {
  blog_post_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'blog_posts', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  blog_tag_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'blog_tags', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'blog_post_tags',
  timestamps: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci'
});

module.exports = { BlogPostTag };
