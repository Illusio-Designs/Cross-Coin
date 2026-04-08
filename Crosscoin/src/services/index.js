import axios from "axios";
import { getCachedData, setCachedData, clearCache } from '../utils/apiCache';
import { deduplicateRequest } from '../utils/requestDeduplication';
import { getTimeoutForEndpoint, handleTimeoutError } from '../config/apiConfig';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

// Public/brand-scoped axios instance — sends X-Brand-Name header
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Brand-Name": "crosscoin",
  },
});

// Admin axios instance — NO X-Brand-Name header (admin sees all brands)
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor - set dynamic timeout based on endpoint
api.interceptors.request.use(
  (config) => {
    // Set timeout based on endpoint
    const timeout = getTimeoutForEndpoint(config.url || '');
    config.timeout = timeout;

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      const userMessage = handleTimeoutError(error);
      return Promise.reject(new Error(userMessage));
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && 
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.startsWith("/dashboard") &&
          !window.location.pathname.startsWith("/auth/")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Shared interceptor setup for adminApi (same logic, no brand header)
adminApi.interceptors.request.use(
  (config) => {
    const timeout = getTimeoutForEndpoint(config.url || '');
    config.timeout = timeout;
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (config.data instanceof FormData) config.headers["Content-Type"] = "multipart/form-data";
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      const userMessage = handleTimeoutError(error);
      return Promise.reject(new Error(userMessage));
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/")) {
        window.location.href = "/auth/adminlogin";
      }
    }
    return Promise.reject(error);
  }
);

// Error handler
const handleApiError = (error) => {
  if (error.response) {
    throw error.response.data;
  } else if (error.request) {
    throw { message: "No response from server" };
  } else {
    throw { message: error.message };
  }
};

