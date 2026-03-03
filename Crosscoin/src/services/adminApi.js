import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Admin API Client with Dynamic Brand Support
 * Allows admins to manage multiple brands by passing brand slug
 */

/**
 * Create an API instance with dynamic brand header
 * @param {string} brandSlug - The brand slug to use for this request
 * @returns {AxiosInstance}
 */
export const createAdminApi = (brandSlug = 'crosscoin') => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 0,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Brand-Name": brandSlug, // Dynamic brand header
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
 * Admin Product Service with Brand Support
 */
export const adminProductService = {
  getAllProducts: async (brandSlug, page = 1, limit = 10, search = "") => {
    const api = createAdminApi(brandSlug);
    const params = { page, limit, search };
    if (!search) delete params.search;
    const response = await api.get("/products", { params });
    return response.data;
  },

  getProduct: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (brandSlug, productData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.post("/products", productData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  updateProduct: async (brandSlug, id, productData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.put(`/products/${id}`, productData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteProduct: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

/**
 * Admin Category Service with Brand Support
 */
export const adminCategoryService = {
  getAllCategories: async (brandSlug) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get("/categories");
    return response.data;
  },

  getCategoryById: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (brandSlug, formData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.post("/categories", formData);
    return response.data;
  },

  updateCategory: async (brandSlug, id, formData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.put(`/categories/${id}`, formData);
    return response.data;
  },

  deleteCategory: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

/**
 * Admin Order Service with Brand Support
 */
export const adminOrderService = {
  getAllOrders: async (brandSlug, params = {}) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get("/orders", { params });
    return response.data;
  },

  getOrderById: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (brandSlug, id, statusData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.put(`/orders/${id}/status`, statusData);
    return response.data;
  },

  updateOrderPaymentStatus: async (brandSlug, id, paymentStatusData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.put(`/orders/${id}/payment-status`, paymentStatusData);
    return response.data;
  },
};

/**
 * Admin Coupon Service with Brand Support
 */
export const adminCouponService = {
  getAllCoupons: async (brandSlug) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get("/coupons");
    return response.data;
  },

  getCouponById: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get(`/coupons/${id}`);
    return response.data;
  },

  createCoupon: async (brandSlug, couponData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.post("/coupons", couponData);
    return response.data;
  },

  updateCoupon: async (brandSlug, id, couponData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.put(`/coupons/${id}`, couponData);
    return response.data;
  },

  deleteCoupon: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
  },
};

/**
 * Admin Slider Service with Brand Support
 */
export const adminSliderService = {
  getAllSliders: async (brandSlug) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get("/sliders/admin/all");
    return response.data;
  },

  getSliderById: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.get(`/sliders/${id}`);
    return response.data;
  },

  createSlider: async (brandSlug, sliderData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.post("/sliders", sliderData);
    return response.data;
  },

  updateSlider: async (brandSlug, id, sliderData) => {
    const api = createAdminApi(brandSlug);
    const response = await api.put(`/sliders/${id}`, sliderData);
    return response.data;
  },

  deleteSlider: async (brandSlug, id) => {
    const api = createAdminApi(brandSlug);
    const response = await api.delete(`/sliders/${id}`);
    return response.data;
  },
};

export default {
  createAdminApi,
  adminProductService,
  adminCategoryService,
  adminOrderService,
  adminCouponService,
  adminSliderService,
};
