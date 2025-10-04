import axios from "axios";
import apiCache from "../utils/apiCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

// Authentication APIs
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/users/register`,
      userData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/users/login`,
      credentials
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/forgot-password`, {
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const resetPassword = async (resetData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/users/reset-password`,
      resetData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get public categories
export const getPublicCategories = async () => {
  const cacheKey = apiCache.getCacheKey(`${API_URL}/api/categories/public`);
  
  // Check if request is already pending
  if (apiCache.isPending(cacheKey)) {
    console.log("Categories API call already in progress, waiting...");
    const pendingPromise = apiCache.pendingRequests.get(cacheKey);
    const response = await pendingPromise;
    return response.data;
  }

  // Check cache first
  if (apiCache.isValid(cacheKey)) {
    console.log("Categories data loaded from cache");
    return apiCache.get(cacheKey).data;
  }

  try {
    console.log("Fetching categories from API...");
    const promise = axios.get(`${API_URL}/api/categories/public`);
    
    // Add to pending requests
    const cachedPromise = apiCache.addPending(cacheKey, promise);
    
    const response = await cachedPromise;
    const data = response.data;
    
    // Cache the result
    apiCache.set(cacheKey, data);
    apiCache.removePending(cacheKey);
    
    console.log("Categories data cached successfully");
    return data;
  } catch (error) {
    apiCache.removePending(cacheKey);
    throw error.response?.data || error.message;
  }
};