// Shipping Fee Services
export const shippingFeeService = {
  getAllShippingFees: async () => {
    const cacheKey = 'shipping_fees_all';
    
    // Check cache first (30 minute cache)
    const cached = getCachedData(cacheKey, 30 * 60 * 1000);
    if (cached) return cached;
    
    // Deduplicate simultaneous requests
    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await adminApi.get("/api/shipping-fees");
        const data = response.data.shippingFees;
        
        // Cache for 30 minutes
        setCachedData(cacheKey, data);
        
        return data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    });
  },

  getShippingFeeByType: async (type) => {
    const cacheKey = `shipping_fee_${type}`;
    
    // Check cache first (30 minute cache)
    const cached = getCachedData(cacheKey, 30 * 60 * 1000);
    if (cached) return cached;
    
    try {
      const response = await adminApi.get(`/api/shipping-fees/${type}`);
      const data = response.data.shippingFee;
      
      // Cache for 30 minutes
      setCachedData(cacheKey, data);
      
      return data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createShippingFee: async (feeData) => {
    try {
      const response = await adminApi.post("/api/shipping-fees", feeData);
      // Clear cache after creating
      clearCache('shipping_fees_all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateShippingFee: async (id, feeData) => {
    try {
      const response = await adminApi.put(`/api/shipping-fees/${id}`, feeData);
      // Clear cache after updating
      clearCache('shipping_fees_all');
      clearCache(`shipping_fee_${feeData.orderType}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteShippingFee: async (id) => {
    try {
      const response = await adminApi.delete(`/api/shipping-fees/${id}`);
      // Clear all shipping fee caches
      clearCache('shipping_fees_all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Shipping Address Services
export const shippingAddressService = {
  getUserShippingAddresses: async () => {
    try {
      const response = await api.get("/api/shipping-addresses");
      return response.data.shippingAddresses;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getShippingAddressById: async (id) => {
    try {
      const response = await api.get(`/api/shipping-addresses/${id}`);
      return response.data.shippingAddress;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createShippingAddress: async (addressData) => {
    try {
      const response = await api.post("/api/shipping-addresses", addressData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateShippingAddress: async (id, addressData) => {
    try {
      const response = await api.put(`/api/shipping-addresses/${id}`,
        addressData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteShippingAddress: async (id) => {
    try {
      const response = await api.delete(`/api/shipping-addresses/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Order Services
export const orderService = {
  getAllOrders: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/orders", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getOrderById: async (id) => {
    try {
      const response = await adminApi.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateOrderStatus: async (id, statusData) => {
    try {
      const response = await adminApi.put(`/api/orders/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAllOrderStatusHistory: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/order-status-history", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update payment status for an order (admin)
  updateOrderPaymentStatus: async (id, paymentStatusData) => {
    try {
      const response = await adminApi.put(
        `/api/orders/${id}/payment-status`,
        paymentStatusData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // FShip Integration Services
  
  // Sync orders with FShip - Comprehensive sync includes new orders and status updates
  syncOrdersWithFShip: async () => {
    try {
      const response = await adminApi.post(
        "/api/orders/fship/sync",
        {},
        { timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update single order from FShip
  updateSingleOrderFromFShip: async (orderId) => {
    try {
      const response = await adminApi.put(
        `/api/orders/${orderId}/fship/update`,
        {},
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Sync single order with FShip
  syncSingleOrderWithFShip: async (orderId) => {
    try {
      const response = await adminApi.put(
        `/api/orders/${orderId}/fship/sync`,
        {},
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get FShip tracking for order
  getFShipTracking: async (orderId) => {
    try {
      const response = await adminApi.get(`/api/orders/${orderId}/fship/tracking`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get FShip shipping label for order
  getFShipLabel: async (orderId) => {
    try {
      const response = await adminApi.get(`/api/orders/${orderId}/fship/label`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get FShip couriers list
  getFShipCouriers: async () => {
    try {
      const response = await adminApi.get("/api/orders/fship/couriers");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel orders in FShip
  cancelOrdersInFShip: async (orderIds) => {
    try {
      const response = await adminApi.post("/api/orders/fship/cancel", { orderIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin cancel order
  adminCancelOrder: async (orderId, reason) => {
    try {
      const response = await adminApi.put(`/api/orders/${orderId}/admin/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Track order by order number (public)
  trackOrderByOrderNumber: async (orderNumber) => {
    try {
      const response = await adminApi.get(`/api/orders/track/${orderNumber}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Track order by AWB (public)
  trackOrderByAWB: async (awbNumber) => {
    try {
      const response = await adminApi.get(`/api/orders/track/awb?awb_number=${awbNumber}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get guest order (public)
  getGuestOrder: async (email, orderNumber) => {
    try {
      const response = await adminApi.get(`/api/orders/guest/track?email=${email}&orderNumber=${orderNumber}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Export delivered orders to Excel
  exportDeliveredOrders: async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await adminApi.get('/api/orders/export/delivered', {
        params,
        responseType: 'blob', // Important for file download
        timeout: 60000 // 60 seconds timeout for large exports
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const filename = `Delivered_Orders_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
      link.setAttribute('download', filename);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Export downloaded successfully' };
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update AWB number manually
  updateAwbNumber: async (orderId, data) => {
    try {
      const response = await adminApi.put(`/api/orders/${orderId}/awb`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Label Download Management
  
  // Mark label as downloaded
  markLabelDownloaded: async (orderId) => {
    try {
      const response = await adminApi.post(`/api/orders/labels/${orderId}/mark-downloaded`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Download single label
  downloadLabel: async (orderId) => {
    try {
      const response = await adminApi.get(`/api/orders/labels/${orderId}/download`, {
        responseType: 'blob',
        timeout: 30000
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `label_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Label downloaded successfully' };
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Bulk download labels
  bulkDownloadLabels: async (orderIds) => {
    try {
      const response = await adminApi.post('/api/orders/labels/bulk-download', 
        { orderIds },
        {
          responseType: 'blob',
          timeout: 60000
        }
      );

      // Create download link for merged PDF file
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `shipping_labels_${timestamp}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Labels downloaded successfully' };
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get pending labels (not yet downloaded)
  getPendingLabels: async (page = 1, limit = 50) => {
    try {
      const response = await adminApi.get('/api/orders/labels/pending', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get label download statistics
  getLabelDownloadStats: async () => {
    try {
      const response = await adminApi.get('/api/orders/labels/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

};

// Payment Services
export const paymentService = {
  getAllPayments: async () => {
    try {
      const response = await adminApi.get("/api/payments");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getPaymentById: async (id) => {
    try {
      const response = await adminApi.get(`/api/payments/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updatePaymentStatus: async (id, statusData) => {
    try {
      const response = await adminApi.put(`/api/payments/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deletePayment: async (id) => {
    try {
      const response = await adminApi.delete(`/api/payments/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Settings Services
export const settingsService = {
  getAllSettings: async () => {
    try {
      const response = await adminApi.get("/api/settings");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getSettingByKey: async (key) => {
    try {
      const response = await adminApi.get(`/api/settings/${key}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  upsertSetting: async (settingData) => {
    try {
      const response = await adminApi.post("/api/settings", settingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteSetting: async (key) => {
    try {
      const response = await adminApi.delete(`/api/settings/${key}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Auth Services
export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post("/api/users/admin/login", credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post("/api/users/register", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  logout: async () => {
    try {
      const response = await api.post("/api/users/logout");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// User Services
export const userService = {
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await adminApi.get("/api/users/me");

      // The API returns user data directly, not nested under a user property
      if (!response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
      }
      throw error.response?.data || error.message;
    }
  },

  getProfile: async () => {
    try {
      const response = await adminApi.get("/api/users/profile");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await adminApi.put("/api/users/profile", profileData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateUser: async (userData) => {
    try {
      const response = await adminApi.put("/api/users/me", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await adminApi.put("/api/users/me/password", passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteUser: async () => {
    try {
      const response = await adminApi.delete("/api/users/delete");
      localStorage.removeItem("token");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getAllUsers: async () => {
    try {
      const response = await adminApi.get("/api/users/all");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update a specific user by ID (admin — role changes, etc.)
  updateUser: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/users/${id}/role`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create a staff user (admin only)
  createStaffUser: async (userData) => {
    try {
      const response = await adminApi.post("/api/users/staff", userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Category Services
export const categoryService = {
  getAllCategories: async () => {
    const cacheKey = 'categories_all';
    
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    
    // Deduplicate simultaneous requests
    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await adminApi.get("/api/categories");
        const data = response.data;
        
        // Cache the result for 5 minutes
        setCachedData(cacheKey, data);
        
        return data;
      } catch (error) {
        throw error.response?.data || error.message;
      }
    });
  },

  getCategoryById: async (id) => {
    try {
      const response = await adminApi.get(`/api/categories/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createCategory: async (formData) => {
    try {
      const response = await adminApi.post("/api/categories", formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateCategory: async (id, formData) => {
    try {
      const response = await adminApi.put(`/api/categories/${id}`, formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteCategory: async (id) => {
    try {
      const response = await adminApi.delete(`/api/categories/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const sliderService = {
  createSlider: async (sliderData) => {
    try {
      const response = await adminApi.post("/api/sliders", sliderData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getAllSliders: async () => {
    try {
      const response = await adminApi.get("/api/sliders/admin/all");
      // Return the response data directly since it already contains the sliders array
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getSliderById: async (id) => {
    try {
      const response = await adminApi.get(`/api/sliders/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateSlider: async (id, sliderData) => {
    try {
      const response = await adminApi.put(`/api/sliders/${id}`, sliderData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteSlider: async (id) => {
    try {
      const response = await adminApi.delete(`/api/sliders/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  assignSliderToBrands: async (sliderId, brandIds) => {
    try {
      const response = await adminApi.post(`/api/sliders/${sliderId}/brands`, {
        brand_ids: brandIds
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  removeSliderFromBrand: async (sliderId, brandId) => {
    try {
      const response = await adminApi.delete(`/api/sliders/${sliderId}/brands/${brandId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Product Services
export const productService = {
  createProduct: async (productData) => {
    try {
      const response = await adminApi.post("/api/products", productData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // No timeout here
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAllProducts: async (page = 1, limit = 10, search = "") => {
    try {
      const params = { page, limit, search };
      if (!search) {
        delete params.search;
      }
      const response = await adminApi.get("/api/products", { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  getProduct: async (id) => {
    try {
      const response = await adminApi.get(`/api/products/${id}`);
      // Return the data directly since the API response is already in the correct format
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const response = await adminApi.put(`/api/products/${id}`, productData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // No timeout here
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await adminApi.delete(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getProductsByCategory: async (categoryId) => {
    try {
      const response = await adminApi.get(`/api/products/category/${categoryId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  searchProducts: async (query) => {
    try {
      const response = await adminApi.get(`/api/products/search?query=${query}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getExistingImages: async (source = 'products', productId = null) => {
    try {
      const params = {};
      if (source !== 'products') {
        params.source = source;
      }
      if (productId) {
        params.productId = productId;
      }
      const response = await adminApi.get('/api/products/existing-images', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  uploadImages: async (files) => {
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      
      const response = await adminApi.post('/api/products/upload-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteImages: async (imagePaths) => {
    try {
      const response = await adminApi.delete('/api/products/delete-images', {
        data: { imagePaths }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Coupon Services
export const couponService = {
  createCoupon: async (couponData) => {
    try {
      const response = await adminApi.post("/api/coupons", couponData);
      // Clear cache after creating
      clearCache('coupons_all');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getAllCoupons: async () => {
    const cacheKey = 'coupons_all';
    
    // Check cache first (30 minute cache for coupons)
    const cached = getCachedData(cacheKey, 30 * 60 * 1000);
    if (cached) return cached;
    
    // Deduplicate simultaneous requests
    return deduplicateRequest(cacheKey, async () => {
      try {
        const response = await adminApi.get("/api/coupons");
        const data = response.data;
        
        // Cache for 30 minutes
        setCachedData(cacheKey, data);
        
        return data;
      } catch (error) {
        throw handleApiError(error);
      }
    });
  },

  getCouponById: async (id) => {
    try {
      const response = await adminApi.get(`/api/coupons/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateCoupon: async (id, couponData) => {
    try {
      const response = await adminApi.put(`/api/coupons/${id}`, couponData);
      // Clear cache after updating
      clearCache('coupons_all');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteCoupon: async (id) => {
    try {
      const response = await adminApi.delete(`/api/coupons/${id}`);
      // Clear cache after deleting
      clearCache('coupons_all');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Review Services
export const reviewService = {
  getAllReviews: async (status = "all", params = {}) => {
    try {
      const { page = 1, limit = 10 } = params;
      const response = await adminApi.get(`/api/reviews/admin/all`, {
        params: {
          status,
          page,
          limit
        }
      });
      if (response.data) {
        return response.data;
      }
      throw new Error("Invalid response format from server");
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getReviewById: async (id) => {
    try {
      const response = await adminApi.get(`/api/reviews/admin/${id}`);
      return response.data.review;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateReviewStatus: async (id, statusData) => {
    try {
      const response = await adminApi.put(
        `/api/reviews/admin/${id}/status`,
        statusData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteReview: async (id) => {
    try {
      const response = await adminApi.delete(`/api/reviews/admin/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  moderateReview: async (id, moderationData) => {
    try {
      // Ensure the data is in the correct format
      const formattedData = {
        status: moderationData.status,
        is_featured: moderationData.is_featured,
        admin_notes: moderationData.admin_notes,
      };
      const response = await adminApi.put(
        `/api/reviews/admin/${id}/moderate`,
        formattedData
      );
      if (!response.data) {
        throw new Error("No response data received");
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteReviewImage: async (imageId) => {
    try {
      const response = await adminApi.delete(`/api/reviews/admin/images/${imageId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// SEO Services
export const seoService = {
  getAllSEOData: async () => {
    try {
      const response = await adminApi.get("/api/seo/all");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getSEOData: async (pageName) => {
    try {
      const response = await adminApi.get(`/api/seo?page_name=${pageName}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createSEOData: async (formData) => {
    try {
      // Create a new FormData instance to ensure proper data handling
      const data = new FormData();

      // Add all form fields
      data.append("page_name", formData.get("page_name"));
      data.append("meta_title", formData.get("meta_title"));
      data.append("meta_description", formData.get("meta_description"));
      data.append("meta_keywords", formData.get("meta_keywords"));

      // Handle image if it exists
      const image = formData.get("meta_image");
      if (image && image instanceof File) {
        data.append("meta_image", image);
      } else if (image) {
        data.append("meta_image", image);
      }

      const response = await adminApi.post("/api/seo/create", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateSEOData: async (formData) => {
    try {

      const response = await adminApi.put("/api/seo/update", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteSEOData: async (pageName) => {
    try {
      const response = await adminApi.delete(`/api/seo/${pageName}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Attribute Services
export const attributeService = {
  getAllAttributes: async () => {
    try {
      const response = await adminApi.get("/api/attributes");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAttributeById: async (id) => {
    try {
      const response = await adminApi.get(`/api/attributes/${id}`);
      if (!response.data) {
        throw new Error("Attribute not found");
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Attribute not found");
      }
      throw error.response?.data || error.message;
    }
  },

  createAttribute: async (attributeData) => {
    try {
      const response = await adminApi.post("/api/attributes", attributeData);
      if (!response.data?.attribute) {
        throw new Error("Invalid response from server");
      }
      return response.data.attribute;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateAttribute: async (id, attributeData) => {
    try {
      const response = await adminApi.put(`/api/attributes/${id}`, attributeData);
      if (!response.data?.attribute) {
        throw new Error("Invalid response from server");
      }
      return response.data.attribute;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Attribute not found");
      }
      throw error.response?.data || error.message;
    }
  },

  deleteAttribute: async (id) => {
    try {
      const response = await adminApi.delete(`/api/attributes/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Attribute not found");
      }
      throw error.response?.data || error.message;
    }
  },

  addAttributeValues: async (id, values) => {
    try {
      const response = await adminApi.post(`/api/attributes/${id}/values`, {
        values,
      });
      if (!response.data?.attribute) {
        throw new Error("Invalid response from server");
      }
      return response.data.attribute;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Attribute not found");
      }
      throw error.response?.data || error.message;
    }
  },

  removeAttributeValues: async (id, valueIds) => {
    try {
      const response = await adminApi.delete(`/api/attributes/${id}/values`, {
        data: { valueIds },
      });
      if (!response.data?.attribute) {
        throw new Error("Invalid response from server");
      }
      return response.data.attribute;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Attribute not found");
      }
      throw error.response?.data || error.message;
    }
  },
};

export const policyService = {
  createPolicy: async (data) => {
    try {
      const response = await adminApi.post("/api/policies", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAllPolicies: async () => {
    try {
      const response = await adminApi.get("/api/policies");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPolicyById: async (id) => {
    try {
      const response = await adminApi.get(`/api/policies/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updatePolicy: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/policies/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deletePolicy: async (id) => {
    try {
      const response = await adminApi.delete(`/api/policies/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Dashboard Services
export const dashboardService = {
  getDashboardStats: async () => {
    try {
      const response = await adminApi.get("/api/dashboard/stats");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Brand Services
export const brandService = {
  getAllBrands: async (includeInactive = false) => {
    try {
      const response = await adminApi.get("/api/admin/brands", {
        params: { includeInactive }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getBrandById: async (id) => {
    try {
      const response = await adminApi.get(`/api/admin/brands/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createBrand: async (brandData) => {
    try {
      const response = await adminApi.post("/api/admin/brands", brandData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateBrand: async (id, brandData) => {
    try {
      const response = await adminApi.put(`/api/admin/brands/${id}`, brandData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteBrand: async (id) => {
    try {
      const response = await adminApi.delete(`/api/admin/brands/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  toggleBrandStatus: async (id) => {
    try {
      const response = await adminApi.patch(`/api/admin/brands/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  searchBrands: async (query) => {
    try {
      const response = await adminApi.get("/api/admin/brands/search", {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Brand Settings Services
export const brandSettingsService = {
  getAllSettings: async (brandId, category = null) => {
    try {
      const params = { brandId };
      if (category) params.category = category;
      const response = await adminApi.get("/api/admin/brand-settings", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getSettingsByCategory: async (brandId, category) => {
    try {
      const response = await adminApi.get(`/api/admin/brand-settings/category/${category}`, {
        params: { brandId }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getSetting: async (brandId, key) => {
    try {
      const response = await adminApi.get(`/api/admin/brand-settings/${key}`, {
        params: { brandId }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createSetting: async (settingData) => {
    try {
      const response = await adminApi.post("/api/admin/brand-settings", settingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateSetting: async (brandId, key, settingData) => {
    try {
      const response = await adminApi.put(`/api/admin/brand-settings/${key}`, settingData, {
        params: { brandId }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteSetting: async (brandId, key) => {
    try {
      const response = await adminApi.delete(`/api/admin/brand-settings/${key}`, {
        params: { brandId }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};


// Blog Services (Admin)
export const blogService = {
  // Categories
  getAllCategories: async () => {
    try {
      const response = await adminApi.get("/api/blogs/admin/categories");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createCategory: async (data) => {
    try {
      const response = await adminApi.post("/api/blogs/admin/categories", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateCategory: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/blogs/admin/categories/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteCategory: async (id) => {
    try {
      const response = await adminApi.delete(`/api/blogs/admin/categories/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Posts
  getAllPosts: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/blogs/admin/posts", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPostById: async (id) => {
    try {
      const response = await adminApi.get(`/api/blogs/admin/posts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createPost: async (data) => {
    try {
      const response = await adminApi.post("/api/blogs/admin/posts", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updatePost: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/blogs/admin/posts/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deletePost: async (id) => {
    try {
      const response = await adminApi.delete(`/api/blogs/admin/posts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadHeroImage: async (id, file) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await adminApi.post(`/api/blogs/admin/posts/${id}/hero-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Tags
  getAllTags: async () => {
    try {
      const response = await adminApi.get("/api/blogs/tags");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Lookbook / Reels / Instagram Services (Admin + Public)
export const lookbookService = {
  // Public
  getPublicLookbooks: async () => {
    const response = await api.get("/api/lookbooks");
    return response.data;
  },
  getPublicLookbookBySlug: async (slug) => {
    const response = await api.get(`/api/lookbooks/${encodeURIComponent(slug)}`);
    return response.data;
  },

  // Admin
  getAdminLookbooks: async () => {
    const response = await adminApi.get("/api/lookbooks");
    return response.data;
  },
  createLookbook: async (payload) => {
    const response = await adminApi.post("/api/admin/lookbooks", payload);
    return response.data;
  },
  updateLookbook: async (id, payload) => {
    const response = await adminApi.put(`/api/admin/lookbooks/${id}`, payload);
    return response.data;
  },
  deleteLookbook: async (id) => {
    const response = await adminApi.delete(`/api/admin/lookbooks/${id}`);
    return response.data;
  },
  uploadLookbookImage: async (lookbookId, formData) => {
    const response = await adminApi.post(`/api/admin/lookbooks/${lookbookId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  deleteLookbookImage: async (imageId) => {
    const response = await adminApi.delete(`/api/admin/lookbooks/images/${imageId}`);
    return response.data;
  },
  addHotspot: async (imageId, payload) => {
    const response = await adminApi.post(`/api/admin/lookbooks/images/${imageId}/hotspots`, payload);
    return response.data;
  },
  updateHotspot: async (hotspotId, payload) => {
    const response = await adminApi.put(`/api/admin/lookbooks/hotspots/${hotspotId}`, payload);
    return response.data;
  },
  deleteHotspot: async (hotspotId) => {
    const response = await adminApi.delete(`/api/admin/lookbooks/hotspots/${hotspotId}`);
    return response.data;
  },
};

export const reelService = {
  // Public
  getPublicReels: async () => {
    const response = await api.get("/api/reels");
    return response.data;
  },
  incrementReelView: async (id) => {
    const response = await api.post(`/api/reels/${id}/view`);
    return response.data;
  },

  // Admin
  getAdminReels: async () => {
    const response = await adminApi.get("/api/reels");
    return response.data;
  },
  createReel: async (formData) => {
    const response = await adminApi.post("/api/admin/reels", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  updateReel: async (id, formData) => {
    const response = await adminApi.put(`/api/admin/reels/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  deleteReel: async (id) => {
    const response = await adminApi.delete(`/api/admin/reels/${id}`);
    return response.data;
  },
  assignProducts: async (id, product_ids) => {
    const response = await adminApi.post(`/api/admin/reels/${id}/products`, { product_ids });
    return response.data;
  },
  removeProduct: async (id, productId) => {
    const response = await adminApi.delete(`/api/admin/reels/${id}/products/${productId}`);
    return response.data;
  },
};

export const instagramService = {
  // Public
  getFeed: async () => {
    const response = await api.get("/api/instagram/feed");
    return response.data;
  },

  // Admin
  refreshFeed: async () => {
    const response = await adminApi.post("/api/instagram/refresh");
    return response.data;
  },
  tagPost: async (payload) => {
    const response = await adminApi.post("/api/instagram/tag", payload);
    return response.data;
  },
};

// ─── WhatsApp Service ─────────────────────────────────────────────────────────
export const whatsappService = {

  // ── Stats ──
  getStats: async (brandId = 1) => {
    const response = await adminApi.get(`/api/whatsapp/stats?brandId=${brandId}`);
    return response.data;
  },

  // ── Templates ──
  listTemplates: async (brandId = 1) => {
    const response = await adminApi.get(`/api/whatsapp/templates?brandId=${brandId}`);
    return response.data;
  },

  createTemplate: async (payload) => {
    const response = await adminApi.post('/api/whatsapp/templates', payload);
    return response.data;
  },

  deleteTemplate: async (name, brandId = 1) => {
    const response = await adminApi.delete(`/api/whatsapp/templates/${name}?brandId=${brandId}`);
    return response.data;
  },

  seedTemplates: async (brandId = 1) => {
    const response = await adminApi.post('/api/whatsapp/templates/seed', { brandId });
    return response.data;
  },

  // ── Test ──
  testConnection: async (phone, brandId = 1) => {
    const response = await adminApi.post('/api/whatsapp/test', { phone, brandId });
    return response.data;
  },

  // ── Conversations / Inbox ──
  getConversations: async (brandId = 1, status = 'open', page = 1) => {
    const response = await adminApi.get('/api/whatsapp/conversations', {
      params: { brandId, status, page }
    });
    return response.data;
  },

  getMessages: async (conversationId) => {
    const response = await adminApi.get(`/api/whatsapp/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendReply: async (conversationId, message, brandId = 1, quotedWaMessageId = null) => {
    const response = await adminApi.post(`/api/whatsapp/conversations/${conversationId}/reply`, {
      message, brandId, ...(quotedWaMessageId ? { quotedWaMessageId } : {})
    });
    return response.data;
  },

  resolveConversation: async (conversationId) => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/resolve`);
    return response.data;
  },

  assignConversation: async (conversationId, agentId) => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/assign`, { agentId });
    return response.data;
  },

  tagConversation: async (conversationId, tags) => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/tags`, { tags });
    return response.data;
  },

  setOptOut: async (conversationId, opted_out) => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/optout`, { opted_out });
    return response.data;
  },

  // ── Canned Responses ──
  getCannedResponses: async (brandId = 1) => {
    const response = await adminApi.get(`/api/whatsapp/canned-responses?brandId=${brandId}`);
    return response.data;
  },

  createCannedResponse: async (payload) => {
    const response = await adminApi.post('/api/whatsapp/canned-responses', payload);
    return response.data;
  },

  updateCannedResponse: async (id, payload) => {
    const response = await adminApi.put(`/api/whatsapp/canned-responses/${id}`, payload);
    return response.data;
  },

  deleteCannedResponse: async (id) => {
    const response = await adminApi.delete(`/api/whatsapp/canned-responses/${id}`);
    return response.data;
  },

  // ── Broadcasts ──
  getBroadcasts: async (brandId = 1) => {
    const response = await adminApi.get(`/api/whatsapp/broadcasts?brandId=${brandId}`);
    return response.data;
  },

  createBroadcast: async (payload) => {
    const response = await adminApi.post('/api/whatsapp/broadcasts', payload);
    return response.data;
  },

  runBroadcast: async (id) => {
    const response = await adminApi.post(`/api/whatsapp/broadcasts/${id}/run`);
    return response.data;
  },

  // ── SLA Analytics ──
  getSLAStats: async (brandId = 1) => {
    const response = await adminApi.get(`/api/whatsapp/stats/sla?brandId=${brandId}`);
    return response.data;
  },

  // ── Back-in-stock ──
  notifyBackInStock: async (productId, brandId = 1) => {
    const response = await adminApi.post('/api/whatsapp/notify/back-in-stock', { productId, brandId });
    return response.data;
  },

  seedCannedResponses: async (brandId = 1) => {
    const response = await adminApi.post('/api/whatsapp/canned-responses/seed', { brandId });
    return response.data;
  },

  sendProduct: async (conversationId, productId, brandId = 1) => {
    const response = await adminApi.post(`/api/whatsapp/conversations/${conversationId}/send-product`, { productId, brandId });
    return response.data;
  },

  sendCatalogue: async (conversationId, retailerIds, productIds, headerText, bodyText, brandId = 1) => {
    const response = await adminApi.post(`/api/whatsapp/conversations/${conversationId}/send-catalogue`, {
      retailerIds, productIds, headerText, bodyText, brandId
    });
    return response.data;
  },

  // Returns a proxied URL for a Meta media ID (audio, image, video, document)
  getMediaProxyUrl: (mediaId, brandId = 1) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
    return `${adminApi.defaults.baseURL}/api/whatsapp/media/${mediaId}?brandId=${brandId}&token=${token}`;
  },
};
