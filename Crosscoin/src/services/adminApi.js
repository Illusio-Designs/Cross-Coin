import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Admin API Client with Dynamic Brand Support
 * Allows admins to manage multiple brands by passing brand slug
 */

/**
 * Create an API instance for admin (NO brand filtering - gets all data)
 * @returns {AxiosInstance}
 */
export const createAdminApi = () => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 0,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // ✅ NO X-Brand-Name header - admin sees all brands
    },
  });

  // Request interceptor
  api.interceptors.request.use(
    (config) => {
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
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
      }
      return Promise.reject(error);
    }
  );

  return api;
};

/**
 * Admin Product Service - Universal (all brands)
 */
export const adminProductService = {
  // Get all products with brand assignments (universal admin view)
  getAllProducts: async (page = 1, limit = 10, search = "") => {
    const api = createAdminApi();
    const params = { page, limit, search };
    if (!search) delete params.search;
    const response = await api.get("/products", { params });
    return response.data;
  },

  getProduct: async (id) => {
    const api = createAdminApi();
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const api = createAdminApi();
    const response = await api.post("/products", productData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const api = createAdminApi();
    const response = await api.put(`/products/${id}`, productData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteProduct: async (id) => {
    const api = createAdminApi();
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Assign brands to a product
  assignBrandsToProduct: async (productId, brandIds) => {
    const api = createAdminApi();
    const response = await api.post(`/admin/products/${productId}/brands`, { brandIds });
    return response.data;
  },
};

/**
 * Admin Category Service - Universal (all brands)
 */
export const adminCategoryService = {
  getAllCategories: async () => {
    const api = createAdminApi();
    const response = await api.get("/categories");
    return response.data;
  },

  getCategoryById: async (id) => {
    const api = createAdminApi();
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (formData) => {
    const api = createAdminApi();
    const response = await api.post("/categories", formData);
    return response.data;
  },

  updateCategory: async (id, formData) => {
    const api = createAdminApi();
    const response = await api.put(`/categories/${id}`, formData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const api = createAdminApi();
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Assign brands to a category
  assignBrandsToCategory: async (categoryId, brandIds) => {
    const api = createAdminApi();
    const response = await api.post(`/admin/categories/${categoryId}/brands`, { brandIds });
    return response.data;
  },
};

/**
 * Admin Order Service - Universal (all brands)
 */
export const adminOrderService = {
  getAllOrders: async (params = {}) => {
    const api = createAdminApi();
    const response = await api.get("/orders", { params });
    return response.data;
  },

  getOrderById: async (id) => {
    const api = createAdminApi();
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id, statusData) => {
    const api = createAdminApi();
    const response = await api.put(`/orders/${id}/status`, statusData);
    return response.data;
  },

  updateOrderPaymentStatus: async (id, paymentStatusData) => {
    const api = createAdminApi();
    const response = await api.put(`/orders/${id}/payment-status`, paymentStatusData);
    return response.data;
  },
};

/**
 * Admin Coupon Service - Universal (all brands)
 */
export const adminCouponService = {
  getAllCoupons: async () => {
    const api = createAdminApi();
    const response = await api.get("/coupons");
    return response.data;
  },

  getCouponById: async (id) => {
    const api = createAdminApi();
    const response = await api.get(`/coupons/${id}`);
    return response.data;
  },

  createCoupon: async (couponData) => {
    const api = createAdminApi();
    const response = await api.post("/coupons", couponData);
    return response.data;
  },

  updateCoupon: async (id, couponData) => {
    const api = createAdminApi();
    const response = await api.put(`/coupons/${id}`, couponData);
    return response.data;
  },

  deleteCoupon: async (id) => {
    const api = createAdminApi();
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
  },
};

/**
 * Admin Slider Service - Universal (all brands)
 */
export const adminSliderService = {
  getAllSliders: async () => {
    const api = createAdminApi();
    const response = await api.get("/sliders/admin/all");
    return response.data;
  },

  getSliderById: async (id) => {
    const api = createAdminApi();
    const response = await api.get(`/sliders/${id}`);
    return response.data;
  },

  createSlider: async (sliderData) => {
    const api = createAdminApi();
    const response = await api.post("/sliders", sliderData);
    return response.data;
  },

  updateSlider: async (id, sliderData) => {
    const api = createAdminApi();
    const response = await api.put(`/sliders/${id}`, sliderData);
    return response.data;
  },

  deleteSlider: async (id) => {
    const api = createAdminApi();
    const response = await api.delete(`/sliders/${id}`);
    return response.data;
  },
};



