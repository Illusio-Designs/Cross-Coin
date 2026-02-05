import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Create axios instance with default config
const offerAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
offerAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Offer API endpoints
export const offerAPIService = {
  // Get cart upsell recommendations
  getCartUpsellRecommendations: async (cartItems, cartTotal) => {
    try {
      const response = await offerAPI.get('/cart/upsell-recommendations', {
        params: {
          cartItems: JSON.stringify(cartItems),
          cartTotal
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching upsell recommendations:', error);
      throw error;
    }
  },

  // Get free shipping threshold
  getFreeShippingThreshold: async () => {
    try {
      const response = await offerAPI.get('/cart/free-shipping-threshold');
      return response.data;
    } catch (error) {
      console.error('Error fetching free shipping threshold:', error);
      throw error;
    }
  },

  // Get prepaid incentive
  getPrepaidIncentive: async (cartTotal) => {
    try {
      const response = await offerAPI.get('/cart/prepaid-incentive', {
        params: { cartTotal }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching prepaid incentive:', error);
      throw error;
    }
  },

  // Track upsell interaction
  trackUpsellInteraction: async (upsellType, productId, action) => {
    try {
      const response = await offerAPI.post('/cart/track-upsell-interaction', {
        upsellType,
        productId,
        action
      });
      return response.data;
    } catch (error) {
      console.error('Error tracking upsell interaction:', error);
      throw error;
    }
  },

  // Apply offer discount
  applyOfferDiscount: async (cartItems, offerId, offerType) => {
    try {
      const response = await offerAPI.post('/cart/apply-offer', {
        cartItems,
        offerId,
        offerType
      });
      return response.data;
    } catch (error) {
      console.error('Error applying offer discount:', error);
      throw error;
    }
  },

  // Validate offer eligibility
  validateOfferEligibility: async (cartItems, cartTotal, offerId, offerType) => {
    try {
      const response = await offerAPI.post('/cart/validate-offer', {
        cartItems,
        cartTotal,
        offerId,
        offerType
      });
      return response.data;
    } catch (error) {
      console.error('Error validating offer eligibility:', error);
      throw error;
    }
  },

  // Admin APIs
  admin: {
    // Get all upsell rules
    getUpsellRules: async () => {
      try {
        const response = await offerAPI.get('/admin/upsell-rules');
        return response.data;
      } catch (error) {
        console.error('Error fetching upsell rules:', error);
        throw error;
      }
    },

    // Create upsell rule
    createUpsellRule: async (ruleData) => {
      try {
        const response = await offerAPI.post('/admin/upsell-rules', ruleData);
        return response.data;
      } catch (error) {
        console.error('Error creating upsell rule:', error);
        throw error;
      }
    },

    // Update upsell rule
    updateUpsellRule: async (ruleId, ruleData) => {
      try {
        const response = await offerAPI.put(`/admin/upsell-rules/${ruleId}`, ruleData);
        return response.data;
      } catch (error) {
        console.error('Error updating upsell rule:', error);
        throw error;
      }
    },

    // Delete upsell rule
    deleteUpsellRule: async (ruleId) => {
      try {
        const response = await offerAPI.delete(`/admin/upsell-rules/${ruleId}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting upsell rule:', error);
        throw error;
      }
    },

    // Get free shipping settings
    getFreeShippingSettings: async () => {
      try {
        const response = await offerAPI.get('/admin/free-shipping-settings');
        return response.data;
      } catch (error) {
        console.error('Error fetching free shipping settings:', error);
        throw error;
      }
    },

    // Update free shipping settings
    updateFreeShippingSettings: async (settings) => {
      try {
        const response = await offerAPI.put('/admin/free-shipping-settings', settings);
        return response.data;
      } catch (error) {
        console.error('Error updating free shipping settings:', error);
        throw error;
      }
    },

    // Get prepaid incentives
    getPrepaidIncentives: async () => {
      try {
        const response = await offerAPI.get('/admin/prepaid-incentives');
        return response.data;
      } catch (error) {
        console.error('Error fetching prepaid incentives:', error);
        throw error;
      }
    },

    // Create prepaid incentive
    createPrepaidIncentive: async (incentiveData) => {
      try {
        const response = await offerAPI.post('/admin/prepaid-incentives', incentiveData);
        return response.data;
      } catch (error) {
        console.error('Error creating prepaid incentive:', error);
        throw error;
      }
    },

    // Update prepaid incentive
    updatePrepaidIncentive: async (incentiveId, incentiveData) => {
      try {
        const response = await offerAPI.put(`/admin/prepaid-incentives/${incentiveId}`, incentiveData);
        return response.data;
      } catch (error) {
        console.error('Error updating prepaid incentive:', error);
        throw error;
      }
    },

    // Delete prepaid incentive
    deletePrepaidIncentive: async (incentiveId) => {
      try {
        const response = await offerAPI.delete(`/admin/prepaid-incentives/${incentiveId}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting prepaid incentive:', error);
        throw error;
      }
    },

    // Get upsell analytics
    getUpsellAnalytics: async (startDate, endDate, type) => {
      try {
        const response = await offerAPI.get('/admin/upsell-analytics', {
          params: { startDate, endDate, type }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching upsell analytics:', error);
        throw error;
      }
    }
  }
};

export default offerAPIService;