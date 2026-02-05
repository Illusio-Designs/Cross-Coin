// Offer Service - Handles all offer calculations and validations
class OfferService {
  constructor() {
    // This would typically come from your backend/database
    this.offerConfig = {
      quantityOffers: [
        {
          id: 1,
          minQuantity: 2,
          discountType: 'percentage',
          discountValue: 10,
          title: 'Buy 2 Get 10% Off',
          description: 'Add {remaining} more item to get 10% discount',
          color: '#ff6b35',
          isActive: true,
          validFrom: null,
          validUntil: null,
          maxDiscount: null, // Maximum discount amount for percentage offers
          applicableCategories: [], // Empty means all categories
          excludedProducts: [],
          minimumOrderValue: 0
        },
        {
          id: 2,
          minQuantity: 3,
          discountType: 'percentage',
          discountValue: 15,
          title: 'Buy 3 Get 15% Off',
          description: 'Add {remaining} more items to get 15% discount',
          color: '#f7931e',
          isActive: true,
          validFrom: null,
          validUntil: null,
          maxDiscount: 500,
          applicableCategories: [],
          excludedProducts: [],
          minimumOrderValue: 500
        },
        {
          id: 3,
          minQuantity: 5,
          discountType: 'percentage',
          discountValue: 20,
          title: 'Buy 5 Get 20% Off',
          description: 'Add {remaining} more items to get 20% discount',
          color: '#27ae60',
          isActive: true,
          validFrom: null,
          validUntil: null,
          maxDiscount: 1000,
          applicableCategories: [],
          excludedProducts: [],
          minimumOrderValue: 1000
        }
      ],
      valueOffers: [
        {
          id: 'v1',
          minValue: 1000,
          discountType: 'percentage',
          discountValue: 5,
          title: 'Spend ₹1000 Get 5% Off',
          description: 'Add ₹{remaining} more to get 5% discount',
          color: '#3498db',
          isActive: true,
          maxDiscount: 200,
          applicableCategories: [],
          excludedProducts: []
        },
        {
          id: 'v2',
          minValue: 2000,
          discountType: 'fixed',
          discountValue: 200,
          title: 'Spend ₹2000 Get ₹200 Off',
          description: 'Add ₹{remaining} more to get ₹200 off',
          color: '#e74c3c',
          isActive: true,
          applicableCategories: [],
          excludedProducts: []
        }
      ],
      freeShipping: {
        enabled: true,
        threshold: 999,
        title: 'Free Shipping',
        description: 'Add ₹{remaining} more for free shipping',
        color: '#28a745'
      }
    };
  }

  // Get applicable quantity offers for current cart
  getQuantityOffers(cartItems) {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const activeOffers = this.offerConfig.quantityOffers.filter(offer => 
      offer.isActive && this.isOfferValid(offer)
    );

    // Find current applicable offer
    const applicableOffers = activeOffers.filter(offer => 
      totalQuantity >= offer.minQuantity && 
      this.isCartEligibleForOffer(cartItems, offer)
    );
    const currentOffer = applicableOffers.length > 0 ? 
      applicableOffers[applicableOffers.length - 1] : null;

    // Find next offer to achieve
    const nextOffer = activeOffers.find(offer => 
      totalQuantity < offer.minQuantity && 
      this.isCartEligibleForOffer(cartItems, offer)
    );

    return {
      current: currentOffer,
      next: nextOffer,
      totalQuantity,
      progress: nextOffer ? (totalQuantity / nextOffer.minQuantity) * 100 : 100
    };
  }

  // Get applicable value offers for current cart
  getValueOffers(cartItems, cartTotal) {
    const activeOffers = this.offerConfig.valueOffers.filter(offer => 
      offer.isActive && this.isOfferValid(offer)
    );

    // Find current applicable offer
    const applicableOffers = activeOffers.filter(offer => 
      cartTotal >= offer.minValue && 
      this.isCartEligibleForOffer(cartItems, offer)
    );
    const currentOffer = applicableOffers.length > 0 ? 
      applicableOffers[applicableOffers.length - 1] : null;

    // Find next offer to achieve
    const nextOffer = activeOffers.find(offer => 
      cartTotal < offer.minValue && 
      this.isCartEligibleForOffer(cartItems, offer)
    );

    return {
      current: currentOffer,
      next: nextOffer,
      cartTotal,
      progress: nextOffer ? (cartTotal / nextOffer.minValue) * 100 : 100
    };
  }

  // Get free shipping status
  getFreeShippingStatus(cartTotal) {
    if (!this.offerConfig.freeShipping.enabled) return null;

    const threshold = this.offerConfig.freeShipping.threshold;
    const isEligible = cartTotal >= threshold;
    const remaining = Math.max(0, threshold - cartTotal);
    const progress = Math.min((cartTotal / threshold) * 100, 100);

    return {
      isEligible,
      threshold,
      remaining,
      progress,
      ...this.offerConfig.freeShipping
    };
  }

