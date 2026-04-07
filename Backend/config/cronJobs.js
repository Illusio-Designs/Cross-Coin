const cron = require('node-cron');
const orderController = require('../controller/orderController');
const loyaltyService = require('../services/loyaltyService');
const instagramService = require('../services/instagramService');

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs...');

  // FShip Order Sync - Runs every 2 hours (reduced frequency)
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] FShip sync started at:', new Date().toISOString());
    try {
      const mockReq = { user: { id: 'system', username: 'cron_job' }, query: { limit: 50 } };
      const mockRes = {
        json: (data) => { console.log('✅ [CRON] FShip sync completed:', { total: data.data?.total, synced: data.data?.synced, updated: data.data?.updated, skipped: data.data?.skipped, errors: data.data?.errors }); },
        status: (code) => ({ json: (data) => { console.error('❌ [CRON] FShip sync failed:', data); } })
      };
      await orderController.syncOrdersWithFShip(mockReq, mockRes);
    } catch (error) {
      console.error('❌ [CRON] FShip sync error:', error.message);
    }
  });

  // Loyalty points expiry - daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ [CRON] Loyalty expiry started at:', new Date().toISOString());
    try {
      const result = await loyaltyService.expirePoints();
      console.log('✅ [CRON] Loyalty expiry completed:', result);
    } catch (error) {
      console.error('❌ [CRON] Loyalty expiry error:', error.message);
    }
  });

  // Instagram feed refresh - every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ [CRON] Instagram feed refresh started at:', new Date().toISOString());
    try {
      const brandId = 1;
      await instagramService.refreshAccessTokenIfNeeded(brandId);
      const result = await instagramService.refreshFeed(brandId);
      console.log('✅ [CRON] Instagram refresh completed:', { stale: !!result.stale, count: Array.isArray(result.data) ? result.data.length : 0 });
    } catch (error) {
      console.error('❌ [CRON] Instagram refresh error:', error.message);
    }
  });

  // ── Abandoned Cart Recovery — every hour ──────────────────────────────────
  // Finds carts with items that haven't converted to an order in 1 hour
  cron.schedule('0 * * * *', async () => {
    console.log('\n⏰ [CRON] Abandoned cart check started at:', new Date().toISOString());
    try {
      // Load via associations to ensure all relationships are registered
      const { Cart, CartItem, User, Order, Product } = require('../model/associations.js');
      const { Op } = require('sequelize');
      const whatsappService = require('../services/whatsappService.js');
      const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find active carts updated between 1h and 24h ago (not too old, not too fresh)
      const abandonedCarts = await Cart.findAll({
        where: { status: 'active', updatedAt: { [Op.between]: [oneDayAgo, oneHourAgo] } },
        include: [
          { model: CartItem, as: 'CartItems', required: true, include: [{ model: Product }] },
          { model: User, attributes: ['id', 'username', 'phone', 'email'] },
        ],
      });

      let sent = 0;
      for (const cart of abandonedCarts) {
        const user = cart.User;
        if (!user?.phone) continue;

        // Skip if user placed an order after cart was last updated
        const recentOrder = await Order.findOne({ where: { user_id: user.id, createdAt: { [Op.gte]: cart.updatedAt } } });
        if (recentOrder) continue;

        // Check opted out
        const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${user.phone.slice(-10)}` }, brand_id: 1 } });
        if (conv?.opted_out) continue;

        const firstItem = cart.CartItems[0];
        const productName = firstItem?.Product?.name || 'your items';
        const extra = cart.CartItems.length > 1 ? ` (+${cart.CartItems.length - 1} more)` : '';

        try {
          await whatsappService.sendAbandonedCart(user.phone, {
            customerName: user.username,
            productName: productName + extra,
            couponCode: 'SAVE10',
          }, 1);
          sent++;
        } catch (e) { console.warn('Abandoned cart WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Abandoned cart: ${sent} messages sent`);
    } catch (error) {
      console.error('❌ [CRON] Abandoned cart error:', error.message);
    }
  });

  // ── Review Request — daily at 10 AM ──────────────────────────────────────
  // Finds orders delivered 3 days ago with no review yet
  cron.schedule('0 10 * * *', async () => {
    console.log('\n⏰ [CRON] Review request started at:', new Date().toISOString());
    try {
      const { Order } = require('../model/orderModel.js');
      const { OrderItem } = require('../model/orderItemModel.js');
      const { Product } = require('../model/productModel.js');
      const { User } = require('../model/userModel.js');
      const { ShippingAddress } = require('../model/shippingAddressModel.js');
      const { Review } = require('../model/reviewModel.js');
      const { Op } = require('sequelize');
      const whatsappService = require('../services/whatsappService.js');
      const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const fourDaysAgo  = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

      const deliveredOrders = await Order.findAll({
        where: { status: 'delivered', updatedAt: { [Op.between]: [fourDaysAgo, threeDaysAgo] }, user_id: { [Op.ne]: null } },
        include: [
          { model: User, attributes: ['id', 'username', 'phone'] },
          { model: ShippingAddress, as: 'ShippingAddress', attributes: ['phone'] },
          { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] }] },
        ],
      });

      let sent = 0;
      for (const order of deliveredOrders) {
        const phone = order.User?.phone || order.ShippingAddress?.phone;
        if (!phone) continue;

        // Check opted out
        const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${phone.slice(-10)}` }, brand_id: order.brand_id || 1 } });
        if (conv?.opted_out) continue;

        // Check if review already exists for this order's products
        const productIds = order.OrderItems.map(i => i.product_id);
        const existingReview = await Review.findOne({ where: { userId: order.user_id, productId: { [Op.in]: productIds } } });
        if (existingReview) continue;

        const firstProduct = order.OrderItems[0]?.Product;
        if (!firstProduct) continue;

        try {
          await whatsappService.sendReviewRequest(phone, {
            customerName: order.User?.username,
            productName: firstProduct.name,
            productSlug: firstProduct.slug,
          }, order.brand_id || 1);
          sent++;
        } catch (e) { console.warn('Review request WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Review requests: ${sent} sent`);
    } catch (error) {
      console.error('❌ [CRON] Review request error:', error.message);
    }
  });

  // ── Win-back Campaign — daily at 11 AM ───────────────────────────────────
  // Targets users with no order in 30 days
  cron.schedule('0 11 * * *', async () => {
    console.log('\n⏰ [CRON] Win-back campaign started at:', new Date().toISOString());
    try {
      const { Order } = require('../model/orderModel.js');
      const { User } = require('../model/userModel.js');
      const { Op, sequelize: sq } = require('sequelize');
      const whatsappService = require('../services/whatsappService.js');
      const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo  = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // Users whose last order was 30-60 days ago
      const usersWithRecentOrders = await Order.findAll({
        where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
        attributes: ['user_id'],
        raw: true,
      });
      const activeUserIds = [...new Set(usersWithRecentOrders.map(o => o.user_id).filter(Boolean))];

      const inactiveOrders = await Order.findAll({
        where: {
          user_id: { [Op.notIn]: activeUserIds.length ? activeUserIds : [0] },
          createdAt: { [Op.between]: [sixtyDaysAgo, thirtyDaysAgo] },
          status: { [Op.in]: ['delivered'] },
        },
        attributes: ['user_id'],
        group: ['user_id'],
        raw: true,
      });

      let sent = 0;
      for (const row of inactiveOrders) {
        if (!row.user_id) continue;
        const user = await User.findByPk(row.user_id, { attributes: ['id', 'username', 'phone'] });
        if (!user?.phone) continue;

        const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${user.phone.slice(-10)}` }, brand_id: 1 } });
        if (conv?.opted_out) continue;

        try {
          await whatsappService.sendWinBack(user.phone, { customerName: user.username, couponCode: 'COMEBACK10' }, 1);
          sent++;
        } catch (e) { console.warn('Win-back WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Win-back: ${sent} sent`);
    } catch (error) {
      console.error('❌ [CRON] Win-back error:', error.message);
    }
  });

  // ── Post-purchase Upsell — daily at 3 PM ─────────────────────────────────
  // Targets orders delivered exactly 1 day ago
  cron.schedule('0 15 * * *', async () => {
    console.log('\n⏰ [CRON] Post-purchase upsell started at:', new Date().toISOString());
    try {
      const { Order } = require('../model/orderModel.js');
      const { OrderItem } = require('../model/orderItemModel.js');
      const { Product } = require('../model/productModel.js');
      const { User } = require('../model/userModel.js');
      const { ShippingAddress } = require('../model/shippingAddressModel.js');
      const { Op } = require('sequelize');
      const whatsappService = require('../services/whatsappService.js');
      const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

      const oneDayAgo  = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      const deliveredOrders = await Order.findAll({
        where: { status: 'delivered', updatedAt: { [Op.between]: [twoDaysAgo, oneDayAgo] }, user_id: { [Op.ne]: null } },
        include: [
          { model: User, attributes: ['id', 'username', 'phone'] },
          { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] }] },
        ],
      });

      let sent = 0;
      for (const order of deliveredOrders) {
        const phone = order.User?.phone;
        if (!phone) continue;

        const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${phone.slice(-10)}` }, brand_id: order.brand_id || 1 } });
        if (conv?.opted_out) continue;

        const purchasedProduct = order.OrderItems[0]?.Product;
        if (!purchasedProduct) continue;

        // Simple upsell: suggest a different product (in real use, plug in recommendation engine)
        const suggestedProduct = await Product.findOne({
          where: { id: { [Op.ne]: purchasedProduct.id }, status: 'active' },
          order: [['createdAt', 'DESC']],
        });
        if (!suggestedProduct) continue;

        try {
          await whatsappService.sendPostPurchaseUpsell(phone, {
            customerName: order.User?.username,
            purchasedProduct: purchasedProduct.name,
            suggestedProduct: suggestedProduct.name,
            suggestedSlug: suggestedProduct.slug,
          }, order.brand_id || 1);
          sent++;
        } catch (e) { console.warn('Upsell WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Post-purchase upsell: ${sent} sent`);
    } catch (error) {
      console.error('❌ [CRON] Post-purchase upsell error:', error.message);
    }
  });

  console.log('✅ Cron jobs initialized successfully');
  console.log('📋 Active jobs:');
  console.log('   - FShip Order Sync: Every 2 hours');
  console.log('   - Loyalty Expiry: Daily at 2 AM');
  console.log('   - Instagram Feed Refresh: Every 6 hours');
  console.log('   - Abandoned Cart Recovery: Every hour');
  console.log('   - Review Request: Daily at 10 AM');
  console.log('   - Win-back Campaign: Daily at 11 AM');
  console.log('   - Post-purchase Upsell: Daily at 3 PM');
}

module.exports = { initializeCronJobs };
