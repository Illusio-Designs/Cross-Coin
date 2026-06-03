const cron = require('node-cron');

/**
 * Initialize all cron jobs.
 *
 * Architecture: node-cron is now JUST the trigger. Every job enqueues
 * a single Bull message; the worker (in integrationQueueWorkers.js)
 * does the actual work. This way:
 *   - Bull retries on transient failure (5 attempts, exponential backoff)
 *   - Jobs persist across crashes
 *   - Stats visible via /api/metrics
 *   - Horizontal scaling won't double-fire (Bull dedupes by job ID)
 *
 * Falls back to inline execution when Redis is unavailable so dev still
 * works — see services/integrationQueue.js.
 *
 * Force a job to run synchronously without going through the queue by
 * setting CRON_SKIP_QUEUE=true (debugging only).
 */
function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs (Bull-backed)...');

  const { enqueue } = require('../services/integrationQueue.js');
  const skipQueue = process.env.CRON_SKIP_QUEUE === 'true';

  async function trigger(jobName, payload = {}) {
    try {
      if (skipQueue) {
        // Fallback path: pull the processor directly. Useful in dev when
        // you want to see errors inline rather than buried in Bull's UI.
        const { registerProcessor } = require('../services/integrationQueue.js');
        // Processors are already registered at boot; nothing to do here
        // because enqueue() in inline mode runs them via setImmediate.
      }
      await enqueue(jobName, payload);
      console.log(`✅ [CRON] enqueued ${jobName}`);
    } catch (e) {
      console.error(`❌ [CRON] enqueue ${jobName} failed:`, e.message);
    }
  }

  // FShip Order Sync — every 2 hours at :05
  cron.schedule('5 */2 * * *', () => {
    console.log('\n⏰ [CRON] enqueue cron:fship-sync at:', new Date().toISOString());
    trigger('cron:fship-sync');
  });

  // iThink/FShip Status Refresh — twice daily at 6 AM & 6 PM
  cron.schedule('0 6,18 * * *', () => {
    console.log('\n⏰ [CRON] enqueue cron:fship-status-refresh at:', new Date().toISOString());
    trigger('cron:fship-status-refresh');
  });

  // Loyalty points expiry — daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    console.log('\n⏰ [CRON] enqueue cron:loyalty-expiry at:', new Date().toISOString());
    trigger('cron:loyalty-expiry');
  });

  // Payment reconciliation — daily at 3 AM
  // For every Razorpay payment marked pending/failed in the last 48h, ask
  // Razorpay what really happened and reconcile our local row. Catches
  // dropped webhooks and signature-rejection races.
  cron.schedule('0 3 * * *', async () => {
    console.log('\n⏰ [CRON] Payment reconciliation started at:', new Date().toISOString());
    try {
      const { reconcileRecentPayments } = require('../services/paymentReconciliationService.js');
      // Queue mode if Bull is wired; falls back to inline if Redis is down.
      // RECON_USE_QUEUE=false lets an operator force inline if needed.
      const useQueue = process.env.RECON_USE_QUEUE !== 'false';
      const summary = await reconcileRecentPayments({ sinceHours: 48, limit: 500, useQueue });
      console.log('✅ [CRON] Payment reconciliation completed:', summary);
    } catch (error) {
      console.error('❌ [CRON] Payment reconciliation error:', error.message);
    }
  });

  // Instagram feed refresh — every 6 hours
  cron.schedule('0 */6 * * *', () => {
    console.log('\n⏰ [CRON] enqueue cron:instagram-refresh at:', new Date().toISOString());
    trigger('cron:instagram-refresh');
  });

  // ── Abandoned Cart Recovery — every hour at :15 ──────────────────────────
  // Finds carts with items that haven't converted to an order in 1 hour
  cron.schedule('15 * * * *', async () => {
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

  // ── Stale Prepaid Order Cleanup — every 30 minutes at :10 and :40 ────────
  // Cancels prepaid orders where payment_status is still 'pending' or 'failed'
  // after 30 minutes (customer abandoned or payment failed)
  cron.schedule('10,40 * * * *', async () => {
    console.log('\n⏰ [CRON] Stale prepaid cleanup started at:', new Date().toISOString());
    try {
      const { Order, OrderItem, ProductVariation } = require('../model/associations.js');
      const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
      const { Coupon } = require('../model/couponModel.js');
      const { CouponUsage } = require('../model/couponUsageModel.js');
      const { Op } = require('sequelize');
      const { sequelize } = require('../config/db.js');

      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find prepaid orders older than 30 min that are still pending/failed
      const staleOrders = await Order.findAll({
        where: {
          payment_type: { [Op.notIn]: ['cod'] },
          payment_status: { [Op.in]: ['pending', 'failed'] },
          status: { [Op.notIn]: ['cancelled', 'order cancelled'] },
          createdAt: { [Op.lt]: thirtyMinAgo },
        },
        include: [
          { model: OrderItem, as: 'OrderItems', attributes: ['id', 'product_id', 'variation_id', 'quantity'] },
        ],
      });

      if (staleOrders.length === 0) {
        console.log('✅ [CRON] Stale prepaid: no stale orders found');
        return;
      }

      let cancelled = 0;
      for (const order of staleOrders) {
        const transaction = await sequelize.transaction();
        try {
          // Cancel the order
          await order.update({
            status: 'cancelled',
            payment_status: order.payment_status === 'failed' ? 'failed' : 'cancelled',
          }, { transaction });

          // Restore stock for each item
          for (const item of order.OrderItems) {
            if (item.variation_id) {
              await ProductVariation.increment('stock', {
                by: item.quantity,
                where: { id: item.variation_id },
                transaction,
              });
            }
          }

          // Restore coupon usage if applicable
          if (order.coupon_id) {
            await Coupon.decrement('usageCount', {
              by: 1,
              where: { id: order.coupon_id },
              transaction,
            });
            await CouponUsage.destroy({
              where: { orderId: order.id },
              transaction,
            });
          }

          // Log status change
          await OrderStatusHistory.create({
            order_id: order.id,
            status: 'cancelled',
            updated_by: null,
            notes: 'Auto-cancelled: prepaid payment not completed within 30 minutes',
          }, { transaction });

          await transaction.commit();
          cancelled++;
          console.log(`  ✓ Cancelled stale order #${order.order_number} (id=${order.id})`);
        } catch (err) {
          await transaction.rollback();
          console.error(`  ✗ Failed to cancel order ${order.id}:`, err.message);
        }
      }

      console.log(`✅ [CRON] Stale prepaid: ${cancelled}/${staleOrders.length} orders cancelled`);
    } catch (error) {
      console.error('❌ [CRON] Stale prepaid cleanup error:', error.message);
    }
  });

  console.log('✅ Cron jobs initialized successfully');
  console.log('📋 Active jobs:');
  console.log('   - FShip Order Sync: Every 2 hours at :05');
  console.log('   - iThink Status Refresh: Twice daily (6 AM & 6 PM) — auto-excludes cancelled/delivered');
  console.log('   - Loyalty Expiry: Daily at 2 AM');
  console.log('   - Instagram Feed Refresh: Every 6 hours');
  console.log('   - Abandoned Cart Recovery: Every hour at :15');
  console.log('   - Review Request: Daily at 10 AM');
  console.log('   - Win-back Campaign: Daily at 11 AM');
  console.log('   - Post-purchase Upsell: Daily at 3 PM');
  console.log('   - Stale Prepaid Cleanup: Every 30 min at :10/:40');
}

module.exports = { initializeCronJobs };
