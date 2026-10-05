const { Product, Order, User, Review, OrderItem, ProductVariation, GuestUser, UTMTracking, Brand } = require("../model/associations.js");
const { sequelize } = require("../config/db.js");
const { Op, QueryTypes } = require("sequelize");
const cacheManager = require("./cacheManager.js");

// Cache configuration
// 60s: the figures must feel live. Order actions (confirm/cancel/ship/deliver)
// also actively invalidate the cache via the order event bus, so this TTL is
// just the backstop for anything that doesn't emit an event.
const DASHBOARD_CACHE_TTL = 60; // seconds
const DASHBOARD_CACHE_KEY = (userId, brandId) => `dashboard:brand:${brandId || 'all'}:stats`;

/**
 * Aggregates all dashboard data from database
 * Combines user stats, recent orders, badges, recommendations
 * Requirements: 1.4
 */
const aggregateDashboardData = async (userId, brandId, dateFilter = {}) => {
  try {
    const brandWhere = brandId ? { brand_id: brandId } : {};

    // Build date filter for orders
    const orderDateWhere = {};
    if (dateFilter.startDate) orderDateWhere[Op.gte] = dateFilter.startDate;
    if (dateFilter.endDate) orderDateWhere[Op.lte] = dateFilter.endDate;
    // Object.keys() ignores Symbol keys (Op.gte/Op.lte), so checking the object's
    // key count was always 0 and the dashboard/Reports date filter never applied.
    // Check the inputs directly instead.
    const hasDateFilter = !!(dateFilter.startDate || dateFilter.endDate);
    const orderWhere = {
      ...brandWhere,
      ...(hasDateFilter ? { createdAt: orderDateWhere } : {}),
    };

    // Get total products count
    const totalProducts = await Product.count({ where: brandWhere });

    // Get total active products count
    const activeProducts = await Product.count({
      where: { status: "active", ...brandWhere },
    });

    // Get total orders count
    const totalOrders = await Order.count({ where: orderWhere });

    // Get pending orders count
    const pendingOrders = await Order.count({
      where: {
        status: { [Op.in]: ["pending", "processing", "awaiting_confirmation"] },
        ...orderWhere,
      },
    });

    // Get cancelled orders count
    const cancelledOrders = await Order.count({
      where: { status: { [Op.in]: ['cancelled', 'order cancelled'] }, ...orderWhere },
    });

    // Revenue + status/payment breakdown.
    //
    // This used to `findAll` EVERY matching order into memory (unbounded on the
    // default no-date-filter view — the whole orders table) and iterate it. It
    // now GROUPs in SQL by (status, payment_type, payment_status, brand_id) and
    // iterates the handful of resulting buckets instead, which is bounded and
    // index-friendly while producing the exact same totals. `month_amt` sums the
    // current calendar month inside the same pass.
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Day 0 of next month = last day of THIS month, at end of day so the whole
    // final day counts (the old code used 00:00:00, silently dropping last-day
    // orders from the monthly figure).
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const aggWhere = [];
    const aggRepl = { monthStart: firstDayOfMonth, monthEnd: lastDayOfMonth };
    if (brandId) { aggWhere.push('brand_id = :brandId'); aggRepl.brandId = brandId; }
    if (hasDateFilter && dateFilter.startDate) { aggWhere.push('created_at >= :startDate'); aggRepl.startDate = dateFilter.startDate; }
    if (hasDateFilter && dateFilter.endDate) { aggWhere.push('created_at <= :endDate'); aggRepl.endDate = dateFilter.endDate; }
    const aggWhereSql = aggWhere.length ? `WHERE ${aggWhere.join(' AND ')}` : '';

    const orderGroups = await sequelize.query(`
      SELECT
        LOWER(status)         AS status,
        LOWER(payment_type)   AS payment_type,
        LOWER(payment_status) AS payment_status,
        brand_id,
        COUNT(*)              AS cnt,
        SUM(final_amount)     AS amt,
        SUM(CASE WHEN created_at BETWEEN :monthStart AND :monthEnd THEN final_amount ELSE 0 END) AS month_amt
      FROM orders
      ${aggWhereSql}
      GROUP BY LOWER(status), LOWER(payment_type), LOWER(payment_status), brand_id
    `, { type: QueryTypes.SELECT, replacements: aggRepl });

    // totalRevenue = ALL orders (including cancelled, RTO) — full picture.
    let totalRevenue = 0;
    let deliveredRevenue = 0;
    let cancelledRevenue = 0;
    let rtoRevenue = 0;
    let pendingRevenue = 0;
    let processingRevenue = 0;
    let shippedRevenue = 0;
    let undeliveredRevenue = 0;
    let completedOrdersCount = 0;
    let monthlyRevenue = 0;

    const statusCounts = {};
    const paymentTypeCounts = {};
    const paymentStatusCounts = { pending: 0, paid: 0, failed: 0, refunded: 0, cancelled: 0, refund_pending: 0 };
    // COD / prepaid revenue excludes cancelled orders (both 'cancelled' spellings).
    let codCount = 0, codRevenue = 0, prepaidCount = 0, prepaidRevenue = 0;
    // Per-brand buckets for the brand-wise sales widget.
    const brandAgg = new Map(); // brand_id → { orders, revenue, earned, lost }

    const CANCELLED = new Set(['cancelled', 'order cancelled']);
    const RTO = new Set(['rto', 'rto delivered', 'return_initiated', 'returned_rto']);

    orderGroups.forEach(g => {
      const orderStatus = g.status || '';
      const paymentType = g.payment_type || undefined;
      const paymentStatus = g.payment_status || '';
      const cnt = parseInt(g.cnt, 10) || 0;
      const amt = parseFloat(g.amt || 0);
      const monthAmt = parseFloat(g.month_amt || 0);

      statusCounts[orderStatus] = (statusCounts[orderStatus] || 0) + cnt;
      paymentTypeCounts[paymentType] = (paymentTypeCounts[paymentType] || 0) + cnt;
      totalRevenue += amt;
      monthlyRevenue += monthAmt;

      switch (orderStatus) {
        case 'delivered':
        case 'completed':
          deliveredRevenue += amt;
          completedOrdersCount += cnt;
          break;
        case 'cancelled':
        case 'order cancelled':
          cancelledRevenue += amt;
          break;
        case 'rto':
        case 'rto delivered':
        case 'return_initiated':
        case 'returned_rto':
          rtoRevenue += amt;
          break;
        case 'pending':
        case 'awaiting_confirmation':
          pendingRevenue += amt;
          break;
        case 'processing':
        case 'confirmed':
          processingRevenue += amt;
          break;
        case 'shipped':
        case 'out for delivery':
        case 'in transit':
        case 'booked':
        case 'pickup initiated':
        case 'manifested':
          shippedRevenue += amt;
          break;
        case 'undelivered':
        case 'exception':
          undeliveredRevenue += amt;
          break;
      }

      // Payment-status chart buckets.
      if (Object.prototype.hasOwnProperty.call(paymentStatusCounts, paymentStatus)) {
        paymentStatusCounts[paymentStatus] += cnt;
      }

      // COD vs prepaid split (revenue excludes cancelled orders).
      const notCancelled = !CANCELLED.has(orderStatus);
      if (paymentType === 'cod') {
        codCount += cnt;
        if (notCancelled) codRevenue += amt;
      } else {
        prepaidCount += cnt;
        if (notCancelled) prepaidRevenue += amt;
      }

      // Per-brand buckets.
      const bid = g.brand_id || null;
      const b = brandAgg.get(bid) || { orders: 0, revenue: 0, earned: 0, lost: 0 };
      b.orders += cnt;
      b.revenue += amt;
      if (orderStatus === 'delivered' || orderStatus === 'completed') b.earned += amt;
      else if (CANCELLED.has(orderStatus) || RTO.has(orderStatus)) b.lost += amt;
      brandAgg.set(bid, b);
    });

    // Earned revenue = only delivered orders (actual money collected)
    const earnedRevenue = deliveredRevenue;
    // Active revenue = orders still in pipeline (not cancelled/rto/delivered)
    const activeRevenue = pendingRevenue + processingRevenue + shippedRevenue + undeliveredRevenue;
    // Lost revenue = cancelled + RTO
    const lostRevenue = cancelledRevenue + rtoRevenue;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get total customers — scoped to the brand when the dashboard is. Consumer
    // accounts are per-brand (users.source_brand_id); guests come from orders
    // (which carry brand_id), so both honour the brand filter now instead of
    // leaking platform-wide totals into a single-brand view.
    const customerBrandWhere = brandId ? { source_brand_id: brandId } : {};
    const totalRegisteredCustomers = await User.count({
      where: { role: "consumer", ...customerBrandWhere },
    });

    const totalGuestCustomers = await Order.count({
      where: {
        guest_user_id: {
          [Op.not]: null
        },
        ...brandWhere
      },
      distinct: true,
      col: 'guest_user_id'
    });

    const totalCustomers = totalRegisteredCustomers + totalGuestCustomers;

    // Get recent customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegisteredCustomers = await User.count({
      where: {
        role: "consumer",
        ...customerBrandWhere,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    const recentGuestCustomers = await Order.count({
      where: {
        guest_user_id: {
          [Op.not]: null
        },
        ...brandWhere,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      distinct: true,
      col: 'guest_user_id'
    });

    const recentCustomers = recentRegisteredCustomers + recentGuestCustomers;

    // Get total reviews count (brand-scoped — reviews carry brandId)
    const reviewBrandWhere = brandId ? { brandId } : {};
    const totalReviews = await Review.count({ where: reviewBrandWhere });

    // Get approved reviews count
    const approvedReviews = await Review.count({
      where: { status: "approved", ...reviewBrandWhere },
    });

    // Reviews still awaiting moderation (drives the home "Needs attention"
    // inbox). Kept separate from total-minus-approved so rejected reviews
    // don't inflate the actionable count.
    const pendingReviews = await Review.count({
      where: { status: "pending", ...reviewBrandWhere },
    });

    // Get recent orders (last 30 days) — brand-scoped like the rest of the view
    const recentOrders = await Order.count({
      where: {
        ...brandWhere,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    // ── Period-over-period deltas + daily revenue trend ─────────────────────
    // One 60-day pull powers both: last-30d vs prior-30d comparison (the KPI
    // arrows) and a per-day revenue series (the area chart). Always a 30-day
    // window regardless of the page date filter, matching the "vs prev 30d"
    // labels in the design.
    const DAY_MS = 86400000;
    const sixtyDaysAgo = new Date(Date.now() - 60 * DAY_MS);
    const trendOrders = await Order.findAll({
      attributes: ['final_amount', 'status', 'createdAt'],
      where: { ...brandWhere, createdAt: { [Op.gte]: sixtyDaysAgo } },
      raw: true,
    });
    let curEarned = 0, prevEarned = 0, curTotal = 0, prevTotal = 0, curCnt = 0, prevCnt = 0, todayCnt = 0;
    const dayRev = {};
    const nowMs = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const o of trendOrders) {
      const amt = parseFloat(o.final_amount || 0);
      const t = new Date(o.createdAt).getTime();
      const ageDays = (nowMs - t) / DAY_MS;
      // Match the headline earnedRevenue definition (delivered OR completed),
      // case-insensitively — otherwise the revenue-change arrow is computed on a
      // narrower basis than the number it sits next to.
      const st = String(o.status || '').toLowerCase();
      const earned = st === 'delivered' || st === 'completed';
      if (ageDays <= 30) {
        curCnt++; curTotal += amt; if (earned) curEarned += amt;
        const key = new Date(o.createdAt).toISOString().slice(0, 10);
        dayRev[key] = (dayRev[key] || 0) + amt;
        if (key === todayKey) todayCnt++;
      } else if (ageDays <= 60) {
        prevCnt++; prevTotal += amt; if (earned) prevEarned += amt;
      }
    }
    // No previous-period baseline (e.g. the store just launched) → return null
    // so the UI shows "New" instead of a misleading fake 100%. A real prior
    // period gives the true percentage.
    const pctChange = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
    // Only show a comparison % once the prior 30-day window has a solid sample.
    // Below this, a handful of early orders produces a real-but-meaningless
    // percentage (e.g. AOV −44%), so surface "New" (null) until there's history.
    const MIN_BASELINE_ORDERS = 10;
    const hasBaseline = prevCnt >= MIN_BASELINE_ORDERS;
    const curAov = curCnt > 0 ? curTotal / curCnt : 0;
    const prevAov = prevCnt > 0 ? prevTotal / prevCnt : 0;
    const deltas = {
      revenue: { pct: hasBaseline ? pctChange(curEarned, prevEarned) : null },
      orders: { pct: hasBaseline ? pctChange(curCnt, prevCnt) : null, today: todayCnt },
      aov: { pct: hasBaseline ? pctChange(curAov, prevAov) : null },
      customersNew: recentCustomers, // new customers in the last 30 days
    };
    const revenueTrend = [];
    for (let i = 29; i >= 0; i--) {
      const key = new Date(nowMs - i * DAY_MS).toISOString().slice(0, 10);
      revenueTrend.push(Math.round(dayRev[key] || 0));
    }

    // Get recent orders list (Last 10 orders)
    const recentOrdersList = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { 
          model: User, 
          as: 'User',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        { 
          model: GuestUser, 
          as: 'GuestUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      attributes: ['id', 'order_number', 'final_amount', 'status', 'payment_type', 'payment_status', 'createdAt']
    });

    const formattedRecentOrders = recentOrdersList.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.User ? order.User.username : 
                    order.GuestUser ? `${order.GuestUser.firstName} ${order.GuestUser.lastName}` : 
                    'Guest',
      customerEmail: order.User ? order.User.email : 
                     order.GuestUser ? order.GuestUser.email : 
                     'N/A',
      amount: parseFloat(order.final_amount),
      status: order.status,
      paymentType: order.payment_type,
      paymentStatus: order.payment_status,
      date: order.createdAt
    }));

    // Get top selling products (Top 10 by revenue)
    const topProducts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count,
        AVG(oi.price) as avg_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE LOWER(o.status) NOT IN ('cancelled', 'order cancelled')
        AND (:brandId IS NULL OR o.brand_id = :brandId)
      GROUP BY p.id, p.name, p.slug
      ORDER BY total_revenue DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT, replacements: { brandId: brandId || null } });

    const formattedTopProducts = topProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.avg_price || 0),
      totalSold: parseInt(product.total_sold || 0),
      totalRevenue: parseFloat(product.total_revenue || 0),
      orderCount: parseInt(product.order_count || 0)
    }));

    // Get low stock products
    const lowStockProducts = await sequelize.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        pv.id as variation_id,
        pv.sku,
        pv.stock,
        pv.attributes
      FROM product_variations pv
      JOIN products p ON pv.productId = p.id
      WHERE pv.stock < 10 AND pv.stock > 0
        AND (:brandId IS NULL OR EXISTS (
          SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId))
      ORDER BY pv.stock ASC
      LIMIT 20
    `, { type: QueryTypes.SELECT, replacements: { brandId: brandId || null } });

    const [oosRow] = await sequelize.query(`
      SELECT COUNT(*) AS cnt
      FROM product_variations pv
      JOIN products p ON pv.productId = p.id
      WHERE pv.stock = 0
        AND (:brandId IS NULL OR EXISTS (
          SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId))
    `, { type: QueryTypes.SELECT, replacements: { brandId: brandId || null } });
    const outOfStockCount = parseInt(oosRow?.cnt || 0);

    const formattedLowStock = lowStockProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      variationId: product.variation_id,
      sku: product.sku,
      stock: parseInt(product.stock),
      attributes: product.attributes
    }));

    // Order status distribution — all statuses
    const orderStatusDistribution = {
      awaiting_confirmation: statusCounts['awaiting_confirmation'] || 0,
      pending: statusCounts['pending'] || 0,
      confirmed: statusCounts['confirmed'] || 0,
      processing: statusCounts['processing'] || 0,
      booked: statusCounts['booked'] || 0,
      'pickup initiated': statusCounts['pickup initiated'] || 0,
      manifested: statusCounts['manifested'] || 0,
      'in transit': statusCounts['in transit'] || 0,
      shipped: statusCounts['shipped'] || 0,
      'out for delivery': statusCounts['out for delivery'] || 0,
      delivered: statusCounts['delivered'] || 0,
      undelivered: statusCounts['undelivered'] || 0,
      rto: statusCounts['rto'] || 0,
      'rto delivered': statusCounts['rto delivered'] || 0,
      return_initiated: statusCounts['return_initiated'] || 0,
      returned_rto: statusCounts['returned_rto'] || 0,
      cancelled: statusCounts['cancelled'] || 0,
      'order cancelled': statusCounts['order cancelled'] || 0,
      exception: statusCounts['exception'] || 0,
    };

    const orderStatusChart = [
      {
        label: 'Awaiting Confirmation',
        value: (statusCounts['awaiting_confirmation'] || 0),
        color: '#f97316'
      },
      {
        label: 'Pending',
        value: (statusCounts['pending'] || 0),
        color: '#f59e0b'
      },
      {
        label: 'Confirmed / Processing',
        value: (statusCounts['confirmed'] || 0) + (statusCounts['processing'] || 0),
        color: '#3b82f6'
      },
      {
        label: 'Booked / Pickup',
        value: (statusCounts['booked'] || 0) + (statusCounts['pickup initiated'] || 0) + (statusCounts['manifested'] || 0),
        color: '#8b5cf6'
      },
      {
        label: 'In Transit / Shipped',
        value: (statusCounts['shipped'] || 0) + (statusCounts['in transit'] || 0),
        color: '#0891b2'
      },
      {
        label: 'Out for Delivery',
        value: (statusCounts['out for delivery'] || 0),
        color: '#65a30d'
      },
      {
        label: 'Delivered',
        value: (statusCounts['delivered'] || 0) + (statusCounts['completed'] || 0),
        color: '#10b981'
      },
      {
        label: 'Undelivered',
        value: (statusCounts['undelivered'] || 0),
        color: '#dc2626'
      },
      {
        label: 'RTO / Returned',
        value: (statusCounts['rto'] || 0) + (statusCounts['rto delivered'] || 0) + (statusCounts['return_initiated'] || 0) + (statusCounts['returned_rto'] || 0),
        color: '#64748b'
      },
      {
        label: 'Cancelled',
        value: (statusCounts['cancelled'] || 0) + (statusCounts['order cancelled'] || 0),
        color: '#ef4444'
      },
      {
        label: 'Exception',
        value: (statusCounts['exception'] || 0),
        color: '#7f1d1d'
      }
    ].filter(item => item.value > 0);

    // Payment distribution (accumulated above from the grouped rows).
    const paymentDistribution = {
      cod: { count: codCount, revenue: codRevenue },
      prepaid: { count: prepaidCount, revenue: prepaidRevenue }
    };

    const paymentStatusChart = [
      {
        label: 'Paid',
        value: paymentStatusCounts['paid'],
        color: '#10b981'
      },
      {
        label: 'Pending',
        value: paymentStatusCounts['pending'],
        color: '#f59e0b'
      },
      {
        label: 'Failed',
        value: paymentStatusCounts['failed'],
        color: '#ef4444'
      },
      {
        label: 'Refunded',
        value: paymentStatusCounts['refunded'],
        color: '#8b5cf6'
      },
      {
        label: 'Refund Pending',
        value: paymentStatusCounts['refund_pending'],
        color: '#a78bfa'
      },
      {
        label: 'Cancelled',
        value: paymentStatusCounts['cancelled'],
        color: '#6b7280'
      }
    ].filter(item => item.value > 0);

    const paymentChart = [
      {
        label: 'COD',
        value: paymentDistribution.cod.revenue,
        count: paymentDistribution.cod.count,
        color: '#f59e0b',
        percentage: totalRevenue > 0 ? parseFloat(((paymentDistribution.cod.revenue / totalRevenue) * 100).toFixed(1)) : 0
      },
      {
        label: 'Prepaid',
        value: paymentDistribution.prepaid.revenue,
        count: paymentDistribution.prepaid.count,
        color: '#10b981',
        percentage: totalRevenue > 0 ? parseFloat(((paymentDistribution.prepaid.revenue / totalRevenue) * 100).toFixed(1)) : 0
      }
    ].filter(item => item.value > 0);

    // RTO statistics
    const totalRtoCount = (statusCounts['rto'] || 0) + (statusCounts['rto delivered'] || 0) + (statusCounts['return_initiated'] || 0) + (statusCounts['returned_rto'] || 0);
    const rtoStats = {
      totalRTO: totalRtoCount,
      rtoRevenue: parseFloat(rtoRevenue.toFixed(2)),
      rtoRate: totalOrders > 0 ? parseFloat(((totalRtoCount / totalOrders) * 100).toFixed(2)) : 0,
      rtoPercentageOfRevenue: totalRevenue > 0 ? parseFloat(((rtoRevenue / totalRevenue) * 100).toFixed(2)) : 0,
      averageRTOValue: totalRtoCount > 0 ? parseFloat((rtoRevenue / totalRtoCount).toFixed(2)) : 0
    };

    // UTM tracking analytics
    const utmStats = await sequelize.query(`
      SELECT 
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END) as registered_users,
        COUNT(DISTINCT CASE WHEN guest_user_id IS NOT NULL THEN guest_user_id END) as guest_users
      FROM utm_tracking
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND (:brandId IS NULL OR brand_id = :brandId)
      GROUP BY utm_source, utm_medium, utm_campaign
      ORDER BY sessions DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT, replacements: { brandId: brandId || null } });

    const utmConversions = await sequelize.query(`
      SELECT 
        utm.utm_source,
        utm.utm_medium,
        COUNT(DISTINCT utm.session_id) as total_sessions,
        COUNT(DISTINCT o.id) as orders,
        SUM(CASE WHEN LOWER(o.status) NOT IN ('cancelled', 'order cancelled') THEN o.final_amount ELSE 0 END) as revenue
      FROM utm_tracking utm
      LEFT JOIN orders o ON utm.id = o.utm_tracking_id
      WHERE utm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND (:brandId IS NULL OR utm.brand_id = :brandId)
      GROUP BY utm.utm_source, utm.utm_medium
      ORDER BY revenue DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT, replacements: { brandId: brandId || null } });

    const formattedUTMStats = utmStats.map(stat => ({
      source: stat.utm_source || 'Direct',
      medium: stat.utm_medium || 'None',
      campaign: stat.utm_campaign || 'N/A',
      sessions: parseInt(stat.sessions || 0),
      registeredUsers: parseInt(stat.registered_users || 0),
      guestUsers: parseInt(stat.guest_users || 0)
    }));

    const formattedUTMConversions = utmConversions.map(conv => ({
      source: conv.utm_source || 'Direct',
      medium: conv.utm_medium || 'None',
      sessions: parseInt(conv.total_sessions || 0),
      orders: parseInt(conv.orders || 0),
      revenue: parseFloat(conv.revenue || 0),
      conversionRate: parseInt(conv.total_sessions || 0) > 0 
        ? parseFloat(((parseInt(conv.orders || 0) / parseInt(conv.total_sessions || 0)) * 100).toFixed(2))
        : 0
    }));

    const utmSourceChart = formattedUTMStats.slice(0, 5).map((stat, index) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
      return {
        label: stat.source,
        value: stat.sessions,
        color: colors[index % colors.length]
      };
    });

    // ─── Brand-wise sales ───────────────────────────────────────────
    // The admin runs several storefronts (Crosscoin, Gripzus, Morbix …).
    // When the dashboard is NOT scoped to a single brand, break the sales
    // down per brand so the admin can see how each storefront performs.
    // Built from the per-brand buckets accumulated from the grouped order query
    // (respects the date filter and, if present, the single-brand scope).
    let brandSales = [];
    try {
      const brandRows = await Brand.findAll({
        attributes: ['id', 'name', 'display_name', 'slug', 'logo_url'],
      });
      const brandMap = new Map();
      brandRows.forEach((b) => {
        brandMap.set(b.id, {
          brandId: b.id,
          name: b.display_name || b.name,
          slug: b.slug,
          logo: b.logo_url || null,
          orders: 0,
          revenue: 0,   // total (all statuses)
          earned: 0,    // delivered / completed only
          lost: 0,      // cancelled + RTO
        });
      });

      const bucketFor = (id) => {
        if (!brandMap.has(id)) {
          // Orders whose brand was deleted / unknown — group under "Other".
          brandMap.set(id, {
            brandId: id, name: id ? `Brand #${id}` : 'Unassigned', slug: null,
            logo: null, orders: 0, revenue: 0, earned: 0, lost: 0,
          });
        }
        return brandMap.get(id);
      };

      // Fold the per-brand buckets accumulated from the grouped query.
      brandAgg.forEach((agg, id) => {
        const b = bucketFor(id || null);
        b.orders += agg.orders;
        b.revenue += agg.revenue;
        b.earned += agg.earned;
        b.lost += agg.lost;
      });

      const palette = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#2563eb', '#db2777', '#65a30d'];
      brandSales = [...brandMap.values()]
        .filter((b) => b.orders > 0)              // only brands with activity
        .sort((a, b) => b.revenue - a.revenue)
        .map((b, i) => ({
          brandId: b.brandId,
          name: b.name,
          slug: b.slug,
          logo: b.logo,
          orders: b.orders,
          revenue: parseFloat(b.revenue.toFixed(2)),
          earned: parseFloat(b.earned.toFixed(2)),
          lost: parseFloat(b.lost.toFixed(2)),
          avgOrderValue: b.orders > 0 ? parseFloat((b.revenue / b.orders).toFixed(2)) : 0,
          share: totalRevenue > 0 ? parseFloat(((b.revenue / totalRevenue) * 100).toFixed(1)) : 0,
          color: palette[i % palette.length],
        }));
    } catch (brandErr) {
      console.error('Brand-wise sales aggregation failed:', brandErr.message);
      brandSales = [];
    }

    return {
      success: true,
      stats: {
        products: {
          total: totalProducts,
          active: activeProducts,
          inactive: totalProducts - activeProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrdersCount,
          cancelled: cancelledOrders,
          recent: recentOrders,
          statusDistribution: orderStatusDistribution,
          statusChart: orderStatusChart
        },
        deltas,
        revenueTrend,
        revenue: {
          total: parseFloat(totalRevenue.toFixed(2)),
          earned: parseFloat(earnedRevenue.toFixed(2)),
          active: parseFloat(activeRevenue.toFixed(2)),
          lost: parseFloat(lostRevenue.toFixed(2)),
          monthly: parseFloat(monthlyRevenue.toFixed(2)),
          average: parseFloat(avgOrderValue.toFixed(2)),
          breakdown: {
            delivered: parseFloat(deliveredRevenue.toFixed(2)),
            shipped: parseFloat(shippedRevenue.toFixed(2)),
            processing: parseFloat(processingRevenue.toFixed(2)),
            pending: parseFloat(pendingRevenue.toFixed(2)),
            undelivered: parseFloat(undeliveredRevenue.toFixed(2)),
            rto: parseFloat(rtoRevenue.toFixed(2)),
            cancelled: parseFloat(cancelledRevenue.toFixed(2)),
          },
          donutChart: [
            {
              label: 'Delivered',
              value: parseFloat(deliveredRevenue.toFixed(2)),
              color: '#10b981',
              percentage: totalRevenue > 0 ? parseFloat(((deliveredRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Shipped / In Transit',
              value: parseFloat(shippedRevenue.toFixed(2)),
              color: '#0891b2',
              percentage: totalRevenue > 0 ? parseFloat(((shippedRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Processing',
              value: parseFloat(processingRevenue.toFixed(2)),
              color: '#3b82f6',
              percentage: totalRevenue > 0 ? parseFloat(((processingRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Pending',
              value: parseFloat(pendingRevenue.toFixed(2)),
              color: '#f59e0b',
              percentage: totalRevenue > 0 ? parseFloat(((pendingRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Undelivered',
              value: parseFloat(undeliveredRevenue.toFixed(2)),
              color: '#dc2626',
              percentage: totalRevenue > 0 ? parseFloat(((undeliveredRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'RTO / Returned',
              value: parseFloat(rtoRevenue.toFixed(2)),
              color: '#64748b',
              percentage: totalRevenue > 0 ? parseFloat(((rtoRevenue / totalRevenue) * 100).toFixed(1)) : 0
            },
            {
              label: 'Cancelled',
              value: parseFloat(cancelledRevenue.toFixed(2)),
              color: '#ef4444',
              percentage: totalRevenue > 0 ? parseFloat(((cancelledRevenue / totalRevenue) * 100).toFixed(1)) : 0
            }
          ].filter(item => item.value > 0)
        },
        customers: {
          total: totalCustomers,
          recent: recentCustomers,
        },
        reviews: {
          total: totalReviews,
          approved: approvedReviews,
          pending: pendingReviews,
        },
        recentOrders: formattedRecentOrders,
        topProducts: formattedTopProducts,
        lowStock: {
          products: formattedLowStock,
          outOfStockCount: outOfStockCount,
          lowStockCount: formattedLowStock.length
        },
        paymentDistribution: {
          cod: paymentDistribution.cod,
          prepaid: paymentDistribution.prepaid,
          chart: paymentChart
        },
        paymentStatusDistribution: {
          counts: paymentStatusCounts,
          chart: paymentStatusChart
        },
        rtoStats: rtoStats,
        brandSales: brandSales,
        utmTracking: {
          topSources: formattedUTMStats,
          conversions: formattedUTMConversions,
          sourceChart: utmSourceChart
        }
      },
    };
  } catch (error) {
    console.error("Error aggregating dashboard data:", error);
    throw error;
  }
};

/**
 * Gets dashboard data with Redis caching
 * Checks cache first, returns cached data if available
 * Otherwise aggregates from database and stores in cache
 * Requirements: 1.4
 */
const getDashboardDataWithCache = async (userId, brandId) => {
  const cacheKey = DASHBOARD_CACHE_KEY(userId, brandId);
  
  try {
    const cachedData = await cacheManager.get(cacheKey);

    if (cachedData) {
      console.log(`✅ Dashboard cache HIT for user ${userId}`);
      return { ...cachedData, cacheHit: true };
    }

    console.log(`⚠️ Dashboard cache MISS for user ${userId}, aggregating from database...`);
    
    const aggregatedData = await aggregateDashboardData(userId, brandId);

    await cacheManager.set(cacheKey, aggregatedData, DASHBOARD_CACHE_TTL);

    console.log(`✅ Dashboard data cached for user ${userId} with TTL ${DASHBOARD_CACHE_TTL}s`);
    
    return { ...aggregatedData, cacheHit: false };
  } catch (error) {
    console.error("Error getting dashboard data with cache:", error);
    const aggregatedData = await aggregateDashboardData(userId, brandId);
    return { ...aggregatedData, cacheHit: false, cacheError: error.message };
  }
};

/**
 * Invalidates dashboard cache for a user
 * Called when relevant user actions occur (order creation, badge updates, profile changes)
 * Requirements: 1.4
 */
const invalidateDashboardCache = async (brandId) => {
  // Cache keys are per-BRAND (`dashboard:brand:<id>:stats`), not per-user. An
  // order event must clear BOTH the affected brand's cache AND the cross-brand
  // "all" view, otherwise a brand-scoped dashboard kept serving stale numbers
  // until the 60s TTL. (This arg used to be a userId, which never matched any
  // key, so only the "all" key — by accident — was ever cleared.)
  const keys = new Set([DASHBOARD_CACHE_KEY(null, 'all')]);
  if (brandId !== undefined && brandId !== null && brandId !== 'all' && brandId !== 'admin') {
    keys.add(DASHBOARD_CACHE_KEY(null, brandId));
  }
  try {
    await Promise.all([...keys].map(k => cacheManager.delete(k)));
    console.log(`✅ Dashboard cache invalidated: ${[...keys].join(', ')}`);
  } catch (error) {
    console.error("Error invalidating dashboard cache:", error);
  }
};

module.exports = {
  aggregateDashboardData,
  getDashboardDataWithCache,
  invalidateDashboardCache,
  DASHBOARD_CACHE_KEY,
  DASHBOARD_CACHE_TTL
};
