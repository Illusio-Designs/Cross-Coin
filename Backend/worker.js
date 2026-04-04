'use strict';

/**
 * CrossCoin Background Worker
 * ───────────────────────────
 * Runs all scheduled jobs in a SEPARATE process from the API server.
 * Start with: node worker.js  (or  npm run worker)
 *
 * This keeps the main API server lean — no cron timers, no background
 * DB queries competing with request handling.
 */

require('dotenv').config();
const cron = require('node-cron');
const { sequelize } = require('./config/db.js');
const { logger } = require('./config/logging.js');

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`[Worker] ${signal} received — shutting down`);
  try { await sequelize.close(); } catch (_) {}
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => logger.error('[Worker] Uncaught:', err.message));
process.on('unhandledRejection', (err) => logger.error('[Worker] Unhandled rejection:', err));

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
  const orderController = require('./controller/orderController');
  let result = {};
  const mockReq = { user: { id: 'system', username: 'worker' }, query: { limit: 50 } };
  const mockRes = {
    json: (data) => { result = data.data || {}; },
    status: () => ({ json: (data) => { result = data; } }),
  };
  await orderController.syncOrdersWithFShip(mockReq, mockRes);
  return result;
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
  const { Cart }                  = require('./model/cartModel.js');
  const { CartItem }              = require('./model/cartItemModel.js');
  const { User }                  = require('./model/userModel.js');
  const { Order }                 = require('./model/orderModel.js');
  const { Product }               = require('./model/productModel.js');
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
async function start() {
  logger.info('[Worker] Connecting to database...');
  await sequelize.authenticate();
  logger.info('[Worker] ✓ Database connected');

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

  logger.info('[Worker] ✓ All jobs scheduled');
  logger.info('[Worker] Schedule:');
  logger.info('  FShip Sync       → every 2 hours');
  logger.info('  Loyalty Expiry   → daily 2 AM');
  logger.info('  Instagram        → every 6 hours');
  logger.info('  Abandoned Cart   → every hour');
  logger.info('  Review Request   → daily 10 AM');
  logger.info('  Win-back         → daily 11 AM');
  logger.info('  Upsell           → daily 3 PM');
}

start().catch((err) => {
  logger.error('[Worker] Failed to start:', err.message);
  process.exit(1);
});
