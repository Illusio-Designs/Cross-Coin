/**
 * DPDP data export (Right to Access / portability, S11). Gathers every piece
 * of personal data held about a shopper into one JSON structure they can
 * download. Read-only; resolves the person across the same identifiers the
 * erasure service uses (user id, deterministic phone hash, email, guest
 * links). Model getters transparently decrypt encrypted fields (addresses,
 * guest phone) as rows are serialised.
 */
const { Op } = require('sequelize');
const { phoneHash } = require('../utils/encryption.js');

const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { Order } = require('../model/orderModel.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { ShippingAddress } = require('../model/shippingAddressModel.js');
const { Wishlist } = require('../model/wishlistModel.js');
const { LoyaltyTransaction } = require('../model/loyaltyTransactionModel.js');
const { Review } = require('../model/reviewModel.js');
const { Return } = require('../model/returnModel.js');
const { Payment } = require('../model/paymentModel.js');
const { LeadCapture } = require('../model/leadCaptureModel.js');
const ContactMessage = require('../model/contactMessageModel.js');
const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

// Columns we never hand back, even in an export (credentials / internal
// payment-gateway signatures).
const stripOrder = (o) => {
  const j = o.toJSON ? o.toJSON() : o;
  return j;
};

/**
 * Build the export payload for a user.
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function buildExport(userId) {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password', 'refreshToken', 'refreshTokenExpiry', 'resetToken', 'resetTokenExpiry'] },
  });
  if (!user || user.deleted_at) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const realEmail = user.email || null;
  const realPhone = user.phone || null;
  const pHash = realPhone ? phoneHash(realPhone) : null;
  const digits10 = realPhone ? String(realPhone).replace(/\D/g, '').slice(-10) : null;
  const phoneVariants = digits10 ? [...new Set([digits10, '91' + digits10, '+91' + digits10])] : [];

  // Resolve guest identities (orders placed as a guest, then relinked).
  const guestIdSet = new Set();
  const userOrders = await Order.findAll({ where: { user_id: userId }, attributes: ['id', 'guest_user_id'] });
  userOrders.forEach((o) => { if (o.guest_user_id) guestIdSet.add(o.guest_user_id); });
  const guestWhere = [];
  if (realEmail) guestWhere.push({ email: realEmail });
  if (pHash) guestWhere.push({ phoneHashValue: pHash });
  if (guestWhere.length) {
    const guests = await GuestUser.findAll({ where: { [Op.or]: guestWhere }, attributes: ['id'] });
    guests.forEach((g) => guestIdSet.add(g.id));
  }
  const guestIds = [...guestIdSet];

  const orderWhere = guestIds.length
    ? { [Op.or]: [{ user_id: userId }, { guest_user_id: { [Op.in]: guestIds } }] }
    : { user_id: userId };

  const [orders, addresses, wishlist, loyalty, reviews, returns, payments, leads, contactMessages, whatsapp] =
    await Promise.all([
      Order.findAll({ where: orderWhere, include: [{ model: OrderItem, as: 'OrderItems', required: false }], order: [['createdAt', 'DESC']] }).catch(() => []),
      ShippingAddress.findAll({ where: guestIds.length ? { [Op.or]: [{ user_id: userId }, { guest_user_id: { [Op.in]: guestIds } }] } : { user_id: userId } }).catch(() => []),
      Wishlist.findAll({ where: { userId } }).catch(() => []),
      LoyaltyTransaction.findAll({ where: { user_id: userId }, order: [['createdAt', 'DESC']] }).catch(() => []),
      Review.findAll({ where: realEmail ? { [Op.or]: [{ userId }, { guestEmail: realEmail }] } : { userId } }).catch(() => []),
      Return.findAll({ where: { user_id: userId }, order: [['createdAt', 'DESC']] }).catch(() => []),
      Payment.findAll({
        where: guestIds.length ? { [Op.or]: [{ user_id: userId }, { guest_user_id: { [Op.in]: guestIds } }] } : { user_id: userId },
        attributes: { exclude: ['razorpay_signature'] },
      }).catch(() => []),
      phoneVariants.length ? LeadCapture.findAll({ where: { phone: { [Op.in]: phoneVariants } } }).catch(() => []) : [],
      (realEmail || phoneVariants.length)
        ? ContactMessage.findAll({
            where: { [Op.or]: [...(realEmail ? [{ email: realEmail }] : []), ...(phoneVariants.length ? [{ phone: { [Op.in]: phoneVariants } }] : [])] },
          }).catch(() => [])
        : [],
      phoneVariants.length ? WhatsappConversation.findAll({ where: { customer_phone: { [Op.in]: phoneVariants } } }).catch(() => []) : [],
    ]);

  return {
    export_meta: {
      generated_at: new Date().toISOString(),
      notice: 'This file contains the personal data held about your account under the Digital Personal Data Protection Act, 2023. Order and payment records are retained for tax compliance.',
      user_id: user.id,
    },
    profile: user.toJSON(),
    addresses: addresses.map((a) => a.toJSON()),
    orders: orders.map(stripOrder),
    payments: payments.map((p) => p.toJSON()),
    returns: returns.map((r) => r.toJSON()),
    reviews: reviews.map((r) => r.toJSON()),
    wishlist: wishlist.map((w) => w.toJSON()),
    loyalty_transactions: loyalty.map((l) => l.toJSON()),
    leads: leads.map((l) => l.toJSON()),
    contact_messages: contactMessages.map((c) => c.toJSON()),
    whatsapp_conversations: whatsapp.map((w) => w.toJSON()),
  };
}

module.exports = { buildExport };
