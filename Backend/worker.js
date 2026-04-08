'use strict';

/**
 * CrossCoin Background Worker — Cron Jobs
 * Can run in-process (via initCronJobs) or standalone (node worker.js)
 */

const cron = require('node-cron');

// ─── Job runner — wraps each job with timing + error isolation ────────────────
async function run(name, fn) {
  const start = Date.now();
  logger.info(`[Worker] ▶ ${name}`);
  try {
    const result = await fn();
    logger.info(`[Worker] ✓ ${name} (${Date.now() - start}ms)`, result || '');
  } catch (err) {
    logger.error(`[Worker] ✗ ${name}: ${err.message}`);
  }
}

// ─── Job definitions ──────────────────────────────────────────────────────────

async function jobFshipSync() {
  // Only sync orders that are confirmed but not yet sent to FShip
  const { Order } = require('./model/orderModel.js');
  const { Op } = require('sequelize');
  const orderService = require('./services/orderService.js');

  const pendingOrders = await Order.findAll({
    where: {
      status: 'confirmed',
      fship_sync_status: { [Op.in]: ['pending', 'failed'] },
      fship_sync_attempts: { [Op.lt]: 3 }, // max 3 retries
    },
    limit: 50,
  });

  let synced = 0, failed = 0;
  for (const order of pendingOrders) {
    try {
      await orderService.syncOrderToFShip(order);
      synced++;
    } catch (e) {
      failed++;
    }
  }
  return { synced, failed, total: pendingOrders.length };
}

async function jobLoyaltyExpiry() {
  const loyaltyService = require('./services/loyaltyService');
  return loyaltyService.expirePoints();
}

async function jobInstagramRefresh() {
  const instagramService = require('./services/instagramService');
  await instagramService.refreshAccessTokenIfNeeded(1);
  const result = await instagramService.refreshFeed(1);
  return { count: Array.isArray(result.data) ? result.data.length : 0 };
}

async function jobAbandonedCart() {
  // Load via associations to ensure Cart.hasMany(CartItem) is registered
  const { Cart, CartItem, User, Order, Product } = require('./model/associations.js');
  const { Op }                    = require('sequelize');
  const whatsappService           = require('./services/whatsappService.js');
  const { WhatsappConversation }  = require('./model/whatsappConversationModel.js');

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const carts = await Cart.findAll({
    where: { status: 'active', updatedAt: { [Op.between]: [oneDayAgo, oneHourAgo] } },
    include: [
      { model: CartItem, as: 'CartItems', required: true, include: [{ model: Product }] },
      { model: User, attributes: ['id', 'username', 'phone'] },
    ],
  });

  let sent = 0;
  for (const cart of carts) {
    const user = cart.User;
    if (!user?.phone) continue;
    const recentOrder = await Order.findOne({ where: { user_id: user.id, createdAt: { [Op.gte]: cart.updatedAt } } });
    if (recentOrder) continue;
    const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${user.phone.slice(-10)}` }, brand_id: 1 } });
    if (conv?.opted_out) continue;
    const firstItem = cart.CartItems[0];
    const productName = (firstItem?.Product?.name || 'your items') + (cart.CartItems.length > 1 ? ` (+${cart.CartItems.length - 1} more)` : '');
    try {
      await whatsappService.sendAbandonedCart(user.phone, { customerName: user.username, productName, couponCode: 'SAVE10' }, 1);
      sent++;
    } catch (_) {}
  }
  return { sent };
}

async function jobReviewRequest() {
  const { Order }                 = require('./model/orderModel.js');
  const { OrderItem }             = require('./model/orderItemModel.js');
  const { Product }               = require('./model/productModel.js');
  const { User }                  = require('./model/userModel.js');
  const { ShippingAddress }       = require('./model/shippingAddressModel.js');
  const { Review }                = require('./model/reviewModel.js');
  const { Op }                    = require('sequelize');
  const whatsappService           = require('./services/whatsappService.js');
  const { WhatsappConversation }  = require('./model/whatsappConversationModel.js');

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAgo  = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  const orders = await Order.findAll({
    where: { status: 'delivered', updatedAt: { [Op.between]: [fourDaysAgo, threeDaysAgo] }, user_id: { [Op.ne]: null } },
    include: [
      { model: User, attributes: ['id', 'username', 'phone'] },
      { model: ShippingAddress, as: 'ShippingAddress', attributes: ['phone'] },
      { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] }] },
    ],
  });

  let sent = 0;
  for (const order of orders) {
    const phone = order.User?.phone || order.ShippingAddress?.phone;
    if (!phone) continue;
    const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${phone.slice(-10)}` }, brand_id: order.brand_id || 1 } });
    if (conv?.opted_out) continue;
    const productIds = order.OrderItems.map(i => i.product_id);
    const existing = await Review.findOne({ where: { userId: order.user_id, productId: { [Op.in]: productIds } } });
    if (existing) continue;
    const product = order.OrderItems[0]?.Product;
    if (!product) continue;
    try {
      await whatsappService.sendReviewRequest(phone, { customerName: order.User?.username, productName: product.name, productSlug: product.slug }, order.brand_id || 1);
      sent++;
    } catch (_) {}
  }
  return { sent };
}

