/**
 * Backfill: turn guest-only orders into login-able consumer accounts.
 *
 * WHY: Storefront login is phone + OTP and resolves the customer by their
 * `users` row. Any order that was left with `user_id = NULL` and only a
 * `guest_user_id` (older guest / prepaid-guest flows) has no `users` row, so
 * that customer can log in but sees none of their orders — or, on very old data,
 * cannot be resolved at all. This script creates (or reuses) a consumer `User`
 * for each such order, brand-scoped to the order's brand, and relinks the order
 * and its shipping address to that user so the customer's history shows up the
 * moment they log in.
 *
 * It is IDEMPOTENT and SAFE to re-run: it only touches orders that still have
 * `user_id IS NULL AND guest_user_id IS NOT NULL`, and reuses an existing
 * per-brand user when one already matches the phone/email.
 *
 * Guest phone numbers are ENCRYPTED at rest, so this must run through the model
 * layer (which decrypts) — a raw SQL UPDATE cannot reconstruct the login phone.
 *
 * Run:  cd Backend && node scripts/backfill-guest-order-users.js
 *       cd Backend && node scripts/backfill-guest-order-users.js --dry   (report only)
 *
 * ── Diagnostic (run in phpMyAdmin to see how many orders are affected) ────────
 *   SELECT brand_id, COUNT(*) AS guest_only_orders
 *   FROM orders
 *   WHERE user_id IS NULL AND guest_user_id IS NOT NULL
 *   GROUP BY brand_id
 *   ORDER BY guest_only_orders DESC;
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
// CLI script → print straight to the console. The app's file logger suppresses
// `info` in production (MIN_LEVEL=warn), which would hide all progress/results.
const logger = { info: (...a) => console.log(...a), warn: (...a) => console.warn(...a), error: (...a) => console.error(...a) };
const { Order } = require('../model/orderModel.js');
const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { ShippingAddress } = require('../model/shippingAddressModel.js');

const DRY_RUN = process.argv.includes('--dry');

async function backfill() {
  const orders = await Order.findAll({
    where: { user_id: null, guest_user_id: { [Op.ne]: null } },
    order: [['id', 'ASC']],
  });

  logger.info(`[backfill-guest] ${orders.length} guest-only orders to process${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const stats = { linked: 0, createdUsers: 0, reusedUsers: 0, skipped: 0 };
  // Cache resolved users within this run so multiple orders from the same guest
  // on the same brand reuse one account.
  const cache = new Map(); // key: `${brandId}:${digits||email}` → userId

  for (const order of orders) {
    try {
      const brandId = order.brand_id || 1;
      const guest = await GuestUser.findByPk(order.guest_user_id);
      if (!guest) { stats.skipped++; continue; }

      const digits = String(guest.phone || '').replace(/\D/g, '').slice(-10);
      const email = String(guest.email || '').toLowerCase().trim();
      if (digits.length !== 10 && !email) { stats.skipped++; continue; }

      const cacheKey = `${brandId}:${digits || email}`;
      let user = null;

      if (cache.has(cacheKey)) {
        user = await User.findByPk(cache.get(cacheKey));
      }

      // Find an existing consumer for this brand by phone (primary) or email.
      if (!user && digits.length === 10) {
        user = await User.findOne({ where: { phone: digits, source_brand_id: brandId } });
      }
      if (!user && email) {
        user = await User.findOne({ where: { email, source_brand_id: brandId } });
      }

      if (user) {
        stats.reusedUsers++;
      } else {
        // Create the per-brand consumer. Email must be present & unique per brand;
        // fall back to a phone-based placeholder when the guest has no email.
        const nameParts = [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim();
        const displayName = nameParts || 'Guest';
        const finalEmail = email || `${digits}@phone.crosscoin.in`;

        if (DRY_RUN) {
          logger.info(`[backfill-guest] (dry) would create user for order ${order.order_number} brand ${brandId} phone ${digits || '—'} email ${finalEmail}`);
          stats.createdUsers++;
          stats.linked++;
          continue;
        }

        try {
          user = await User.create({
            username: `${displayName} (${digits || 'na'}·b${brandId})`,
            email: finalEmail,
            phone: digits.length === 10 ? digits : null,
            role: 'consumer',
            source_brand_id: brandId,
            password: crypto.randomBytes(16).toString('hex'),
          });
          stats.createdUsers++;
        } catch (createErr) {
          // Unique clash (e.g. duplicate username/email) → reuse any existing
          // match for this brand instead of failing the order.
          user = (digits.length === 10 && await User.findOne({ where: { phone: digits, source_brand_id: brandId } }))
              || (email && await User.findOne({ where: { email, source_brand_id: brandId } }));
          if (!user) {
            logger.warn(`[backfill-guest] order ${order.order_number}: could not create/find user (${createErr.message})`);
            stats.skipped++;
            continue;
          }
          stats.reusedUsers++;
        }
      }

      cache.set(cacheKey, user.id);

      if (!DRY_RUN) {
        await order.update({ user_id: user.id });
        await ShippingAddress.update(
          { user_id: user.id },
          { where: { guest_user_id: order.guest_user_id, user_id: null } }
        );
      }
      stats.linked++;
    } catch (err) {
      logger.error(`[backfill-guest] order ${order.id} failed: ${err.message}`);
      stats.skipped++;
    }
  }

  // Mark fully-converted guests (no remaining unlinked orders) as converted.
  if (!DRY_RUN) {
    await sequelize.query(
      `UPDATE guest_users g
       SET g.status = 'converted', g.converted_at = NOW()
       WHERE g.status = 'active'
         AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.guest_user_id = g.id AND o.user_id IS NULL)
         AND EXISTS (SELECT 1 FROM orders o2 WHERE o2.guest_user_id = g.id)`
    );
  }

  logger.info(`[backfill-guest] done: linked=${stats.linked} created=${stats.createdUsers} reused=${stats.reusedUsers} skipped=${stats.skipped}`);
  return stats;
}

if (require.main === module) {
  backfill()
    .then(() => process.exit(0))
    .catch((e) => { logger.error('[backfill-guest] fatal: ' + e.message); process.exit(1); });
}

module.exports = { backfill };
