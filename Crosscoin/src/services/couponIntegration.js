// Coupon Integration Service - Manages quantity-based coupons for offers
import { validateCoupon, getPublicCoupons } from './publicindex';

class CouponIntegrationService {
  constructor() {
    this.cachedCoupons = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Get all quantity-based coupons with caching
  async getQuantityBasedCoupons() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cachedCoupons && this.cacheExpiry && now < this.cacheExpiry) {
      console.log('CouponIntegrationService: Returning cached coupons');
      return this.cachedCoupons;
    }

    try {
      console.log('CouponIntegrationService: Fetching coupons from API');
      const response = await getPublicCoupons();
      console.log('CouponIntegrationService: API response:', response);
      
      if (response && response.coupons) {
        // Filter for quantity-based coupons
        const quantityCoupons = response.coupons.filter(coupon => 
          coupon.type === 'quantity_based' && 
          coupon.status === 'active' &&
          coupon.quantityBasedDiscounts &&
          new Date(coupon.endDate) > new Date()
        );

        console.log('CouponIntegrationService: Found quantity coupons:', quantityCoupons.length);

        // Parse and validate quantity tiers
        const validCoupons = quantityCoupons.map(coupon => {
          let quantityTiers = [];
          
          try {
            quantityTiers = typeof coupon.quantityBasedDiscounts === 'string' 
              ? JSON.parse(coupon.quantityBasedDiscounts)
              : coupon.quantityBasedDiscounts || [];
          } catch (e) {
            console.error('CouponIntegrationService: Error parsing quantity tiers for coupon:', coupon.code, e);
            return null;
          }

          if (!Array.isArray(quantityTiers) || quantityTiers.length === 0) {
            console.warn('CouponIntegrationService: Invalid quantity tiers for coupon:', coupon.code);
            return null;
          }

          // Sort tiers by minQuantity
          quantityTiers.sort((a, b) => a.minQuantity - b.minQuantity);

          return {
            ...coupon,
            parsedTiers: quantityTiers
          };
        }).filter(Boolean);

        console.log('CouponIntegrationService: Valid coupons after parsing:', validCoupons.length);

        // Cache the results
        this.cachedCoupons = validCoupons;
        this.cacheExpiry = now + this.CACHE_DURATION;

        return validCoupons;
      } else {
        console.warn('CouponIntegrationService: No coupons in API response');
        return [];
      }
    } catch (error) {
      console.error('CouponIntegrationService: Error fetching quantity-based coupons:', error);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Get the best offer for current cart
  async getBestOfferForCart(cartItems, cartTotal) {
    const coupons = await this.getQuantityBasedCoupons();
    if (coupons.length === 0) return null;

    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    let bestCurrentOffer = null;
    let bestNextOffer = null;

    coupons.forEach(coupon => {
      const tiers = coupon.parsedTiers;

      // Find current applicable tier
      const applicableTiers = tiers.filter(tier => totalQuantity >= tier.minQuantity);
      if (applicableTiers.length > 0) {
        const currentTier = applicableTiers[applicableTiers.length - 1];
        if (!bestCurrentOffer || parseFloat(currentTier.discount) > parseFloat(bestCurrentOffer.discount)) {
          bestCurrentOffer = {
            coupon,
            tier: currentTier,
            discount: parseFloat(currentTier.discount),
            currentQuantity: totalQuantity,
            type: 'current'
          };
        }
      }

      // Find next tier to achieve
      const nextTier = tiers.find(tier => totalQuantity < tier.minQuantity);
      if (nextTier) {
        if (!bestNextOffer || parseFloat(nextTier.discount) > parseFloat(bestNextOffer.discount)) {
          bestNextOffer = {
            coupon,
            tier: nextTier,
            discount: parseFloat(nextTier.discount),
            currentQuantity: totalQuantity,
            remaining: nextTier.minQuantity - totalQuantity,
            progress: (totalQuantity / nextTier.minQuantity) * 100,
            type: 'next'
          };
        }
      }
    });

    return {
      current: bestCurrentOffer,
      next: bestNextOffer,
      totalQuantity
    };
  }

  // Validate and apply a coupon
  async validateAndApplyCoupon(couponCode, cartItems, cartTotal, paymentMode = null) {
    try {
      const cartItemsForValidation = cartItems.map(item => ({
        productId: item.productId || item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const response = await validateCoupon(
        couponCode,
        cartTotal,
        paymentMode,
        cartItemsForValidation
      );

      if (response && response.success) {
        return {
          success: true,
          coupon: response.coupon,
          discountAmount: parseFloat(response.discountAmount),
          finalAmount: parseFloat(response.finalAmount),
          message: response.message
        };
      } else {
        return {
          success: false,
          message: response?.message || 'Invalid coupon'
        };
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        success: false,
        message: error.message || 'Failed to validate coupon'
      };
    }
  }

  // Get offer display data for UI
  async getOfferDisplayData(cartItems, cartTotal) {
    const offers = await this.getBestOfferForCart(cartItems, cartTotal);
    if (!offers) return null;

    const { current, next, totalQuantity } = offers;

    // If user has achieved an offer
    if (current && !next) {
      return {
        type: 'achieved',
        coupon: current.coupon,
        tier: current.tier,
        discount: current.discount,
        currentQuantity: totalQuantity,
        message: `You've unlocked "${current.coupon.description || current.coupon.code}"!`,
        badgeText: this.formatDiscount(current.discount, current.coupon),
        canApply: true
      };
    }

    // Show next offer to achieve
    if (next) {
      return {
        type: 'progress',
        coupon: next.coupon,
        tier: next.tier,
        discount: next.discount,
        currentQuantity: totalQuantity,
        targetQuantity: next.tier.minQuantity,
        remaining: next.remaining,
        progress: next.progress,
        message: `Add ${next.remaining} more item${next.remaining > 1 ? 's' : ''} to get ${this.formatDiscount(next.discount, next.coupon)}`,
        badgeText: this.formatDiscount(next.discount, next.coupon),
        canApply: false
      };
    }

    return null;
  }

  // Format discount for display
  formatDiscount(discount, coupon) {
    if (coupon.type === 'quantity_based') {
      return `₹${discount} OFF`;
    } else if (coupon.type === 'percentage') {
      return `${discount}% OFF`;
    }
    return `₹${discount} OFF`;
  }

  // Clear cache (useful for admin updates)
  clearCache() {
    this.cachedCoupons = null;
    this.cacheExpiry = null;
  }

  // Get all available offers (for admin/analytics)
  async getAllOffers() {
    const coupons = await this.getQuantityBasedCoupons();
    return coupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      status: coupon.status,
      tiers: coupon.parsedTiers,
      usageCount: coupon.usageCount,
      usageLimit: coupon.usageLimit,
      startDate: coupon.startDate,
      endDate: coupon.endDate
    }));
  }

  // Check if a specific quantity would unlock any offers
  async getOffersForQuantity(quantity, cartTotal) {
    const coupons = await this.getQuantityBasedCoupons();
    const applicableOffers = [];

    coupons.forEach(coupon => {
      const applicableTiers = coupon.parsedTiers.filter(tier => quantity >= tier.minQuantity);
      if (applicableTiers.length > 0) {
        const bestTier = applicableTiers[applicableTiers.length - 1];
        applicableOffers.push({
          coupon,
          tier: bestTier,
          discount: parseFloat(bestTier.discount)
        });
      }
    });

    // Sort by discount amount (highest first)
    return applicableOffers.sort((a, b) => b.discount - a.discount);
  }
}

// Create singleton instance
const couponIntegrationService = new CouponIntegrationService();

export default couponIntegrationService;