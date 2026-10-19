const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { encrypt, decrypt, isEncrypted, phoneHash } = require('../utils/encryption.js');

// Abandoned-cart capture. Written the moment a shopper reaches checkout with
// their phone + items (guest OR logged-in, COD OR prepaid). An hourly cron
// messages the ones that didn't convert within the delay window. The phone is
// PII, so it is encrypted at rest (same scheme as guest_users) with a keyed
// phone_hash for dedupe/lookup. One row per (phone, brand): re-entering details
// re-arms the same row rather than piling up duplicates.
const AbandonedCart = sequelize.define('AbandonedCart', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brandId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'brand_id' },
  userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
  phone: {
    type: DataTypes.STRING(500),
    allowNull: true,
    get() { return decrypt(this.getDataValue('phone')); },
    set(value) {
      if (value === null || value === undefined) { this.setDataValue('phone', value); return; }
      const str = String(value);
      this.setDataValue('phone', isEncrypted(str) ? str : encrypt(str));
    },
  },
  phoneHashValue: { type: DataTypes.STRING(64), allowNull: true, field: 'phone_hash' },
  customerName: { type: DataTypes.STRING(120), allowNull: true, field: 'customer_name' },
  cartSummary: { type: DataTypes.STRING(255), allowNull: true, field: 'cart_summary' },
  itemCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'item_count' },
  cartValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: 'cart_value' },
  // pending  = captured, not yet converted or messaged
  // recovered = the shopper completed an order (never message)
  // messaged  = recovery WhatsApp already sent
  status: { type: DataTypes.ENUM('pending', 'recovered', 'messaged'), allowNull: false, defaultValue: 'pending' },
  waSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'wa_sent' },
  // Line items the shopper had ({ productId, variationId, quantity, ... } — see
  // services/cartRecoveryService.js), so the WhatsApp "Complete Order" link can
  // rebuild the cart on ANY device (the in-app browser has no localStorage cart).
  // Stored as JSON text; ids/quantities only — no personal data.
  items: {
    type: DataTypes.TEXT('medium'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('items');
      if (!raw) return [];
      try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch (_) { return []; }
    },
    set(value) {
      this.setDataValue('items', Array.isArray(value) && value.length ? JSON.stringify(value) : null);
    },
  },
  // Unguessable, URL-safe token carried by the WhatsApp button
  // (/api/cart-recover/<token>) — never the sequential id.
  recoverToken: { type: DataTypes.STRING(64), allowNull: true, field: 'recover_token' },
}, {
  tableName: 'abandoned_carts',
  timestamps: true,
  underscored: true, // createdAt/updatedAt attributes map to created_at/updated_at columns
  hooks: {
    beforeSave(instance) {
      if (instance.changed('phone')) {
        instance.setDataValue('phoneHashValue', phoneHash(instance.phone));
      }
    },
  },
  indexes: [
    { fields: ['phone_hash', 'brand_id'] },
    { fields: ['status', 'updated_at'] },
    { fields: ['brand_id'] },
    { unique: true, fields: ['recover_token'] },
  ],
});

module.exports = { AbandonedCart };
