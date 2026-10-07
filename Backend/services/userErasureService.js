/**
 * DPDP erasure (Right to Erasure, S12). Removes a shopper's personal data
 * across every PII-bearing table in ONE transaction, reconciling the right to
 * erasure with the legal duty to retain financial records (GST / Companies
 * Act):
 *
 *   - ANONYMISE, keep the row:  orders, order_items, payments  (financial —
 *     left linked to the now-anonymised user tombstone), returns (refund PII
 *     stripped), reviews (rating + text kept, author stripped), guest_users
 *     (kept in place so the order cascade does NOT fire), coupon_usages.
 *   - HARD-DELETE:  shipping_addresses, carts (+items), wishlists,
 *     loyalty_transactions, utm_tracking, lead_captures, contact_messages,
 *     whatsapp_conversations (+messages).
 *
 * A person is resolved to every identifier they used: the user id, the
 * deterministic phone hash (matches encrypted guest / address rows), the
 * email, and any guest_user_id seen on their orders. Session-only rows
 * (funnel_events, anonymous utm_tracking) carry no identifier and cannot be
 * resolved here — the retention sweep clears those on a timer instead.
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { phoneHash } = require('../utils/encryption.js');

const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { Order } = require('../model/orderModel.js');
const { ShippingAddress } = require('../model/shippingAddressModel.js');
const { Cart } = require('../model/cartModel.js');
const { Wishlist } = require('../model/wishlistModel.js');
const { LoyaltyTransaction } = require('../model/loyaltyTransactionModel.js');
const { Review } = require('../model/reviewModel.js');
const { Return } = require('../model/returnModel.js');
const { CouponUsage } = require('../model/couponUsageModel.js');
const UTMTracking = require('../model/utmModel.js');
const { LeadCapture } = require('../model/leadCaptureModel.js');
const ContactMessage = require('../model/contactMessageModel.js');
const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

/**
 * Erase a consumer's personal data. Idempotent: an already-erased account
 * (phone already nulled) simply re-runs with no identifiers and is a no-op
 * beyond re-stamping the tombstone.
 *
 * @param {number} userId
 * @returns {Promise<{summary: object}>}
 */
async function eraseUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Capture the real identifiers BEFORE the row is scrubbed.
  const realEmail = user.email || null;
  const realPhone = user.phone || null;
  const pHash = realPhone ? phoneHash(realPhone) : null;

  // Phone appears in several shapes across tables (10-digit, 91-prefixed).
  const digits10 = realPhone ? String(realPhone).replace(/\D/g, '').slice(-10) : null;
  const phoneVariants = digits10
    ? [...new Set([digits10, '91' + digits10, '+91' + digits10])]
    : [];

  const summary = {};

  await sequelize.transaction(async (t) => {
    // Resolve every guest identity this person used.
    const guestIdSet = new Set();

    const userOrders = await Order.findAll({
      where: { user_id: userId },
      attributes: ['guest_user_id'],
      transaction: t,
    });
    userOrders.forEach((o) => { if (o.guest_user_id) guestIdSet.add(o.guest_user_id); });

    const guestWhere = [];
    if (realEmail) guestWhere.push({ email: realEmail });
    if (pHash) guestWhere.push({ phoneHashValue: pHash });
    if (guestWhere.length) {
      const guests = await GuestUser.findAll({
        where: { [Op.or]: guestWhere },
        attributes: ['id'],
        transaction: t,
      });
      guests.forEach((g) => guestIdSet.add(g.id));
    }
    const guestIds = [...guestIdSet];

    // ── HARD-DELETE ────────────────────────────────────────────────
    // Shipping addresses (name / phone / address). Orders keep a null
    // shipping_address_id (SET NULL), preserving the financial record.
    const addrWhere = [{ user_id: userId }];
    if (guestIds.length) addrWhere.push({ guest_user_id: { [Op.in]: guestIds } });
    summary.shipping_addresses = await ShippingAddress.destroy({
      where: { [Op.or]: addrWhere }, transaction: t,
    });

    summary.carts = await Cart.destroy({ where: { user_id: userId }, transaction: t });
    summary.wishlists = await Wishlist.destroy({ where: { userId }, transaction: t });
    summary.loyalty_transactions = await LoyaltyTransaction.destroy({
      where: { user_id: userId }, transaction: t,
    });

    const utmWhere = [{ user_id: userId }];
    if (guestIds.length) utmWhere.push({ guest_user_id: { [Op.in]: guestIds } });
    summary.utm_tracking = await UTMTracking.destroy({
      where: { [Op.or]: utmWhere }, transaction: t,
    });

    if (phoneVariants.length) {
      summary.lead_captures = await LeadCapture.destroy({
        where: { phone: { [Op.in]: phoneVariants } }, transaction: t,
      });
      summary.whatsapp_conversations = await WhatsappConversation.destroy({
        where: { customer_phone: { [Op.in]: phoneVariants } }, transaction: t,
      });
    }

    const contactOr = [];
    if (realEmail) contactOr.push({ email: realEmail });
    if (phoneVariants.length) contactOr.push({ phone: { [Op.in]: phoneVariants } });
    if (contactOr.length) {
      summary.contact_messages = await ContactMessage.destroy({
        where: { [Op.or]: contactOr }, transaction: t,
      });
    }

    // ── ANONYMISE, keep the row ────────────────────────────────────
    // Reviews: keep rating + text (other shoppers rely on them), strip author.
    const reviewOr = [{ userId }];
    if (realEmail) reviewOr.push({ guestEmail: realEmail });
    summary.reviews = (await Review.update(
      { userId: null, guestName: null, guestEmail: null },
      { where: { [Op.or]: reviewOr }, transaction: t },
    ))[0];

    // Returns: keep the refund record for audit, strip the payout PII.
    summary.returns = (await Return.update(
      { upi_id: null, payout_proof: null },
      { where: { user_id: userId }, transaction: t },
    ))[0];

    // Coupon usage: keep the record (limits / fraud), drop the person link.
    summary.coupon_usages = (await CouponUsage.update(
      { userId: null },
      { where: { userId }, transaction: t },
    ))[0];

    // Guest rows: anonymise IN PLACE. Destroying them would CASCADE to their
    // orders / payments, which must survive (anonymised) for GST.
    if (guestIds.length) {
      let n = 0;
      const guests = await GuestUser.findAll({ where: { id: { [Op.in]: guestIds } }, transaction: t });
      for (const g of guests) {
        g.email = `deleted_guest_${g.id}@deleted.invalid`;
        g.firstName = 'Deleted';
        g.lastName = 'User';
        g.phone = null;            // beforeSave hook recomputes phone_hash → null
        g.ipAddress = null;
        g.userAgent = null;
        g.guestData = null;
        g.status = 'erased';
        await g.save({ transaction: t });
        n += 1;
      }
      summary.guest_users = n;
    }

    // ── USER TOMBSTONE ─────────────────────────────────────────────
    const ts = Date.now();
    await user.update({
      deleted_at: new Date(),
      email: `deleted_${ts}@deleted.crosscoin.in`,
      phone: null,
      username: `deleted_${ts}`,
      password: null,
      refreshToken: null,
      refreshTokenExpiry: null,
      profileImage: null,
      loyalty_points: 0,
    }, { transaction: t });

    summary.user = 1;
  });

  logger.info(`DPDP erasure complete for user ${userId}: ${JSON.stringify(summary)}`);
  return { summary };
}

module.exports = { eraseUser };