// Get public category by name
export const getPublicCategoryByName = async (categoryName) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/categories/public/name/${categoryName}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get public sliders
export const getPublicSliders = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/sliders/public/sliders`);
    console.log("Public Sliders Response:", response.data);
    return response.data.sliders || response.data; // Handle both response formats
  } catch (error) {
    console.error("Error fetching public sliders:", error);
    throw error.response?.data || error.message;
  }
};

// Get public product by slug
export const getPublicProductBySlug = async (slug) => {
  try {
    console.log("API CALL: Fetching product with slug:", slug);
    console.log("API URL:", `${API_URL}/api/products/public/${slug}`);
    const response = await axios.get(`${API_URL}/api/products/public/${slug}`);
    console.log("API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("API ERROR:", error);
    console.error("Error response:", error.response?.data);
    console.error("Error status:", error.response?.status);
    throw error.response?.data || error.message;
  }
};

// Get all public products
export const getAllPublicProducts = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append("category", params.category);
  if (params.search) queryParams.append("search", params.search);
  if (params.sort) queryParams.append("sort", params.sort);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);

  const url = `${API_URL}/api/products/public?${queryParams.toString()}`;
  const cacheKey = apiCache.getCacheKey(url, params);

  // Check if request is already pending
  if (apiCache.isPending(cacheKey)) {
    console.log("Products API call already in progress, waiting...");
    return apiCache.pendingRequests.get(cacheKey);
  }

  // Check cache first (only for general products, not category-specific)
  if (!params.category && apiCache.isValid(cacheKey)) {
    console.log("Products data loaded from cache");
    return apiCache.get(cacheKey).data;
  }

  try {
    console.log("Fetching products from API...");
    const promise = axios.get(url);
    
    // Add to pending requests
    const cachedPromise = apiCache.addPending(cacheKey, promise);
    
    const response = await cachedPromise;
    const data = response.data;
    
    // Cache the result (only for general products)
    if (!params.category) {
      apiCache.set(cacheKey, data);
      console.log("Products data cached successfully");
    }
    
    apiCache.removePending(cacheKey);
    return data;
  } catch (error) {
    apiCache.removePending(cacheKey);
    throw error.response?.data || error.message;
  }
};

// Search products
export const searchProducts = async (query, params = {}) => {
  try {
    console.log("SEARCH API CALL: Searching for:", query);
    const queryParams = new URLSearchParams();
    queryParams.append("query", query);
    if (params.category) queryParams.append("category", params.category);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await axios.get(
      `${API_URL}/api/products/search?${queryParams.toString()}`
    );
    console.log("SEARCH API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("SEARCH API ERROR:", error);
    throw error.response?.data || error.message;
  }
};

// Get all public coupons
export const getPublicCoupons = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/coupons/public`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get public reviews for a product
export const getPublicProductReviews = async (productId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);

    const response = await axios.get(
      `${API_URL}/api/reviews/public/${productId}?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Validate a coupon
export const validateCoupon = async (code) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/api/coupons/validate`,
      { code },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create a public review
export const createPublicReview = async (reviewData) => {
  try {
    const formData = new FormData();
    formData.append("productId", reviewData.get("productId"));
    formData.append("rating", reviewData.get("rating"));
    formData.append("comment", reviewData.get("comment"));
    formData.append("name", reviewData.get("name"));
    formData.append("email", reviewData.get("email"));

    // Append files if they exist
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
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get current user (public, requires token)
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update user profile (public, requires token)
export const updateUserProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("token");
    let headers = { Authorization: `Bearer ${token}` };
    let data = profileData;
    if (profileData instanceof FormData) {
      headers["Content-Type"] = "multipart/form-data";
    }
    const response = await axios.put(`${API_URL}/api/users/me`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Shipping Address APIs (public, require token)
export const createShippingAddress = async (addressData) => {
  try {
    const token = localStorage.getItem("token");
    // Map camelCase to snake_case for backend
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
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getUserShippingAddresses = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/shipping-addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.shippingAddresses;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateShippingAddress = async (id, addressData) => {
  try {
    const token = localStorage.getItem("token");
    // Map camelCase to snake_case for backend
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
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Guest shipping address functions (no token required)
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
      payload
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getGuestShippingAddresses = async (guestEmail) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/shipping-addresses/guest?guest_email=${encodeURIComponent(
        guestEmail
      )}`
    );
    return response.data.shippingAddresses;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get user orders
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
        headers: { Authorization: `Bearer ${token}` },
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
    console.log("createOrder: Token available:", !!token);
    console.log("createOrder: Order data:", orderData);
    console.log("createOrder: Making API call to:", `${API_URL}/api/orders`);

    const response = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000, // 30 second timeout
    });
    console.log("createOrder: Response received:", response.data);
    return response.data;
  } catch (error) {
    console.error("createOrder: Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    throw error.response?.data || error.message;
  }
};

// Shipping Fees
export const getShippingFees = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/shipping-fees`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// SEO
export const getSeoByPageName = async (pageName) => {
  const url = `${API_URL}/api/seo?page_name=${encodeURIComponent(pageName)}`;
  const cacheKey = apiCache.getCacheKey(url, { page_name: pageName });
  
  // Check if request is already pending
  if (apiCache.isPending(cacheKey)) {
    console.log(`SEO API call for ${pageName} already in progress, waiting...`);
    return apiCache.pendingRequests.get(cacheKey);
  }

  // Check cache first
  if (apiCache.isValid(cacheKey)) {
    console.log(`SEO data for ${pageName} loaded from cache`);
    return apiCache.get(cacheKey).data;
  }

  try {
    console.log(`Fetching SEO data for page: ${pageName}`);
    const promise = axios.get(url);
    
    // Add to pending requests
    const cachedPromise = apiCache.addPending(cacheKey, promise);
    
    const response = await cachedPromise;
    const data = response.data;
    
    // Handle the response structure - backend returns { success: true, data: seoData }
    const seoData = data.success ? data.data : data;
    
    // Cache the result
    apiCache.set(cacheKey, seoData);
    apiCache.removePending(cacheKey);
    
    console.log(`SEO data for ${pageName} cached successfully:`, seoData);
    return seoData;
  } catch (error) {
    apiCache.removePending(cacheKey);
    console.error(`SEO API error for ${pageName}:`, error.response?.data || error.message);
    throw error.response?.data || error.message;
  }
};

// Wishlist APIs (public, require token)
export const getWishlist = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
      headers: { Authorization: `Bearer ${token}` },
    });
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
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Cart APIs (public, require token)
export const getCart = async () => {
  try {
    const token = localStorage.getItem("token");
    console.log("publicindex: getCart called");
    const response = await axios.get(`${API_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("publicindex: getCart response:", response.data);
    return response.data.cart || [];
  } catch (error) {
    console.error(
      "publicindex: getCart error:",
      error.response?.data || error.message
    );
    throw error.response?.data || error.message;
  }
};

export const addToCart = async ({ productId, variationId, quantity, size }) => {
  try {
    console.log("publicindex: addToCart called with:", {
      productId,
      variationId,
      quantity,
      size,
    });
    const token = localStorage.getItem("token");
    const payload = { productId, variationId, quantity, size };
    const response = await axios.post(`${API_URL}/api/cart/add`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("publicindex: addToCart response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "publicindex: addToCart error:",
      error.response?.data || error.message
    );
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
        headers: { Authorization: `Bearer ${token}` },
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
    // Only append variationId if it is not null or undefined
    if (variationId !== null && variationId !== undefined) {
      url += `/${variationId}`;
    }
    console.log("publicindex: removeFromCart URL:", url);
    console.log("publicindex: removeFromCart params:", {
      productId,
      variationId,
    });
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("publicindex: removeFromCart response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "publicindex: removeFromCart error:",
      error.response?.data || error.message
    );
    throw error.response?.data || error.message;
  }
};

export const clearCart = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/api/cart/clear`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create Razorpay order (public)
export const createRazorpayOrder = async ({
  amount,
  currency = "INR",
  receipt,
  isGuest = false,
}) => {
  try {
    const endpoint = isGuest 
      ? `${API_URL}/api/payments/guest/razorpay-order`
      : `${API_URL}/api/payments/razorpay-order`;
    
    const headers = {};
    
    // Only add authorization header for authenticated users
    if (!isGuest) {
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    
    console.log("Creating Razorpay order:", { endpoint, isGuest, amount, currency, receipt });
    
    const response = await axios.post(
      endpoint,
      { amount, currency, receipt },
      { headers }
    );
    return response.data.order;
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    throw error.response?.data || error.message;
  }
};

// Update order with payment details after successful payment
export const updateOrderPayment = async ({
  orderId,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature
}) => {
  try {
    console.log("Updating order payment details:", {
      orderId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    });
    
    const response = await axios.post(
      `${API_URL}/api/payments/update-order-payment`,
      {
        orderId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      }
    );
    
    console.log("Order payment update response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating order payment:", error);
    throw error.response?.data || error.message;
  }
};

// Get all public reviews (for testimonials)
export const getAllPublicReviews = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);
    const response = await axios.get(
      `${API_URL}/api/reviews/public/all?${queryParams.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPublicPolicyByName = async (name) => {
  try {
    const response = await axios.get(`${API_URL}/api/policies/name/${name}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Guest Checkout API
export const createGuestOrder = async (orderData) => {
  try {
    console.log("GUEST CHECKOUT API CALL: Creating guest order:", orderData);
    const response = await axios.post(`${API_URL}/api/orders/guest`, orderData);
    console.log("GUEST CHECKOUT API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("GUEST CHECKOUT API ERROR:", error);
    throw error.response?.data || error.message;
  }
};

// Guest Order Tracking API
export const getGuestOrder = async (email, orderNumber) => {
  try {
    console.log("GUEST ORDER TRACKING API CALL: Tracking order:", {
      email,
      orderNumber,
    });
    const response = await axios.get(
      `${API_URL}/api/orders/guest/track?email=${encodeURIComponent(
        email
      )}&orderNumber=${encodeURIComponent(orderNumber)}`
    );
    console.log("GUEST ORDER TRACKING API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("GUEST ORDER TRACKING API ERROR:", error);
    throw error.response?.data || error.message;
  }
};

// Track Order by AWB Number (works for both registered and guest orders)
export const trackOrderByAWB = async (awbNumber) => {
  try {
    console.log("AWB TRACKING API CALL: Tracking order by AWB:", awbNumber);
    const response = await axios.get(
      `${API_URL}/api/orders/track/awb?awb_number=${encodeURIComponent(
        awbNumber
      )}`
    );
    console.log("AWB TRACKING API RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.error("AWB TRACKING API ERROR:", error);
    throw error.response?.data || error.message;
  }
};
