const { Product } = require("../../model/productModel.js");
const { Order } = require("../../model/orderModel.js");
const { OrderItem } = require("../../model/orderItemModel.js");
const { sequelize } = require("../../config/db.js");
const redisService = require("../../services/redisService.js");
const { invalidateDashboardCache } = require("../../services/dashboardService.js");
const { batchInsert } = require("../../utils/batchInsert.js");
const { logger } = require("../../config/logging.js");

/**
 * Process badge recalculation job
 * Fetches user transaction history, calculates badge eligibility, and updates badges
 * 
 * @param {Object} job - Bull job object
 * @param {number} job.data.user_id - User ID to recalculate badges for
 * @param {string[]} job.data.badge_types - Types of badges to recalculate (optional)
 * @returns {Object} Job result
 */
const processBadgeRecalculation = async (job) => {
  const { user_id } = job.data;
  try {
    const orders = await Order.findAll({
      where: { user_id },
      include: [{ model: OrderItem, as: 'OrderItems', include: [Product] }],
      order: [['createdAt', 'DESC']],
      limit: 30, // reduced from 50 — saves memory on 2GB server
    });

    const badges = calculateBadgeEligibility(orders, user_id);
    let updatedCount = 0;

    for (const order of orders) {
      for (const item of (order.OrderItems || [])) {
        if (item.Product) {
          const newBadge = badges[item.Product.id] || null;
          if (item.Product.badge !== newBadge) {
            await item.Product.update({ badge: newBadge });
            updatedCount++;
          }
        }
      }
    }

    try { await invalidateDashboardCache(user_id); } catch (e) { logger.warn('[Badge] dashboard cache invalidation failed:', e.message); }

    return { success: true, user_id, orders_processed: orders.length, products_updated: updatedCount };
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate badge eligibility based on user's transaction history
 * 
 * @param {Object[]} orders - Array of user's orders
 * @param {number} user_id - User ID
 * @returns {Object} Map of product ID to badge type
 */
const calculateBadgeEligibility = (orders, user_id) => {
  const badges = {};
  
  // Calculate metrics
  let totalOrders = orders.length;
  let totalSpent = 0;
  let totalItems = 0;
  const productPurchaseCount = {};
  
  for (const order of orders) {
    totalSpent += order.final_amount || 0;
    
    if (order.OrderItems) {
      for (const item of order.OrderItems) {
        totalItems += item.quantity || 0;
        
        if (item.product_id) {
          productPurchaseCount[item.product_id] = (productPurchaseCount[item.product_id] || 0) + 1;
        }
      }
    }
  }
  
  // Assign badges based on criteria
  for (const productId in productPurchaseCount) {
    const purchaseCount = productPurchaseCount[productId];
    
    if (purchaseCount >= 5) {
      badges[productId] = "bestseller"; // Purchased 5+ times
    } else if (purchaseCount >= 3) {
      badges[productId] = "popular"; // Purchased 3-4 times
    } else if (purchaseCount >= 1) {
      badges[productId] = "trending"; // Purchased 1-2 times
    }
  }
  
  // Global user badges (not product-specific, but useful for context)
  console.log(`  📈 User metrics - Orders: ${totalOrders}, Spent: $${totalSpent}, Items: ${totalItems}`);
  
  return badges;
};

module.exports = {
  processBadgeRecalculation,
  calculateBadgeEligibility,
};
