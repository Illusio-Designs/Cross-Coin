const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * Pack / bundle tiers — one row per PRODUCT per pack size, e.g. for product 42:
 * "2 Pairs — ₹499", "3 Pairs — ₹699". The admin types the EXACT total price for
 * each pack; 1 pair is implicit (the product's own single-pair price). The
 * per-pair figure shown on the storefront is price / pairs. The backend
 * re-prices the pack server-side at order time from this exact figure, so the
 * client can never choose its own price.
 *
 * discount_percent is retained for the earlier brand-wide model and is unused
 * in the per-product flow.
 */
const BundleTier = sequelize.define('BundleTier', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  // The product this pack belongs to.
  product_id: { type: DataTypes.INTEGER, allowNull: true },
  // How many single pairs this pack bundles (2, 3, …).
  pairs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  // EXACT total price the shopper pays for the whole pack.
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  // Legacy brand-wide percentage model — unused in the per-product flow.
  discount_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  label: { type: DataTypes.STRING(80), allowNull: true },  // e.g. "2 Pairs"
  badge: { type: DataTypes.STRING(40), allowNull: true },  // e.g. "Most Popular"
  display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'bundle_tiers',
  timestamps: true,
  underscored: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  indexes: [
    { fields: ['brand_id', 'product_id', 'is_active', 'display_order'], name: 'idx_bundle_product' },
    { fields: ['product_id', 'pairs'], name: 'idx_bundle_product_pairs' },
  ],
});

module.exports = { BundleTier };