async function jobWinBack() {
  const { Order }                 = require('./model/orderModel.js');
  const { User }                  = require('./model/userModel.js');
  const { Op }                    = require('sequelize');
  const whatsappService           = require('./services/whatsappService.js');
  const { WhatsappConversation }  = require('./model/whatsappConversationModel.js');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const activeIds = (await Order.findAll({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } }, attributes: ['user_id'], raw: true }))
    .map(o => o.user_id).filter(Boolean);

  const inactive = await Order.findAll({
    where: { user_id: { [Op.notIn]: activeIds.length ? activeIds : [0] }, createdAt: { [Op.between]: [sixtyDaysAgo, thirtyDaysAgo] }, status: 'delivered' },
    attributes: ['user_id'], group: ['user_id'], raw: true,
  });

  let sent = 0;
  for (const row of inactive) {
    if (!row.user_id) continue;
    const user = await User.findByPk(row.user_id, { attributes: ['id', 'username', 'phone'] });
    if (!user?.phone) continue;
    const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${user.phone.slice(-10)}` }, brand_id: 1 } });
    if (conv?.opted_out) continue;
    try {
      await whatsappService.sendWinBack(user.phone, { customerName: user.username, couponCode: 'COMEBACK10' }, 1);
      sent++;
    } catch (_) {}
  }
  return { sent };
}

async function jobUpsell() {
  const { Order }                 = require('./model/orderModel.js');
  const { OrderItem }             = require('./model/orderItemModel.js');
  const { Product }               = require('./model/productModel.js');
  const { User }                  = require('./model/userModel.js');
  const { Op }                    = require('sequelize');
  const whatsappService           = require('./services/whatsappService.js');
  const { WhatsappConversation }  = require('./model/whatsappConversationModel.js');

  const oneDayAgo  = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const orders = await Order.findAll({
    where: { status: 'delivered', updatedAt: { [Op.between]: [twoDaysAgo, oneDayAgo] }, user_id: { [Op.ne]: null } },
    include: [
      { model: User, attributes: ['id', 'username', 'phone'] },
      { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] }] },
    ],
  });

  let sent = 0;
  for (const order of orders) {
    const phone = order.User?.phone;
    if (!phone) continue;
    const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${phone.slice(-10)}` }, brand_id: order.brand_id || 1 } });
    if (conv?.opted_out) continue;
    const purchased = order.OrderItems[0]?.Product;
    if (!purchased) continue;
    const suggested = await Product.findOne({ where: { id: { [Op.ne]: purchased.id }, status: 'active' }, order: [['createdAt', 'DESC']] });
    if (!suggested) continue;
    try {
      await whatsappService.sendPostPurchaseUpsell(phone, { customerName: order.User?.username, purchasedProduct: purchased.name, suggestedProduct: suggested.name, suggestedSlug: suggested.slug }, order.brand_id || 1);
      sent++;
    } catch (_) {}
  }
  return { sent };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function initCronJobs() {
  // FShip sync — every 2 hours
  cron.schedule('0 */2 * * *', () => run('FShip Sync', jobFshipSync));

  // Loyalty expiry — daily 2 AM
  cron.schedule('0 2 * * *', () => run('Loyalty Expiry', jobLoyaltyExpiry));

  // Instagram refresh — every 6 hours
  cron.schedule('0 */6 * * *', () => run('Instagram Refresh', jobInstagramRefresh));

  // Abandoned cart — every hour
  cron.schedule('0 * * * *', () => run('Abandoned Cart', jobAbandonedCart));

  // Review request — daily 10 AM
  cron.schedule('0 10 * * *', () => run('Review Request', jobReviewRequest));

  // Win-back — daily 11 AM
  cron.schedule('0 11 * * *', () => run('Win-back', jobWinBack));

  // Post-purchase upsell — daily 3 PM
  cron.schedule('0 15 * * *', () => run('Upsell', jobUpsell));

  logger.info('[Worker] ✓ All cron jobs scheduled in-process');
}

// Support both: require('./worker.js').initCronJobs() and standalone `node worker.js`
if (require.main === module) {
  // Running standalone
  sequelize.authenticate()
    .then(() => { logger.info('[Worker] DB connected'); initCronJobs(); })
    .catch(err => { logger.error('[Worker] Failed:', err.message); process.exit(1); });
}

module.exports = { initCronJobs };
