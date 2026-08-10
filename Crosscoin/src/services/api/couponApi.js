import { getPublicCoupons, validateCoupon } from "./productApi";

export class CouponIntegrationService {
  constructor() {
    this.cachedCoupons = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  async getQuantityBasedCoupons() {
    const now = Date.now();
    if (this.cachedCoupons && this.cacheExpiry && now < this.cacheExpiry) return this.cachedCoupons;
    try {
      const response = await getPublicCoupons();
      if (response?.coupons) {
        const validCoupons = response.coupons
          .filter(c => c.type === 'quantity_based' && c.status === 'active' && c.quantityBasedDiscounts && new Date(c.endDate) > new Date())
          .map(coupon => {
            let quantityTiers = [];
            try { quantityTiers = typeof coupon.quantityBasedDiscounts === 'string' ? JSON.parse(coupon.quantityBasedDiscounts) : coupon.quantityBasedDiscounts || []; } catch { return null; }
            if (!Array.isArray(quantityTiers) || !quantityTiers.length) return null;
            quantityTiers.sort((a, b) => a.minQuantity - b.minQuantity);
            return { ...coupon, parsedTiers: quantityTiers };
          }).filter(Boolean);
        this.cachedCoupons = validCoupons;
        this.cacheExpiry = now + this.CACHE_DURATION;
        return validCoupons;
      }
      return [];
    } catch { return []; }
  }

  async getBestOfferForCart(cartItems, cartTotal) {
    const coupons = await this.getQuantityBasedCoupons();
    if (!coupons.length) return null;
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    let bestCurrentOffer = null, bestNextOffer = null;
    coupons.forEach(coupon => {
      const tiers = coupon.parsedTiers;
      const applicable = tiers.filter(t => totalQuantity >= t.minQuantity);
      if (applicable.length) {
        const current = applicable[applicable.length - 1];
        if (!bestCurrentOffer || parseFloat(current.discount) > parseFloat(bestCurrentOffer.discount))
          bestCurrentOffer = { coupon, tier: current, discount: parseFloat(current.discount), currentQuantity: totalQuantity, type: 'current' };
      }
      const next = tiers.find(t => totalQuantity < t.minQuantity);
      if (next && (!bestNextOffer || parseFloat(next.discount) > parseFloat(bestNextOffer.discount)))
        bestNextOffer = { coupon, tier: next, discount: parseFloat(next.discount), currentQuantity: totalQuantity, remaining: next.minQuantity - totalQuantity, progress: (totalQuantity / next.minQuantity) * 100, type: 'next' };
    });
    return { current: bestCurrentOffer, next: bestNextOffer, totalQuantity };
  }

  async validateAndApplyCoupon(couponCode, cartItems, cartTotal, paymentMode = null) {
    try {
      const cartItemsForValidation = cartItems.map(item => ({ productId: item.productId || item.id, quantity: item.quantity, price: item.price }));
      const response = await validateCoupon(couponCode, cartTotal, paymentMode, cartItemsForValidation);
      if (response?.success) return { success: true, coupon: response.coupon, discountAmount: parseFloat(response.discountAmount), finalAmount: parseFloat(response.finalAmount), message: response.message };
      return { success: false, message: response?.message || 'Invalid coupon' };
    } catch (error) { return { success: false, message: error.message || 'Failed to validate coupon' }; }
  }

  async getOfferDisplayData(cartItems, cartTotal) {
    const offers = await this.getBestOfferForCart(cartItems, cartTotal);
    if (!offers) return null;
    const { current, next, totalQuantity } = offers;
    if (current && !next) return { type: 'achieved', coupon: current.coupon, tier: current.tier, discount: current.discount, currentQuantity: totalQuantity, message: `You've unlocked "${current.coupon.description || current.coupon.code}"!`, badgeText: this.formatDiscount(current.discount, current.coupon), canApply: true };
    if (next) return { type: 'progress', coupon: next.coupon, tier: next.tier, discount: next.discount, currentQuantity: totalQuantity, targetQuantity: next.tier.minQuantity, remaining: next.remaining, progress: next.progress, message: `Add ${next.remaining} more item${next.remaining > 1 ? 's' : ''} to get ${this.formatDiscount(next.discount, next.coupon)}`, badgeText: this.formatDiscount(next.discount, next.coupon), canApply: false };
    return null;
  }

  formatDiscount(discount, coupon) {
    if (coupon.type === 'quantity_based' || coupon.type !== 'percentage') return `₹${discount} OFF`;
    return `${discount}% OFF`;
  }

  clearCache() { this.cachedCoupons = null; this.cacheExpiry = null; }

  async getAllOffers() {
    const coupons = await this.getQuantityBasedCoupons();
    return coupons.map(c => ({ id: c.id, code: c.code, description: c.description, type: c.type, status: c.status, tiers: c.parsedTiers, usageCount: c.usageCount, usageLimit: c.usageLimit, startDate: c.startDate, endDate: c.endDate }));
  }

  async getOffersForQuantity(quantity) {
    const coupons = await this.getQuantityBasedCoupons();
    const applicable = [];
    coupons.forEach(coupon => {
      const tiers = coupon.parsedTiers.filter(t => quantity >= t.minQuantity);
      if (tiers.length) applicable.push({ coupon, tier: tiers[tiers.length - 1], discount: parseFloat(tiers[tiers.length - 1].discount) });
    });
    return applicable.sort((a, b) => b.discount - a.discount);
  }
}

export const couponIntegrationService = new CouponIntegrationService();
