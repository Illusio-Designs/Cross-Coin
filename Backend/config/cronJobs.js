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
 */
function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs (Bull-backed)...');

  const { enqueue, registerProcessor } = require('../services/integrationQueue.js');

  async function trigger(jobName, payload = {}) {
    try {
      await enqueue(jobName, payload);
      console.log(`✅ [CRON] enqueued ${jobName}`);
    } catch (e) {
      console.error(`❌ [CRON] enqueue ${jobName} failed:`, e.message);
    }
  }

  // Move a heavy cron handler off the cron tick and onto the job queue: it runs
  // one-at-a-time (concurrency 1) and can be offloaded to a dedicated worker on
  // AWS with zero code change. attempts:1 — NO retry — because these handlers
  // send customer WhatsApp messages, and a retry could re-send. (They also
  // already swallow their own errors, so they never fail Bull anyway.) Returns
  // a cron callback that just enqueues the job. The handler body is unchanged.
  function queued(jobName, handler) {
    registerProcessor(jobName, 1, async () => { await handler(); });
    return () => {
      enqueue(jobName, {}, { attempts: 1 })
        .then(() => console.log(`✅ [CRON] enqueued ${jobName}`))
        .catch((e) => console.error(`❌ [CRON] enqueue ${jobName} failed:`, e.message));
    };
  }

  // (Bulk order-sync cron removed — booking is per-order via the dashboard, and
  // the bulk sweep was a no-op in manual mode anyway.)

  // Shipping status refresh — twice daily at 6 AM & 6 PM
  cron.schedule('0 6,18 * * *', () => {
    console.log('\n⏰ [CRON] enqueue cron:shipping-status-refresh at:', new Date().toISOString());
    trigger('cron:shipping-status-refresh');
  });

  // Daily booking batch — 11:00 IST (with a 15:00 IST safety retry). iThink
  // orders are NOT booked on payment; each is queued with pickup_hold_until (the
  // date of its batch). This run books every order whose batch date has arrived.
  // Booking at 11:00 IST (past the courier's same-day cut-off) makes iThink
  // schedule the pickup for the NEXT day, not the same day — so orders placed
  // before 11:00 book today and are picked up tomorrow; a batch held through a
  // closed day books once the pickup lands on an allowed day. The queue worker
  // re-checks the schedule: it books, or re-holds to the next allowed day.
  const releaseHeldPickups = async () => {
    try {
      const { Order } = require('../model/orderModel.js');
      const { Op } = require('sequelize');
      const todayIst = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
      const due = await Order.findAll({
        where: {
          pickup_hold_until: { [Op.ne]: null, [Op.lte]: todayIst },
          shipping_waybill: null,
          status: { [Op.notIn]: ['cancelled', 'delivered', 'returned', 'rto', 'refunded'] },
        },
        attributes: ['id', 'order_number'],
        limit: 500,
      });
      if (!due.length) return;
      const { enqueue } = require('../services/integrationQueue.js');
      let queued = 0;
      for (const o of due) {
        try { await enqueue('shipping:sync-order', { orderId: o.id, attempt: 1 }); queued++; } catch (_) {}
      }
      console.log(`⏰ [CRON] pickup-hold: re-queued ${queued}/${due.length} held order(s) for booking`);
    } catch (e) {
      console.error('❌ [CRON] pickup-hold release error:', e.message);
    }
  };
  cron.schedule('0 11,15 * * *', releaseHeldPickups, { timezone: 'Asia/Kolkata' });

  // Leaked stock-reservation cleanup — every 5 minutes. Abandoned checkouts
  // let their reservation session expire, but the stock:reserved counter has
  // no TTL, so without this sweep popular items drift into phantom
  // "out of stock" while the DB still has inventory.
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { cleanupLeakedReservations } = require('../services/stockReservationService.js');
      const { corrected } = await cleanupLeakedReservations();
      if (corrected > 0) console.log(`⏰ [CRON] reservation cleanup corrected ${corrected} leaked counter(s)`);
    } catch (e) {
      console.error('❌ [CRON] reservation cleanup error:', e.message);
    }
  });

  // Product badge refresh — nightly at 2:30 AM IST. Keeps time-based badges
  // (new arrival) and stock badges current without anyone editing a product.
  cron.schedule('30 2 * * *', async () => {
    try {
      const { checked, changed } = await require('../services/badgeService.js').refreshAllBadges();
      console.log(`⏰ [CRON] badge refresh: ${changed} of ${checked} product badge(s) updated`);
    } catch (e) {
      console.error('❌ [CRON] badge refresh error:', e.message);
    }
  }, { timezone: 'Asia/Kolkata' });

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

  // DPDP data retention sweep — daily at 4 AM. Drops stale analytics / leads /
  // contact / abandoned-guest rows per the configured windows. Order & invoice
  // data is never touched. Runs inline; it is a handful of bounded DELETEs.
  cron.schedule('0 4 * * *', async () => {
    console.log('\n⏰ [CRON] DPDP retention sweep started at:', new Date().toISOString());
    try {
      const { runRetention } = require('../services/dataRetentionService.js');
      const summary = await runRetention();
      console.log('✅ [CRON] DPDP retention sweep completed:', summary);
    } catch (error) {
      console.error('❌ [CRON] DPDP retention sweep error:', error.message);
    }
  });

  // (Instagram feed refresh cron removed — feature retired.)

  // ── Abandoned Cart Recovery — every hour at :15 ──────────────────────────
  // Finds carts with items that haven't converted to an order in 1 hour
  cron.schedule('15 * * * *', queued('cron:abandoned-cart', async () => {
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

        // The cart has no brand of its own — derive it from the products in it
        // (products are brand-scoped) so recovery stays multi-brand instead of
        // always messaging as brand 1.
        const firstItem = cart.CartItems[0];
        const brandId = firstItem?.Product?.brand_id || 1;

        // Check opted out (scoped to the cart's own brand)
        const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${user.phone.slice(-10)}` }, brand_id: brandId } });
        if (conv?.opted_out) continue;

        const productName = firstItem?.Product?.name || 'your items';
        const extra = cart.CartItems.length > 1 ? ` (+${cart.CartItems.length - 1} more)` : '';

        // Cart total (price/qty) and the first product's image for the message.
        const cartTotal = cart.CartItems.reduce((sum, it) => {
          const price = Number(it.price ?? it.Product?.price ?? 0);
          return sum + price * Number(it.quantity || 1);
        }, 0);
        let productImage = null;
        try {
          const { ProductImage } = require('../model/associations.js');
          if (firstItem?.Product?.id && ProductImage) {
            const img = await ProductImage.findOne({ where: { product_id: firstItem.Product.id }, order: [['id', 'ASC']] });
            if (img?.image_url) productImage = /^https?:\/\//.test(img.image_url) ? img.image_url : `https://api.crosscoin.in/api/uploads/${String(img.image_url).replace(/^\/+/, '').replace(/^api\/uploads\//, '').replace(/^uploads\//, '')}`;
          }
        } catch (_) { /* image is optional — header falls back to the brand logo */ }

        try {
          // Recovery token so the "Complete Order" link rebuilds this server
          // cart on any device (the shopper isn't logged in inside WhatsApp's
          // in-app browser). Null on failure → link still opens the store.
          const recoverToken = await require('../services/cartRecoveryService.js').tokenForServerCart({
            phone: user.phone, name: user.username, brandId, userId: user.id,
            cartItems: cart.CartItems, summary: productName + extra, value: cartTotal,
          });
          await whatsappService.sendAbandonedCart(user.phone, {
            customerName: user.username,
            itemsSummary: productName + extra,
            total: cartTotal ? cartTotal.toFixed(0) : undefined,
            productImage,
            couponCode: 'CART10',
            recoverToken,
          }, brandId);
          // Mark the cart abandoned so the hourly cron never re-messages it.
          // (Previously nothing marked it, so the same cart was messaged every
          // hour for up to ~23 hours.) It re-arms to 'active' when the shopper
          // adds to the cart again — see cartController.addToCart.
          await cart.update({ status: 'abandoned' });
          sent++;
        } catch (e) { console.warn('Abandoned cart WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Abandoned cart: ${sent} messages sent`);
    } catch (error) {
      console.error('❌ [CRON] Abandoned cart error:', error.message);
    }
  }));

  // ── Abandoned Checkout Recovery (captured carts) — every 5 minutes ───────
  // Covers EVERY drop-off that reached checkout with a phone — guest OR
  // logged-in, COD OR prepaid — via the abandoned_carts capture table. Sends one
  // recovery WhatsApp per row once it's older than ABANDONED_CART_DELAY_MIN and
  // still 'pending' (not converted). Opt-out is honoured per brand.
  cron.schedule('*/5 * * * *', queued('cron:abandoned-checkout', async () => {
    console.log('\n⏰ [CRON] Abandoned checkout recovery started at:', new Date().toISOString());
    try {
      const { AbandonedCart } = require('../model/abandonedCartModel.js');
      const { Op } = require('sequelize');
      const whatsappService = require('../services/whatsappService.js');
      const { WhatsappConversation } = require('../model/whatsappConversationModel.js');

      const delayMin = parseInt(process.env.ABANDONED_CART_DELAY_MIN || '5', 10);
      const cutoff = new Date(Date.now() - delayMin * 60 * 1000);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const rows = await AbandonedCart.findAll({
        where: { status: 'pending', waSent: false, updatedAt: { [Op.between]: [dayAgo, cutoff] } },
        limit: 200,
      });

      let sent = 0;
      for (const row of rows) {
        const phone = row.phone; // decrypted via model getter
        const last10 = String(phone || '').replace(/\D/g, '').slice(-10);
        if (last10.length !== 10) continue;
        const brandId = row.brandId || 1;

        // Respect WhatsApp marketing opt-out (scoped to the cart's brand).
        const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${last10}` }, brand_id: brandId } });
        if (conv?.opted_out) { await row.update({ status: 'messaged', waSent: true }); continue; }

        try {
          await whatsappService.sendAbandonedCart(phone, {
            customerName: row.customerName,
            itemsSummary: row.cartSummary || 'your items',
            total: row.cartValue != null ? Number(row.cartValue).toFixed(0) : undefined,
            // No per-item image in the capture table — header falls back to logo.
            couponCode: 'CART10',
            // Unguessable token → the "Complete Order" link rebuilds the cart on
            // any device (rows captured before tokens existed get one now).
            recoverToken: await require('../services/cartRecoveryService.js').ensureToken(row),
          }, brandId);
          await row.update({ status: 'messaged', waSent: true });
          sent++;
        } catch (e) { console.warn('Abandoned checkout WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Abandoned checkout recovery: ${sent} messages sent`);
    } catch (error) {
      console.error('❌ [CRON] Abandoned checkout recovery error:', error.message);
    }
  }));

  // ── Review Request — daily at 10 AM ──────────────────────────────────────
  // Finds orders delivered 3 days ago with no review yet
  cron.schedule('0 10 * * *', queued('cron:review-request', async () => {
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
  }));

  // ── Win-back Campaign — daily at 11 AM ───────────────────────────────────
  // One message per customer per brand: those whose LAST non-cancelled order
  // with that brand was placed 30–31 days ago (the daily window slides, so each
  // customer is picked up exactly once). The coupon is the brand's
  // WINBACK_COUPON_CODE setting (falls back to CART10) and is only offered when
  // that coupon exists and is active for the brand — otherwise the brand is
  // skipped, so customers never receive a code that fails at checkout.
  cron.schedule('0 11 * * *', queued('cron:winback', async () => {
    console.log('\n⏰ [CRON] Win-back campaign started at:', new Date().toISOString());
    try {
      const { Op } = require('sequelize');
      const { sequelize: db } = require('../config/db.js');
      const { User } = require('../model/userModel.js');
      const { Coupon } = require('../model/couponModel.js');
      const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
      const settingsHelper = require('../services/settingsHelper.js');
      const whatsappService = require('../services/whatsappService.js');

      const [rows] = await db.query(
        `SELECT user_id, brand_id, MAX(createdAt) AS last_at
           FROM orders
          WHERE user_id IS NOT NULL
            AND status NOT IN ('cancelled', 'order cancelled')
          GROUP BY user_id, brand_id
         HAVING last_at >= NOW() - INTERVAL 31 DAY AND last_at < NOW() - INTERVAL 30 DAY`
      );

      const couponByBrand = new Map();
      const couponFor = async (brandId) => {
        if (couponByBrand.has(brandId)) return couponByBrand.get(brandId);
        const code = String(await settingsHelper.getSetting(brandId, 'WINBACK_COUPON_CODE', 'CART10', { brandOnly: true }) || 'CART10').trim();
        const now = new Date();
        const coupon = await Coupon.findOne({
          where: {
            code, brand_id: brandId, status: 'active',
            [Op.and]: [
              { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }] },
              { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: now } }] },
            ],
          },
        });
        const usable = coupon ? code : null;
        if (!usable) console.warn(`⚠️ [CRON] Win-back: brand ${brandId} has no active coupon "${code}" — skipping its customers`);
        couponByBrand.set(brandId, usable);
        return usable;
      };

      let sent = 0;
      for (const row of rows) {
        const brandId = row.brand_id || 1;
        const couponCode = await couponFor(brandId);
        if (!couponCode) continue;
        const user = await User.findByPk(row.user_id, { attributes: ['id', 'username', 'phone', 'deleted_at'] });
        if (!user?.phone || user.deleted_at) continue;
        const conv = await WhatsappConversation.findOne({
          where: { customer_phone: { [Op.like]: `%${String(user.phone).slice(-10)}` }, brand_id: brandId },
        });
        if (conv?.opted_out) continue;
        try {
          await whatsappService.sendWinBack(user.phone, { customerName: user.username, couponCode }, brandId);
          sent++;
        } catch (e) { console.warn('Win-back WA failed:', e.message); }
      }
      console.log(`✅ [CRON] Win-back: ${sent} sent (${rows.length} eligible)`);
    } catch (error) {
      console.error('❌ [CRON] Win-back error:', error.message);
    }
  }));

  // ── Post-purchase Upsell — daily at 3 PM ─────────────────────────────────
  // Targets orders delivered exactly 1 day ago
  cron.schedule('0 15 * * *', queued('cron:upsell', async () => {
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

        // Suggest the newest active product of the SAME brand that isn't in
        // this order (the link is built on that brand's domain).
        const boughtIds = order.OrderItems.map((i) => i.Product?.id).filter(Boolean);
        const suggestedProduct = await Product.findOne({
          where: { id: { [Op.notIn]: boughtIds }, status: 'active', brand_id: order.brand_id || 1 },
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
  }));

  // ── Product alerts — every 30 min, 9 AM–9 PM IST only ────────────────────
  // WhatsApp customers who wishlisted a product or still have it in their
  // cart when it comes back in stock or drops in price. Changes made at night
  // are picked up by the first run of the morning, so nobody is messaged
  // while asleep. See services/productAlertService.js.
  cron.schedule('20,50 9-20 * * *', queued('cron:product-alerts', async () => {
    try {
      const { runProductAlerts } = require('../services/productAlertService.js');
      const r = await runProductAlerts();
      if (r.events) console.log(`✅ [CRON] Product alerts: ${r.events} change(s), ${r.sent} message(s) sent`);
    } catch (error) {
      console.error('❌ [CRON] Product alerts error:', error.message);
    }
  }), { timezone: 'Asia/Kolkata' });

  // ── Stale Prepaid Order Cleanup — every 30 minutes at :10 and :40 ────────
  // Cancels prepaid orders where payment_status is still 'pending' or 'failed'
  // after 30 minutes (customer abandoned or payment failed)
  cron.schedule('10,40 * * * *', queued('cron:stale-cleanup', async () => {
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
  }));

  console.log('✅ Cron jobs initialized successfully');
  console.log('📋 Active jobs:');
  console.log('   - iThink Status Refresh: Twice daily (6 AM & 6 PM) — auto-excludes cancelled/delivered');
  console.log('   - Loyalty Expiry: Daily at 2 AM');
  console.log('   - Product Badge Refresh: Daily at 2:30 AM');
  console.log('   - Abandoned Cart Recovery: Every hour at :15');
  console.log('   - Review Request: Daily at 10 AM');
  console.log('   - Win-back Campaign: Daily at 11 AM');
  console.log('   - Post-purchase Upsell: Daily at 3 PM');
  console.log('   - Product Alerts (back in stock / price drop): Every 30 min, 9 AM–9 PM IST');
  console.log('   - Stale Prepaid Cleanup: Every 30 min at :10/:40');
}

module.exports = { initializeCronJobs };
