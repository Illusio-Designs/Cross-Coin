const { Product } = require("../../model/productModel.js");
const { Order } = require("../../model/orderModel.js");
const { OrderItem } = require("../../model/orderItemModel.js");
const { sequelize } = require("../../config/db.js");
const redis = require("redis");
const { invalidateDashboardCache } = require("../../services/dashboardService.js");
// Import batch insert utility for efficient bulk operations
const { batchInsert } = require("../../utils/batchInsert.js");

// Create Redis client for cache invalidation
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

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
  const { user_id, badge_types } = job.data;
  
  console.log(`🏅 Processing badge recalculation for user ${user_id}`);
  
  try {
    // Fetch user's transaction history (orders)
    console.log(`  📊 Fetching order history for user ${user_id}...`);
    const orders = await Order.findAll({
      where: { user_id },
      include: [
        {
          model: OrderItem,
          as: "OrderItems",
          include: [Product],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log(`  ✅ Found ${orders.length} orders`);

    // Calculate badge eligibility based on transaction history
    const badges = calculateBadgeEligibility(orders, user_id);
    
    console.log(`  🎖️ Calculated badges:`, badges);

    // BATCH UPDATE: Update badges for all products in user's orders
    console.log(`  📦 Batch updating badges for ${Object.keys(badges).length} products...`);
    let updatedCount = 0;
    const updatePromises = [];
    
    for (const order of orders) {
      if (order.OrderItems) {
        for (const item of order.OrderItems) {
          if (item.Product) {
            const product = item.Product;
            
            // Check if badge needs updating
            const newBadge = badges[product.id] || null;
            if (product.badge !== newBadge) {
              updatePromises.push(
                product.update({ badge: newBadge }).then(() => {
                  updatedCount++;
                  console.log(`  ✅ Updated badge for product ${product.id}: ${product.badge} → ${newBadge}`);
                })
              );
            }
          }
        }
      }
    }

    // Execute all updates in parallel for better performance
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`✅ Batch update complete - ${updatedCount} products updated`);
    }

    // Invalidate user dashboard cache
    console.log(`  🗑️ Invalidating dashboard cache for user ${user_id}...`);
    try {
      await invalidateDashboardCache(user_id);
    } catch (cacheError) {
      console.warn(`  ⚠️ Cache invalidation warning:`, cacheError.message);
      // Don't fail the job if cache invalidation fails
    }

    console.log(`✅ Badge recalculation complete for user ${user_id} - ${updatedCount} products updated`);
    
    return {
      success: true,
      user_id,
      orders_processed: orders.length,
      products_updated: updatedCount,
      badges_calculated: Object.keys(badges).length,
    };
  } catch (error) {
    console.error(`❌ Error processing badge recalculation for user ${user_id}:`, error);
    throw error; // Re-throw to trigger retry
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
