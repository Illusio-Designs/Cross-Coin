const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * Pack / bundle tiers, one set per brand. Each row is one "buy more" option,
 * e.g. "2 Pairs — 15% off". The storefront computes a pack's price from the
 * product's OWN single-pair price:
 *     pack price = pairs × pair_price × (1 − discount_percent/100)
 * so the same tiers apply to every product automatically and never go stale
 * when a product's price changes. The backend recomputes this server-side at
 * add-to-cart time, so the client can't choose its own price.
 */
const BundleTier = sequelize.define('BundleTier', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  // How many single pairs this tier bundles.
  pairs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  // Percent off the straight multiple (pairs × pair_price). 0 = no discount.
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
    { fields: ['brand_id', 'is_active', 'display_order'], name: 'idx_bundle_lookup' },
    { fields: ['brand_id', 'pairs'], name: 'idx_bundle_brand_pairs' },
  ],
});

module.exports = { BundleTier };
