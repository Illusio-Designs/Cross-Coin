const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Cookieless, anonymous pageview counter.
//
// This table holds ONLY aggregate counts — one row per (brand, day, channel) —
// and NO personal data: no IP, no user-agent, no session id, no referrer string.
// Because nothing here identifies a person, the storefront may increment it for
// EVERY visitor without cookie consent (DPDP-safe), which is what lets the
// traffic report show real visit volume next to the consented, cookie-based
// utm_tracking funnel.
const PageHit = sequelize.define('PageHit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: true },
  // Business-day (IST) the hits fall on — keyed as DATEONLY so a day is one row.
  day: { type: DataTypes.DATEONLY, allowNull: false },
  // Shopify-style channel bucket (Direct / Facebook / … / Referral).
  channel: { type: DataTypes.STRING(32), allowNull: false },
  count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'page_hits',
  timestamps: false,
  indexes: [
    // One row per brand/day/channel — the unique key the upsert increments on.
    { unique: true, name: 'uniq_brand_day_channel', fields: ['brand_id', 'day', 'channel'] },
  ],
});

module.exports = PageHit;
