import axios from "axios";
import apiCache from "../utils/apiCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
const API_BASE_URL = API_URL;
const BRAND_NAME = "crosscoin";

// Create axios instance with brand header
const createPublicApiClient = () => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      "X-Brand-Name": BRAND_NAME,
    },
  });
};

// Helper to add brand header to axios config
const addBrandHeader = (config = {}) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      "X-Brand-Name": BRAND_NAME,
    },
  };
};

// Create axios instance for offer API
const offerAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to offer API requests if available
offerAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ AUTHENTICATION APIs ============
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/forgot-password`, { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const resetPassword = async (resetData) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/reset-password`, resetData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};


// ============ CATEGORY APIs ============
export const getPublicCategories = async () => {
  const cacheKey = apiCache.getCacheKey(`${API_URL}/api/categories/public`);
  
  if (apiCache.isPending(cacheKey)) {
    const pendingPromise = apiCache.getPending(cacheKey);
    const response = await pendingPromise;
    return response.data;
  }

  if (apiCache.isValid(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  try {
    const promise = axios.get(`${API_URL}/api/categories/public`, addBrandHeader());
    apiCache.addPending(cacheKey, promise);
    const response = await promise;
    const data = response.data;
    apiCache.set(cacheKey, data);
    return data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicCategoryByName = async (categoryName) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/categories/public/name/${categoryName}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ SLIDER APIs ============
export const getPublicSliders = async () => {
  const cacheKey = apiCache.getCacheKey(`${API_URL}/api/sliders/public`);
  
  if (apiCache.isPending(cacheKey)) {
    const pendingPromise = apiCache.getPending(cacheKey);
    const response = await pendingPromise;
    return response.data.sliders || response.data;
  }

  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const promise = axios.get(`${API_URL}/api/sliders/public`, addBrandHeader());
    apiCache.addPending(cacheKey, promise);
    const response = await promise;
    const data = response.data.sliders || response.data;
    apiCache.set(cacheKey, data, 10 * 60 * 1000);
    return data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ LOOKBOOK / REELS / INSTAGRAM APIs ============
export const getPublicLookbooks = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/lookbooks`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicLookbookBySlug = async (slug) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/lookbooks/${encodeURIComponent(slug)}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicReels = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/reels`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const incrementReelView = async (reelId) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/reels/${reelId}/view`,
      {},
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getInstagramFeed = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/instagram/feed`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ PRODUCT APIs ============
export const getPublicProductBySlug = async (slug) => {
  try {
    const response = await axios.get(`${API_URL}/api/products/public/${slug}`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllPublicProducts = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append("category", params.category);
  if (params.search) queryParams.append("search", params.search);
  if (params.sort) queryParams.append("sort", params.sort);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);

  const url = `${API_URL}/api/products/public?${queryParams.toString()}`;
  const cacheKey = apiCache.getCacheKey(url, params);

  if (apiCache.isPending(cacheKey)) {
    const pendingPromise = apiCache.getPending(cacheKey);
    const response = await pendingPromise;
    return response.data;
  }

  if (!params.category && apiCache.isValid(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  try {
    const promise = axios.get(url, addBrandHeader());
    apiCache.addPending(cacheKey, promise);
    const response = await promise;
    const data = response.data;
    if (!params.category) {
      apiCache.set(cacheKey, data);
    }
    return data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const searchProducts = async (query, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("query", query);
    if (params.category) queryParams.append("category", params.category);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await axios.get(
      `${API_URL}/api/products/search?${queryParams.toString()}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};


// ============ COUPON APIs ============
export const getPublicCoupons = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/coupons/public`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const validateCoupon = async (code, cartTotal, paymentMode = null, cartItems = null) => {
  try {
    const token = localStorage.getItem("token");
    const requestData = { code, cartTotal };
    
    if (paymentMode) {
      requestData.paymentMode = paymentMode;
    }
    
    if (cartItems && Array.isArray(cartItems)) {
      requestData.cartItems = cartItems;
    }
    
    const response = await axios.post(
      `${API_URL}/api/coupons/validate`,
      requestData,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Brand-Name": "crosscoin"
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ REVIEW APIs ============
export const getPublicProductReviews = async (productId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);

    const response = await axios.get(
      `${API_URL}/api/reviews/public/${productId}?${queryParams.toString()}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createPublicReview = async (reviewData) => {
  try {
    const formData = new FormData();
    formData.append("productId", reviewData.get("productId"));
    formData.append("rating", reviewData.get("rating"));
    formData.append("comment", reviewData.get("comment"));
    formData.append("name", reviewData.get("name"));
    formData.append("email", reviewData.get("email"));

    const files = reviewData.getAll("files");
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    const response = await axios.post(
      `${API_URL}/api/reviews/public`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllPublicReviews = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);
    const response = await axios.get(
      `${API_URL}/api/reviews/public/all?${queryParams.toString()}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ USER APIs ============
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/users/me`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("token");
    let headers = { 
      Authorization: `Bearer ${token}`,
      "X-Brand-Name": "crosscoin"
    };
    if (profileData instanceof FormData) {
      headers["Content-Type"] = "multipart/form-data";
    }
    const response = await axios.put(`${API_URL}/api/users/update`, profileData, {
      headers,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateUserPassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(
      `${API_URL}/api/users/update-password`,
      { currentPassword, newPassword, confirmPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const logout = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/api/users/logout`,
      {},
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};


// ============ SHIPPING ADDRESS APIs ============
export const createShippingAddress = async (addressData) => {
  try {
    const token = localStorage.getItem("token");
    const payload = {
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      postal_code: addressData.postalCode,
      country: addressData.country,
      phone_number: addressData.phoneNumber,
      is_default: addressData.isDefault,
    };
    
    const response = await axios.post(
      `${API_URL}/api/shipping-addresses`,
      payload,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    
    const cacheKey = apiCache.getCacheKey(`${API_URL}/api/shipping-addresses`);
    apiCache.remove(cacheKey);
    
    const addressToReturn = response.data.shippingAddress || response.data;
    return addressToReturn;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getUserShippingAddresses = async () => {
  const cacheKey = apiCache.getCacheKey(`${API_URL}/api/shipping-addresses`);
  
  if (apiCache.isPending(cacheKey)) {
    const pendingPromise = apiCache.getPending(cacheKey);
    const response = await pendingPromise;
    return response.data.shippingAddresses;
  }

  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const token = localStorage.getItem("token");
    const promise = axios.get(`${API_URL}/api/shipping-addresses`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    
    apiCache.addPending(cacheKey, promise);
    const response = await promise;
    const data = response.data.shippingAddresses;
    apiCache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateShippingAddress = async (id, addressData) => {
  try {
    const token = localStorage.getItem("token");
    const payload = {
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      postal_code: addressData.postalCode,
      country: addressData.country,
      phone_number: addressData.phoneNumber,
      is_default: addressData.isDefault,
    };
    const response = await axios.put(
      `${API_URL}/api/shipping-addresses/${id}`,
      payload,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    
    const cacheKey = apiCache.getCacheKey(`${API_URL}/api/shipping-addresses`);
    apiCache.remove(cacheKey);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteShippingAddress = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(
      `${API_URL}/api/shipping-addresses/${id}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    
    const cacheKey = apiCache.getCacheKey(`${API_URL}/api/shipping-addresses`);
    apiCache.remove(cacheKey);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const setDefaultShippingAddress = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(
      `${API_URL}/api/shipping-addresses/${id}/default`,
      {},
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    
    const cacheKey = apiCache.getCacheKey(`${API_URL}/api/shipping-addresses`);
    apiCache.remove(cacheKey);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createGuestShippingAddress = async (addressData, guestInfo) => {
  try {
    const payload = {
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      postal_code: addressData.postalCode,
      country: addressData.country,
      phone_number: addressData.phoneNumber,
      guest_info: {
        email: guestInfo.email,
        firstName: guestInfo.firstName,
        lastName: guestInfo.lastName,
      },
    };
    const response = await axios.post(
      `${API_URL}/api/shipping-addresses/guest`,
      payload,
      {
        headers: {
          "X-Brand-Name": "crosscoin"
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getGuestShippingAddresses = async (guestEmail) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/shipping-addresses/guest?guest_email=${encodeURIComponent(guestEmail)}`,
      {
        headers: {
          "X-Brand-Name": "crosscoin"
        }
      }
    );
    return response.data.shippingAddresses;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};


// ============ ORDER APIs ============
export const getUserOrders = async (params = {}) => {
  try {
    const token = localStorage.getItem("token");
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await axios.get(
      `${API_URL}/api/orders/my-orders?${queryParams.toString()}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createOrder = async (orderData) => {
  try {
    const token = localStorage.getItem("token");
    const utmSessionId = localStorage.getItem('utm_session_id');
    if (utmSessionId) {
      orderData.utm_session_id = utmSessionId;
    }

    const response = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
      withCredentials: true,
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createGuestOrder = async (orderData) => {
  try {
    const utmSessionId = localStorage.getItem('utm_session_id');
    if (utmSessionId) {
      orderData.utm_session_id = utmSessionId;
    }
    
    const response = await axios.post(`${API_URL}/api/orders/guest`, orderData, {
      headers: {
        "X-Brand-Name": "crosscoin"
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getGuestOrder = async (email, orderNumber) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/orders/guest/track?email=${encodeURIComponent(email)}&orderNumber=${encodeURIComponent(orderNumber)}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const trackOrderByOrderNumber = async (orderNumber) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const trackOrderByAWB = async (awbNumber) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/orders/track/awb?awb_number=${encodeURIComponent(awbNumber)}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ PAYMENT APIs ============
export const createRazorpayOrder = async ({ amount, currency = "INR", receipt, isGuest = false }) => {
  try {
    const endpoint = isGuest 
      ? `${API_URL}/api/payments/guest/razorpay-order`
      : `${API_URL}/api/payments/razorpay-order`;
    
    const headers = {
      "X-Brand-Name": "crosscoin"
    };
    
    if (!isGuest) {
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    
    const response = await axios.post(
      endpoint,
      { amount, currency, receipt },
      { headers }
    );
    return response.data.order;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateOrderPayment = async ({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature }) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/payments/update-order-payment`,
      {
        orderId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      },
      {
        headers: {
          "X-Brand-Name": "crosscoin"
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * COD checkout — request OTP to the delivery phone (Msg91 / Twilio / custom SMS on backend).
 * Backend should implement: POST /api/checkout/phone-otp/send
 */
export const sendCheckoutPhoneOtp = async (phone) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/checkout/phone-otp/send`,
      { phone },
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * COD checkout — verify OTP. On success, backend may return { success: true, token?: string }.
 * Backend should implement: POST /api/checkout/phone-otp/verify
 */
export const verifyCheckoutPhoneOtp = async (phone, code) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/checkout/phone-otp/verify`,
      { phone, code },
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ SHIPPING FEES APIs ============
export const getShippingFees = async () => {
  try {
    const token = localStorage.getItem("token");
    const brandName = "crosscoin";
    
    const response = await axios.get(`${API_URL}/api/shipping-fees`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Brand-Name": brandName,
      },
    });
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ SERVICEABILITY API ============
export const checkPincodeServiceability = async (pincode) => {
  try {
    const response = await axios.get(`${API_URL}/api/serviceability/${pincode}`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ SEO APIs ============
export const getSeoByPageName = async (pageName) => {
  const url = `${API_URL}/api/seo?page_name=${encodeURIComponent(pageName)}`;
  const cacheKey = apiCache.getCacheKey(url, { page_name: pageName });
  
  if (apiCache.isPending(cacheKey)) {
    const pendingPromise = apiCache.pendingRequests.get(cacheKey);
    const response = await pendingPromise;
    const data = response.data;
    return data.success ? data.data : data;
  }

  if (apiCache.isValid(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  try {
    const promise = axios.get(url, addBrandHeader());
    apiCache.addPending(cacheKey, promise);
    const response = await promise;
    const data = response.data;
    const seoData = data.success ? data.data : data;
    apiCache.set(cacheKey, seoData);
    return seoData;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicPolicyByName = async (name) => {
  try {
    const response = await axios.get(`${API_URL}/api/policies/name/${name}`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};


// ============ WISHLIST APIs ============
export const getWishlist = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/wishlist`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data.wishlist || [];
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const addToWishlist = async (productId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/api/wishlist/add/${productId}`,
      {},
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const removeFromWishlist = async (productId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(
      `${API_URL}/api/wishlist/remove/${productId}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const clearWishlist = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/api/wishlist/clear`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ CART APIs ============
export const getCart = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/cart`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data.cart || [];
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const addToCart = async ({ productId, variationId, quantity, size }) => {
  try {
    const token = localStorage.getItem("token");
    const payload = { productId, variationId, quantity, size };
    const response = await axios.post(`${API_URL}/api/cart/add`, payload, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateCartItem = async (productId, quantity, variationId) => {
  try {
    const token = localStorage.getItem("token");
    const payload = { quantity, variationId };
    const response = await axios.put(
      `${API_URL}/api/cart/item/${productId}`,
      payload,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-Brand-Name": "crosscoin"
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const removeFromCart = async (productId, variationId) => {
  try {
    const token = localStorage.getItem("token");
    let url = `${API_URL}/api/cart/item/${productId}`;
    if (variationId !== null && variationId !== undefined) {
      url += `/${variationId}`;
    }
    const response = await axios.delete(url, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const clearCart = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/api/cart/clear`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "X-Brand-Name": "crosscoin"
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};


// ============ COUPON INTEGRATION SERVICE ============
class CouponIntegrationService {
  constructor() {
    this.cachedCoupons = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  async getQuantityBasedCoupons() {
    const now = Date.now();
    
    if (this.cachedCoupons && this.cacheExpiry && now < this.cacheExpiry) {
      return this.cachedCoupons;
    }

    try {
      const response = await getPublicCoupons();
      
      if (response && response.coupons) {
        const quantityCoupons = response.coupons.filter(coupon => 
          coupon.type === 'quantity_based' && 
          coupon.status === 'active' &&
          coupon.quantityBasedDiscounts &&
          new Date(coupon.endDate) > new Date()
        );

        const validCoupons = quantityCoupons.map(coupon => {
          let quantityTiers = [];
          
          try {
            quantityTiers = typeof coupon.quantityBasedDiscounts === 'string' 
              ? JSON.parse(coupon.quantityBasedDiscounts)
              : coupon.quantityBasedDiscounts || [];
          } catch (e) {
            return null;
          }

          if (!Array.isArray(quantityTiers) || quantityTiers.length === 0) {
            return null;
          }

          quantityTiers.sort((a, b) => a.minQuantity - b.minQuantity);

          return {
            ...coupon,
            parsedTiers: quantityTiers
          };
        }).filter(Boolean);

        this.cachedCoupons = validCoupons;
        this.cacheExpiry = now + this.CACHE_DURATION;

        return validCoupons;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  async getBestOfferForCart(cartItems, cartTotal) {
    const coupons = await this.getQuantityBasedCoupons();
    if (coupons.length === 0) return null;

    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    let bestCurrentOffer = null;
    let bestNextOffer = null;

    coupons.forEach(coupon => {
      const tiers = coupon.parsedTiers;

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
      return {
        success: false,
        message: error.message || 'Failed to validate coupon'
      };
    }
  }

  async getOfferDisplayData(cartItems, cartTotal) {
    const offers = await this.getBestOfferForCart(cartItems, cartTotal);
    if (!offers) return null;

    const { current, next, totalQuantity } = offers;

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

  formatDiscount(discount, coupon) {
    if (coupon.type === 'quantity_based') {
      return `₹${discount} OFF`;
    } else if (coupon.type === 'percentage') {
      return `${discount}% OFF`;
    }
    return `₹${discount} OFF`;
  }

  clearCache() {
    this.cachedCoupons = null;
    this.cacheExpiry = null;
  }

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

    return applicableOffers.sort((a, b) => b.discount - a.discount);
  }
}

export const couponIntegrationService = new CouponIntegrationService();


// ============ OFFER API SERVICE ============
export const offerAPIService = {
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
      throw error;
    }
  },

  getFreeShippingThreshold: async () => {
    try {
      const response = await offerAPI.get('/cart/free-shipping-threshold');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPrepaidIncentive: async (cartTotal) => {
    try {
      const response = await offerAPI.get('/cart/prepaid-incentive', {
        params: { cartTotal }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  trackUpsellInteraction: async (upsellType, productId, action) => {
    try {
      const response = await offerAPI.post('/cart/track-upsell-interaction', {
        upsellType,
        productId,
        action
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  applyOfferDiscount: async (cartItems, offerId, offerType) => {
    try {
      const response = await offerAPI.post('/cart/apply-offer', {
        cartItems,
        offerId,
        offerType
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

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
      throw error;
    }
  },

  admin: {
    getUpsellRules: async () => {
      try {
        const response = await offerAPI.get('/admin/upsell-rules');
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    createUpsellRule: async (ruleData) => {
      try {
        const response = await offerAPI.post('/admin/upsell-rules', ruleData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    updateUpsellRule: async (ruleId, ruleData) => {
      try {
        const response = await offerAPI.put(`/admin/upsell-rules/${ruleId}`, ruleData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    deleteUpsellRule: async (ruleId) => {
      try {
        const response = await offerAPI.delete(`/admin/upsell-rules/${ruleId}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    getFreeShippingSettings: async () => {
      try {
        const response = await offerAPI.get('/admin/free-shipping-settings');
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    updateFreeShippingSettings: async (settings) => {
      try {
        const response = await offerAPI.put('/admin/free-shipping-settings', settings);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    getPrepaidIncentives: async () => {
      try {
        const response = await offerAPI.get('/admin/prepaid-incentives');
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    createPrepaidIncentive: async (incentiveData) => {
      try {
        const response = await offerAPI.post('/admin/prepaid-incentives', incentiveData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    updatePrepaidIncentive: async (incentiveId, incentiveData) => {
      try {
        const response = await offerAPI.put(`/admin/prepaid-incentives/${incentiveId}`, incentiveData);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    deletePrepaidIncentive: async (incentiveId) => {
      try {
        const response = await offerAPI.delete(`/admin/prepaid-incentives/${incentiveId}`);
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    getUpsellAnalytics: async (startDate, endDate, type) => {
      try {
        const response = await offerAPI.get('/admin/upsell-analytics', {
          params: { startDate, endDate, type }
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  }
};

// ============ BLOG APIs (Public) ============
export const getPublicBlogs = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append("category", params.category);
    if (params.tag) queryParams.append("tag", params.tag);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    const response = await axios.get(
      `${API_URL}/api/blogs/public?${queryParams.toString()}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicBlogBySlug = async (slug) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/blogs/public/${slug}`,
      addBrandHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicBlogTags = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/blogs/tags`, addBrandHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