  // Calculate discount amount for an offer
  calculateDiscount(offer, cartItems, cartTotal) {
    if (!offer) return 0;

    let discountAmount = 0;
    const eligibleTotal = this.getEligibleCartTotal(cartItems, offer);

    if (offer.discountType === 'percentage') {
      discountAmount = (eligibleTotal * offer.discountValue) / 100;
      
      // Apply maximum discount limit if set
      if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
        discountAmount = offer.maxDiscount;
      }
    } else if (offer.discountType === 'fixed') {
      discountAmount = offer.discountValue;
    }

    return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
  }

  // Get cart total eligible for the offer (excluding excluded products/categories)
  getEligibleCartTotal(cartItems, offer) {
    return cartItems.reduce((total, item) => {
      if (this.isItemEligibleForOffer(item, offer)) {
        const itemPrice = item.variation?.price || item.price || 0;
        return total + (itemPrice * item.quantity);
      }
      return total;
    }, 0);
  }

  // Check if an item is eligible for the offer
  isItemEligibleForOffer(item, offer) {
    // Check excluded products
    if (offer.excludedProducts && offer.excludedProducts.includes(item.productId || item.id)) {
      return false;
    }

    // Check applicable categories (if specified)
    if (offer.applicableCategories && offer.applicableCategories.length > 0) {
      const itemCategory = item.category || item.categoryId;
      if (!offer.applicableCategories.includes(itemCategory)) {
        return false;
      }
    }

    return true;
  }

  // Check if cart is eligible for the offer
  isCartEligibleForOffer(cartItems, offer) {
    // Check minimum order value
    if (offer.minimumOrderValue) {
      const eligibleTotal = this.getEligibleCartTotal(cartItems, offer);
      if (eligibleTotal < offer.minimumOrderValue) {
        return false;
      }
    }

    // Check if at least one item is eligible
    return cartItems.some(item => this.isItemEligibleForOffer(item, offer));
  }

  // Check if offer is currently valid (date range)
  isOfferValid(offer) {
    const now = new Date();
    
    if (offer.validFrom && new Date(offer.validFrom) > now) {
      return false;
    }
    
    if (offer.validUntil && new Date(offer.validUntil) < now) {
      return false;
    }
    
    return true;
  }

  // Get all applicable offers for cart
  getAllApplicableOffers(cartItems, cartTotal) {
    const quantityOffers = this.getQuantityOffers(cartItems);
    const valueOffers = this.getValueOffers(cartItems, cartTotal);
    const freeShipping = this.getFreeShippingStatus(cartTotal);

    return {
      quantity: quantityOffers,
      value: valueOffers,
      freeShipping,
      bestOffer: this.getBestOffer(cartItems, cartTotal)
    };
  }

  // Get the best offer (highest discount) for the cart
  getBestOffer(cartItems, cartTotal) {
    const offers = [];

    // Add quantity offers
    const quantityOffers = this.getQuantityOffers(cartItems);
    if (quantityOffers.current) {
      const discount = this.calculateDiscount(quantityOffers.current, cartItems, cartTotal);
      offers.push({
        type: 'quantity',
        offer: quantityOffers.current,
        discount
      });
    }

    // Add value offers
    const valueOffers = this.getValueOffers(cartItems, cartTotal);
    if (valueOffers.current) {
      const discount = this.calculateDiscount(valueOffers.current, cartItems, cartTotal);
      offers.push({
        type: 'value',
        offer: valueOffers.current,
        discount
      });
    }

    // Return offer with highest discount
    return offers.length > 0 ? 
      offers.reduce((best, current) => current.discount > best.discount ? current : best) : 
      null;
  }

  // Apply offer discount to cart total
  applyOfferDiscount(cartItems, cartTotal, offerId, offerType = 'quantity') {
    let offer = null;
    
    if (offerType === 'quantity') {
      offer = this.offerConfig.quantityOffers.find(o => o.id === offerId);
    } else if (offerType === 'value') {
      offer = this.offerConfig.valueOffers.find(o => o.id === offerId);
    }

    if (!offer) {
      throw new Error('Offer not found');
    }

    // Validate offer eligibility
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (offerType === 'quantity' && totalQuantity < offer.minQuantity) {
      throw new Error('Cart does not meet minimum quantity requirement');
    }
    
    if (offerType === 'value' && cartTotal < offer.minValue) {
      throw new Error('Cart does not meet minimum value requirement');
    }

    if (!this.isCartEligibleForOffer(cartItems, offer)) {
      throw new Error('Cart is not eligible for this offer');
    }

    const discountAmount = this.calculateDiscount(offer, cartItems, cartTotal);
    const finalTotal = Math.max(0, cartTotal - discountAmount);

    return {
      originalTotal: cartTotal,
      discountAmount,
      finalTotal,
      appliedOffer: offer,
      savings: discountAmount
    };
  }

  // Update offer configuration (for admin)
  updateOfferConfig(newConfig) {
    this.offerConfig = { ...this.offerConfig, ...newConfig };
    return this.offerConfig;
  }

  // Get offer configuration (for admin)
  getOfferConfig() {
    return this.offerConfig;
  }
}

// Create singleton instance
const offerService = new OfferService();

export default offerService;