const { ProductVariation } = require('../model/associations');
const { sequelize } = require('../config/db');
const badgeConfig = require('../config/badgeConfig');
const badgeQueue = require('../queue/badgeQueue');

class BadgeService {
  /**
   * Calculate product badge based on current state
   * Checks product and all its variations
   * @param {Object} product - Product instance
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<string>} - Badge value
   */
  static async calculateBadge(product, transaction = null) {
    try {
      const now = new Date();
      const newArrivalCutoff = new Date(
        now.getTime() - badgeConfig.NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000
      );

      // Check 1: Is product new arrival?
      const isNewArrival = product.created_at > newArrivalCutoff;

      // Check 2: Is product hot selling? - Calculate from actual orders
      const totalSoldResult = await sequelize.query(
        `SELECT SUM(oi.quantity) as total_quantity
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE oi.product_id = ? AND o.status != 'cancelled'`,
        {
          replacements: [product.id],
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      const totalSold = totalSoldResult[0]?.total_quantity || 0;
      const isHotSelling = totalSold >= badgeConfig.HOT_SELLING_THRESHOLD;

      // Also get per-variation sales for debugging
      const variationSalesResult = await sequelize.query(
        `SELECT oi.variation_id, SUM(oi.quantity) as qty
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE oi.product_id = ? AND o.status != 'cancelled'
         GROUP BY oi.variation_id`,
        {
          replacements: [product.id],
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      const variationSales = variationSalesResult.map(v => ({
        variationId: v.variation_id,
        quantity: v.qty
      }));

      // Check 3: Get all variations for this product
      const variations = await ProductVariation.findAll({
        where: { productId: product.id },
        transaction,
        attributes: ['id', 'stock', 'sku']
      });

      // Check 4: Check stock status
      const hasLowStock = variations.some(
        v => v.stock < badgeConfig.LOW_STOCK_THRESHOLD && 
             v.stock > badgeConfig.OUT_OF_STOCK_THRESHOLD
      );

      const allOutOfStock = variations.length > 0 && 
        variations.every(v => v.stock <= badgeConfig.OUT_OF_STOCK_THRESHOLD);

      // Debug logging
      console.log('Badge Calculation:', {
        productId: product.id,
        productName: product.name,
        created_at: product.created_at,
        newArrivalCutoff: newArrivalCutoff,
        isNewArrival: isNewArrival,
        totalSoldFromOrders: totalSold,
        variationSales: variationSales,
        isHotSelling: isHotSelling,
        hotSellingThreshold: badgeConfig.HOT_SELLING_THRESHOLD,
        variationCount: variations.length,
        variations: variations.map(v => ({ id: v.id, stock: v.stock })),
        hasLowStock: hasLowStock,
        allOutOfStock: allOutOfStock
      });

      // Determine badge by priority
      if (allOutOfStock) {
        return 'out_of_stock';
      } else if (isNewArrival) {
        return 'new_arrival';
      } else if (isHotSelling) {
        return 'hot_selling';
      } else if (hasLowStock) {
        return 'low_stock';
      }

      return 'none';
    } catch (error) {
      console.error('Error calculating badge:', error);
      return 'none';
    }
  }

  /**
   * Update product badge if changed
   * @param {Object} product - Product instance
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<boolean>} - True if badge was updated
   */
  static async updateBadgeIfChanged(product, transaction = null) {
    try {
      const newBadge = await this.calculateBadge(product, transaction);
      const oldBadge = product.badge;

      if (newBadge !== oldBadge) {
        await product.update({ badge: newBadge }, { transaction });
        console.info(`Badge updated for product ${product.id}: ${oldBadge} → ${newBadge}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating badge:', error);
      return false;
    }
  }

  /**
   * Enqueue badge recalculation job for async processing
   * Non-blocking - returns immediately
   * 
   * @param {number} user_id - User ID to recalculate badges for
   * @param {string[]} badge_types - Types of badges to recalculate (optional)
   * @returns {Promise<Object>} - Job object
   */
  static async enqueueBadgeRecalculation(user_id, badge_types = []) {
    try {
      console.log(`📤 Enqueueing badge recalculation for user ${user_id}`);
      
      const job = await badgeQueue.add(
        {
          user_id,
          badge_types,
        },
        {
          priority: 'normal',
          delay: 0, // Process immediately
        }
      );
      
      console.log(`✅ Badge recalculation job ${job.id} enqueued for user ${user_id}`);
      return job;
    } catch (error) {
      console.error(`❌ Error enqueueing badge recalculation:`, error);
      // Don't throw - allow order creation to continue even if queue fails
      return null;
    }
  }

  /**
   * Get badge display configuration
   * @param {string} badge - Badge value
   * @returns {Object} - Display configuration
   */
  static getBadgeDisplay(badge) {
    return badgeConfig.BADGE_DISPLAY[badge] || badgeConfig.BADGE_DISPLAY['none'];
  }
}

module.exports = BadgeService;
