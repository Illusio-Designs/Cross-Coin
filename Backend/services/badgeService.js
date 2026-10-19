const { ProductVariation } = require('../model/associations');
const { sequelize } = require('../config/db');
const badgeConfig = require('../config/badgeConfig');

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
   * Update product badge if changed (skipped while the badge is locked)
   * @param {Object} product - Product instance
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<boolean>} - True if badge was updated
   */
  static async updateBadgeIfChanged(product, transaction = null) {
    try {
      // A badge staff set by hand (products.badge_locked) is never replaced —
      // not on save, not by an order, not by the nightly refresh.
      if (await require('./productStockService.js').isBadgeLocked(product.id, transaction)) return false;
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
   * Recalculate badges for the products in one order — sales and stock just
   * changed for exactly these products. Fire-and-forget from order.created.
   */
  static async refreshBadgesForOrder(orderId) {
    const { OrderItem } = require('../model/orderItemModel.js');
    const { Product } = require('../model/productModel.js');
    const items = await OrderItem.findAll({ where: { order_id: orderId }, attributes: ['product_id'] });
    const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    if (!ids.length) return 0;
    const products = await Product.findAll({ where: { id: ids } });
    let changed = 0;
    for (const product of products) {
      if (await this.updateBadgeIfChanged(product)) changed++;
    }
    return changed;
  }

  /**
   * Recalculate every active product's badge. Run nightly so time-based
   * badges (new arrival expiring) and stock changes from returns/RTO stay
   * current without anyone editing the product.
   */
  static async refreshAllBadges() {
    const { Product } = require('../model/productModel.js');
    const products = await Product.findAll({ where: { status: 'active' } });
    let changed = 0;
    for (const product of products) {
      if (await this.updateBadgeIfChanged(product)) changed++;
    }
    return { checked: products.length, changed };
  }

}

module.exports = BadgeService;
