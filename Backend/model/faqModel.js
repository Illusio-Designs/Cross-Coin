const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * FAQ entries. One row = one Q&A pair.
 * Attached to either:
 *   - the whole site                  (attached_to_type='global', attached_to_id=null)
 *   - a specific product              ('product',  product_id)
 *   - a specific category             ('category', category_id)
 *   - a specific static page          ('page',     page_name as string in attached_to_slug)
 *
 * The answer can hold HTML written by the admin in a rich-text editor
 * (ReactQuill on the dashboard); the frontend renders it via
 * dangerouslySetInnerHTML inside a sanitised wrapper.
 */
const Faq = sequelize.define('Faq', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  attached_to_type: {
    type: DataTypes.ENUM('global', 'product', 'category', 'page'),
    allowNull: false,
    defaultValue: 'global',
  },
  // Numeric foreign-key style attachment (product_id / category_id).
  // Stays null for global and page-string attachments.
  attached_to_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // String-style attachment for static pages keyed by page_name.
  attached_to_slug: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  question: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  // Stored as HTML (rich-text editor output) or plain text.
  answer: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'faqs',
  timestamps: true,
  underscored: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  indexes: [
    { fields: ['brand_id', 'attached_to_type', 'is_active', 'display_order'], name: 'idx_faq_lookup' },
    { fields: ['attached_to_type', 'attached_to_id'], name: 'idx_faq_attach_id' },
    { fields: ['attached_to_type', 'attached_to_slug'], name: 'idx_faq_attach_slug' },
  ],
});

module.exports = { Faq };
