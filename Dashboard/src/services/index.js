import axios from "axios";
import { getTimeoutForEndpoint, handleTimeoutError, API_TIMEOUTS } from '../config/apiConfig';
import { validateListResponse, validateItemResponse, validatePaginatedResponse, getErrorMessage } from '../utils/apiResponseValidator';
import { rateLimiter } from '../utils/rateLimiter';
import { retryHandler } from '../utils/retryHandler';
import { dataCache } from '../utils/dataCache';
import { monitoring } from '../utils/monitoring';

// Drop every cached list response for an endpoint (all param combinations), so
// the next list fetch after a create/update/delete hits the API.
const invalidateCache = (endpoint) => {
  const prefix = `${endpoint}:`;
  for (const key of Array.from(dataCache.cache.keys())) {
    if (key.startsWith(prefix)) {
      dataCache.cache.delete(key);
      dataCache.timestamps.delete(key);
    }
  }
};

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
export const adminApi = axios.create({
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
    // Track request start time
    config.startTime = Date.now();

    // Pick a timeout. getTimeoutForEndpoint matches "/products" into the
    // 10s "quick" bucket — fine for catalog GETs, fatal for product
    // CREATE/UPDATE which runs a multi-step transaction and FormData
    // image upload. Two carve-outs:
    //   - Writes (POST/PUT/PATCH/DELETE) get 15s default minimum.
    //   - FormData uploads get the 60s file-operation bucket.
    const method = (config.method || 'get').toLowerCase();
    const isWrite = ['post', 'put', 'patch', 'delete'].includes(method);
    const isUpload = config.data instanceof FormData;

    let timeout = getTimeoutForEndpoint(config.url || '');
    if (isUpload) {
      timeout = Math.max(timeout, API_TIMEOUTS.fileOperation);
    } else if (isWrite) {
      timeout = Math.max(timeout, API_TIMEOUTS.default);
    }
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
    if (typeof window !== 'undefined' && monitoring) {
      const startTime = response.config?.startTime || Date.now();
      const duration = Date.now() - startTime;
      monitoring.trackAPICall(
        response.config?.url || 'unknown',
        duration,
        response.status
      );
    }
    return response;
  },
  (error) => {
    if (typeof window !== 'undefined' && monitoring) {
      const startTime = error.config?.startTime || Date.now();
      const duration = Date.now() - startTime;
      const status = error.response?.status || 0;
      monitoring.trackAPICall(
        error.config?.url || 'unknown',
        duration,
        status
      );
      if (error.response?.status !== 401) {
        monitoring.logError(error, {
          endpoint: error.config?.url,
          status: error.response?.status,
          type: 'api_error'
        });
      }
    }

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
    // Track request start time
    config.startTime = Date.now();

    // Same write/upload-aware timeout as the public api interceptor.
    // Without this, the admin's POST /api/products (create) and
    // PUT /api/products/:id (edit) fall into the 10s "quick" bucket
    // because the URL contains "/products", and the request gets
    // aborted at exactly 10.01s — visible in the network tab as
    // (cancelled). createProduct + updateProduct both ship FormData
    // image uploads, so they need the file-operation 60s window.
    const method = (config.method || 'get').toLowerCase();
    const isWrite = ['post', 'put', 'patch', 'delete'].includes(method);
    const isUpload = config.data instanceof FormData;

    let timeout = getTimeoutForEndpoint(config.url || '');
    if (isUpload) {
      timeout = Math.max(timeout, API_TIMEOUTS.fileOperation);
    } else if (isWrite) {
      timeout = Math.max(timeout, API_TIMEOUTS.default);
    }
    config.timeout = timeout;

    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (config.data instanceof FormData) config.headers["Content-Type"] = "multipart/form-data";
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined' && monitoring) {
      const startTime = response.config?.startTime || Date.now();
      const duration = Date.now() - startTime;
      monitoring.trackAPICall(
        response.config?.url || 'unknown',
        duration,
        response.status
      );
    }
    return response;
  },
  (error) => {
    if (typeof window !== 'undefined' && monitoring) {
      const startTime = error.config?.startTime || Date.now();
      const duration = Date.now() - startTime;
      const status = error.response?.status || 0;
      monitoring.trackAPICall(
        error.config?.url || 'unknown',
        duration,
        status
      );
      if (error.response?.status !== 401) {
        monitoring.logError(error, {
          endpoint: error.config?.url,
          status: error.response?.status,
          type: 'api_error'
        });
      }
    }

    if (error.code === "ECONNABORTED") {
      const userMessage = handleTimeoutError(error);
      return Promise.reject(new Error(userMessage));
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Only bounce to the admin login when the user is actually inside the
      // admin dashboard. A stale/expired admin token must NOT redirect public
      // storefront visitors (e.g. the home page) to /auth/adminlogin — just
      // drop the token and let the public page render normally.
      if (typeof window !== "undefined"
          && window.location.pathname.startsWith("/dashboard")) {
        window.location.href = "/login";
      }
    }

    // Track errors for circuit breaker pattern
    if (error.response?.status >= 500) {
      const endpoint = error.config?.url || 'unknown';
      retryHandler.getCircuitStatus(endpoint) || retryHandler.resetCircuit(endpoint);
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

// Rate-limited + Retry API call wrapper
// Prevents API overload AND handles transient failures with exponential backoff
const makeRateLimitedCall = async (endpoint, requestFn, dedupeKey = null, enableRetry = true) => {
  // Wait for rate limit slot to be available
  await rateLimiter.waitForSlot(endpoint);

  // Wrapper function that applies retry logic
  const wrappedFn = enableRetry ? () => retryHandler.executeWithRetry(requestFn, {
    maxRetries: 2, // 2 retries = 3 total attempts
    onRetry: ({ attempt, maxRetries, delay, error }) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`API retry: ${endpoint} attempt ${attempt}/${maxRetries + 1} after ${Math.round(delay)}ms due to: ${error.message}`);
      }
    },
  }) : requestFn;

  // If deduping key provided, use deduplication to prevent concurrent duplicates
  if (dedupeKey) {
    return rateLimiter.deduplicateRequest(dedupeKey, wrappedFn);
  }

  return wrappedFn();
};

// Shipping Fee Services
export const leadService = {
  getLeads: async () => {
    const { data } = await adminApi.get('/api/leads');
    return data;
  },
  // DPDP grievance triage — update a contact message's status / note.
  updateContactStatus: async (contactId, { status, admin_note } = {}) => {
    const { data } = await adminApi.patch(`/api/leads/contact/${contactId}/status`, { status, admin_note });
    return data;
  },
};

// Abandoned carts — captured checkouts + WhatsApp recovery stats.
export const abandonedCartService = {
  list: async (params = {}) => {
    try {
      const { data } = await adminApi.get('/api/admin/abandoned-carts', { params });
      return data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Dashboard → Loyalty points (Backend services/loyaltyAdminService.js).
const loyErr = (error) => new Error(error.response?.data?.message || error.message || 'Something went wrong');
export const loyaltyService = {
  summary: async (brandId) => {
    try { return (await adminApi.get('/api/admin/loyalty/summary', { params: { brandId: brandId || undefined } })).data.data; } catch (e) { throw loyErr(e); }
  },
  // { tab: all|earned|spent|staff|expired, q, brandId, page, limit }
  getTransactions: async (params = {}) => {
    try { return (await adminApi.get('/api/admin/loyalty/transactions', { params })).data.data; } catch (e) { throw loyErr(e); }
  },
  customer: async (userId) => {
    try { return (await adminApi.get(`/api/admin/loyalty/customer/${userId}`)).data.data; } catch (e) { throw loyErr(e); }
  },
  // Give (+) or take (−) points; the reason is saved in the customer's points history.
  adjustPoints: async ({ userId, points, description, brandId }) => {
    try {
      return (await adminApi.post('/api/admin/loyalty/adjust', {
        userId: Number(userId), points: Number(points), description: description || '', brandId: brandId || undefined,
      })).data;
    } catch (e) { throw loyErr(e); }
  },
  // { brandId? (absent = every brand), earnRate, redeemRate, maxRedeemPercent, expiryDays } — admin only.
  saveRules: async (body) => {
    try { return (await adminApi.put('/api/admin/loyalty/rules', body)).data; } catch (e) { throw loyErr(e); }
  },
};

// Brand-wise traffic & conversion funnel (sessions → orders → revenue).
export const trafficReportService = {
  getBrandTraffic: async (startDate, endDate, brandId) => {
    const params = { startDate, endDate };
    if (brandId) params.brandId = brandId;
    const { data } = await adminApi.get('/api/reports/brand-traffic', { params });
    return data;
  },
  // Reports Overview — pipeline-based sales summary (net sales, rates, RTO…).
  getSalesSummary: async (startDate, endDate, brandId) => {
    const { data } = await adminApi.get('/api/reports/sales-summary', { params: { startDate, endDate, brandId } });
    if (!data?.success) throw new Error(data?.message || 'Failed to load the sales report');
    return data;
  },
  getRevenueProfit: async (startDate, endDate) => {
    const { data } = await adminApi.get('/api/reports/revenue-profit', { params: { startDate, endDate } });
    return data;
  },
  getMissingCostPrices: async () => {
    const { data } = await adminApi.get('/api/reports/missing-cost-prices');
    return data;
  },
};

// Report pages (Location, Products, Customers, Inventory, Coupons) —
// GET /api/reports/<name>; each page passes its own params.
export const reportPagesService = {
  get: async (name, params) => {
    const { data } = await adminApi.get(`/api/reports/${name}`, { params });
    if (!data?.success) throw new Error(data?.message || 'Failed to load the report');
    return data;
  },
};

// System health (admin only) — server, job queue, webhooks, errors and the
// scheduled jobs with their run log; "Run now" for one job.
export const systemHealthService = {
  getHealth: async () => {
    const { data } = await adminApi.get('/api/admin/system/health');
    if (!data?.success) throw new Error(data?.message || 'Failed to load system health');
    return data;
  },
  // Resolves { finished, run? , message? }; rejects with the server's message
  // (e.g. "This job is running right now").
  runJob: async (key) => {
    try {
      const { data } = await adminApi.post(`/api/admin/system/jobs/${encodeURIComponent(key)}/run`);
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to start the job');
    }
  },
};

// Meta Conversions API (server-side pixel) diagnostics. Both endpoints resolve
// the brand from the X-Brand-Name header, so pass the brand's slug per call.
export const facebookCapiService = {
  runTest: async (brandSlug) => {
    const { data } = await adminApi.post('/api/facebook-pixel/test', {}, {
      headers: brandSlug ? { 'X-Brand-Name': brandSlug } : {},
    });
    return data;
  },
};

// Dashboard → Shipping & courier (per-brand fees, free-delivery threshold,
// COD limit, courier account + webhook summary).
export const shippingFeeService = {
  getAdminOverview: async () => {
    try {
      const response = await adminApi.get("/api/shipping-fees/admin/overview");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // rules: { prepaidFee, codFee, offerCod, freeOver, codMax }
  saveBrandRules: async (brandId, rules) => {
    try {
      const response = await adminApi.put(`/api/shipping-fees/admin/brand/${brandId}`, rules);
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
// Shared pickup schedule (weekly offs + blocked date ranges).
export const pickupScheduleService = {
  get: async () => {
    const { data } = await adminApi.get('/api/pickup-schedule');
    return data;
  },
  save: async (schedule) => {
    const { data } = await adminApi.put('/api/pickup-schedule', schedule);
    return data;
  },
  // Orders already booked whose pickup falls in a date range (a new block can't
  // hold these). Returns { count, orders: [{ orderNumber, pickupDate }] }.
  affected: async (from, to) => {
    const { data } = await adminApi.get('/api/pickup-schedule/affected', { params: { from, to } });
    return data;
  },
};

export const orderService = {
  // Order Desk: live counts per work queue (tabs).
  getDeskCounts: async (brandId) => {
    try {
      const response = await adminApi.get('/api/orders/desk/counts', { params: brandId && brandId !== 'all' ? { brand_id: brandId } : {} });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },

  // Order Desk: one order's history, payments/refunds, returns, NDR cases.
  getOrderDesk: async (id) => {
    try {
      const response = await adminApi.get(`/api/orders/${id}/desk`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },

  getAllOrders: async (params = {}, signal = null, forceRefresh = false) => {
    const cacheKey = JSON.stringify(params);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = dataCache.get('/api/orders', params);
      if (cached) return cached;
    }

    return makeRateLimitedCall('/api/orders', async () => {
      try {
        const config = { params };
        if (signal) config.signal = signal;
        const response = await adminApi.get("/api/orders", config);
        const validated = validatePaginatedResponse(response.data);
        const result = {
          orders: validated.items,
          data: validated.items,
          total: validated.total,
          page: validated.page,
          pages: validated.pages,
          limit: validated.limit
        };
        // Cache successful response
        dataCache.set('/api/orders', result, params, 3 * 60 * 1000); // 3 min TTL
        return result;
      } catch (error) {
        if (error.name === 'CanceledError') {
          const emptyResult = { orders: [], data: [], total: 0, page: 1, pages: 0, limit: 10 };
          return emptyResult;
        }
        // Try to use stale cache on error
        const stale = dataCache.getStale('/api/orders', params);
        if (stale) return stale;
        throw new Error(getErrorMessage(error.response?.data || error.message));
      }
    }, `orders_list_${cacheKey}`);
  },

  getOrderById: async (id, signal = null) => {
    return makeRateLimitedCall(`/api/orders/${id}`, async () => {
      try {
        const config = {};
        if (signal) config.signal = signal;
        const response = await adminApi.get(`/api/orders/${id}`, config);
        const order = validateItemResponse(response.data, 'data') || validateItemResponse(response.data);
        return order || {};
      } catch (error) {
        if (error.name === 'CanceledError') return {};
        throw new Error(getErrorMessage(error.response?.data || error.message));
      }
    }, `order_${id}`);
  },

  getAllOrderStatusHistory: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/order-status-history", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Shipping Integration Services

  // Update single order from Shipping
  updateSingleOrderFromShipping: async (orderId) => {
    try {
      const response = await adminApi.put(
        `/api/orders/${orderId}/shipping/sync`,
        {},
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Sync single order with Shipping
  syncSingleOrderWithShipping: async (orderId) => {
    try {
      const response = await adminApi.put(
        `/api/orders/${orderId}/shipping/sync`,
        {},
        { timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Courier updates log — params: { page, pageSize, filter: all|problems|unmatched, q, brandId }.
  getShippingWebhookEvents: async (params = {}) => {
    try {
      const response = await adminApi.get(`/api/orders/shipping/webhook-events`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Replay a stored webhook event — re-runs the courier's exact payload
  // through the webhook handler to re-apply the status update to the order.
  replayWebhookEvent: async (eventId) => {
    try {
      const response = await adminApi.post(`/api/orders/shipping/webhook-events/${eventId}/replay`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Shipping tracking for order
  getShippingTracking: async (orderId) => {
    try {
      const response = await adminApi.get(`/api/orders/${orderId}/shipping/tracking`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Shipping shipping label for order
  getShippingLabel: async (orderId) => {
    try {
      const response = await adminApi.get(`/api/orders/${orderId}/shipping/label`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get Shipping couriers list
  getShippingCouriers: async () => {
    try {
      const response = await adminApi.get("/api/orders/shipping/couriers");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel orders in Shipping
  cancelOrdersInShipping: async (orderIds) => {
    try {
      const response = await adminApi.post("/api/orders/shipping/cancel", { orderIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin cancel order
  adminCancelOrder: async (orderId, reason) => {
    try {
      const response = await adminApi.put(`/api/orders/${orderId}/admin-cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Refund a prepaid order's Razorpay payment (full by default). Also retries a
  // refund stuck at refund_pending.
  refundOrder: async (orderId, reason) => {
    try {
      const response = await adminApi.put(`/api/orders/${orderId}/refund`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  confirmOrder: async (orderId) => {
    try {
      const response = await adminApi.put(`/api/orders/${orderId}/confirm`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Permanently delete an order (admin only, irreversible).
  adminDeleteOrder: async (orderId) => {
    try {
      const response = await adminApi.delete(`/api/orders/${orderId}`);
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

      // An empty range returns JSON (not a blob) — detect and surface it.
      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text || '{}');
        return { success: false, message: json.message || 'No delivered orders found for the selected range' };
      }

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

  // GST sales report for delivered orders (per line item, filtered by order date)
  exportGstReport: async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await adminApi.get('/api/orders/export/gst-report', {
        params, responseType: 'blob', timeout: 60000,
      });
      // An empty range returns JSON (not a blob) — detect and surface it.
      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text || '{}');
        return { success: false, message: json.message || 'No delivered orders found for the selected range' };
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GST_Report_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true, message: 'GST report downloaded' };
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

  // Admin: edit an order's shipping address (fix pincode/phone/etc that blocks shipping)
  updateOrderAddress: async (orderId, data) => {
    try {
      const response = await adminApi.put(`/api/orders/${orderId}/address`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Label Download Management
  
  // Mark label as downloaded
  markLabelDownloaded: async (orderId) => {
    try {
      const response = await adminApi.post(`/api/orders/labels/${orderId}/downloaded`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Download the GST invoice PDF for an order
  downloadInvoice: async (orderId, orderNumber) => {
    try {
      const response = await adminApi.get(`/api/orders/${orderId}/invoice`, {
        responseType: 'blob',
        timeout: 30000
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${orderNumber || orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true };
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

  // Get available couriers for an order
  getAvailableCouriers: async (orderId) => {
    try {
      const response = await adminApi.get(`/api/orders/${orderId}/shipping/couriers`, { timeout: 30000 });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Sync order with a selected courier
  syncOrderWithCourier: async (orderId, courierData) => {
    try {
      const response = await adminApi.post(`/api/orders/${orderId}/sync-with-courier`, courierData, { timeout: 30000 });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Generate label for order
  generateManifest: async (orderIds) => {
    try {
      // Call label generation endpoint instead of manifest
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        const orderId = orderIds[0];
        const response = await adminApi.post(`/api/orders/${orderId}/labels/generate`, {}, { timeout: 30000 });
        return response.data;
      }
      throw new Error('No order ID provided');
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

};

// Failed deliveries (courier NDR cases) — actions from Orders → Problems.
export const ndrService = {
  sendToCourier: async (id, action, date) => {
    try {
      const response = await adminApi.post(`/api/ndr/${id}/courier`, { action, date });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  // New delivery address for the order ({ address, useSaved, reattempt, date }).
  saveAddress: async (id, payload) => {
    try {
      const response = await adminApi.post(`/api/ndr/${id}/address`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  resolve: async (id, note) => {
    try {
      const response = await adminApi.post(`/api/ndr/${id}/resolve`, { note });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
};

// Orders → Problems: failed deliveries, returns and refunds due in one queue.
export const exceptionsService = {
  // { type: all|ndr|return|refund, brandId, q, page, limit } → { items, counts, needsYou, total, totalPages }
  list: async (params = {}) => {
    try {
      const response = await adminApi.get('/api/admin/exceptions', { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  // src = ndr | return | order
  get: async (src, id) => {
    try {
      const response = await adminApi.get(`/api/admin/exceptions/${src}/${id}`);
      return response.data.item;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  getReturnCharges: async (brandId) => {
    try {
      const response = await adminApi.get('/api/admin/exceptions/return-charges', { params: { brandId } });
      return response.data.charges;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  saveReturnCharges: async (brandId, charges) => {
    try {
      const response = await adminApi.put('/api/admin/exceptions/return-charges', { brandId, ...charges });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
};

// Payment Services — Dashboard → Payments (admin / order manager)
// Dashboard → Payments (Backend services/paymentsAdminService.js).
const payErr = (error) => new Error(error.response?.data?.message || getErrorMessage(error.response?.data || error.message));
export const paymentService = {
  // { period: 1|7|30, tab, q, brandId, page, limit } → { rows, total, pages, … }
  list: async (params = {}) => {
    try { return (await adminApi.get('/api/payments/admin/list', { params })).data; } catch (error) { throw payErr(error); }
  },
  summary: async (params = {}) => {
    try { return (await adminApi.get('/api/payments/admin/summary', { params })).data; } catch (error) { throw payErr(error); }
  },
  // Payments pending/failed here but captured at Razorpay (cached 10 min; refresh forces a new check).
  mismatches: async ({ brandId, refresh } = {}) => {
    try { return (await adminApi.get('/api/payments/admin/mismatches', { params: { brandId: brandId || undefined, refresh: refresh ? 1 : undefined } })).data; } catch (error) { throw payErr(error); }
  },
  // { orderId } = "Mark paid & confirm"; { paymentId, action: 'create' | 'refund' } = charged with no order.
  fixMismatch: async (body) => {
    try { return (await adminApi.post('/api/payments/admin/mismatches/fix', body)).data; } catch (error) { throw payErr(error); }
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
  getCurrentUser: async (signal = null) => {
    return makeRateLimitedCall('/api/users/me', async () => {
      try {
        const token = localStorage.getItem("token");

        const config = {};
        if (signal) config.signal = signal;
        const response = await adminApi.get("/api/users/me", config);

        // The API returns user data directly, not nested under a user property
        if (!response.data) {
          return null;
        }

        const user = validateItemResponse(response.data) || {};
        return user.id ? user : null;
      } catch (error) {
        if (error.name === 'CanceledError') return null;
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
        }
        throw new Error(getErrorMessage(error.response?.data || error.message));
      }
    }, 'current_user');
  },

  getProfile: async () => {
    try {
      const response = await adminApi.get("/api/users/profile");
      const profile = validateItemResponse(response.data, 'data') || validateItemResponse(response.data);
      return profile || {};
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
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

  // Staff users only — queried server-side by role, with last sign-in and
  // what each person did in the last 7 days.
  getStaffUsers: async () => {
    try {
      const response = await adminApi.get("/api/users/staff-list");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Customers page: one row per shopper (registered, guest or lead) with
  // orders / spend / RTO, server-side search + paging, and segment counts.
  // params: { q, brandId, segment, sort, page, limit }
  getCustomerList: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/customers", { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // CSV of the whole filtered customer list (admin only) — saved as a file.
  downloadCustomerList: async (params = {}, filename = 'customers.csv') => {
    try {
      const response = await adminApi.get("/api/admin/customers/export", {
        params, responseType: 'blob', timeout: 120000,
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      // Error bodies arrive as a Blob too — surface the server's message.
      const data = error.response?.data;
      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        let message = 'Download failed';
        try { message = JSON.parse(await data.text()).message || message; } catch { /* not JSON */ }
        throw { message };
      }
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
  // Admin: delete another user (customers are erased, staff deactivated).
  adminDeleteUser: async (id) => {
    try {
      const response = await adminApi.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Change the signed-in user's own password.
  updatePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    try {
      const response = await adminApi.put("/api/users/update-password", { currentPassword, newPassword, confirmPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
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
  // brandSlug is optional. When provided, the X-Brand-Name header is sent
  // per-request and the backend scopes the listing to that brand via its
  // optional brand middleware. With no slug the admin sees all brands.
  getAllCategories: async (brandSlug = '') => {
    try {
      const config = {};
      if (brandSlug) {
        config.headers = { 'X-Brand-Name': brandSlug };
      }
      const response = await adminApi.get("/api/categories", config);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
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

  // params (optional): brandId, search, state (live|scheduled|ended|draft), page, limit
  getAllSliders: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/sliders/admin/all", { params });
      // { sliders, total, page, limit, counts }
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

  // Homepage order: ids in the order they should show.
  reorderSliders: async (ids) => {
    try {
      const response = await adminApi.put("/api/sliders/admin/reorder", { ids });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

};

// Website area: Photos library, policies list, SEO pages list.
export const websiteService = {
  // params: search, usage (all|used|unused|products|slides|posts), page, limit
  listMedia: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/website/media", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadMedia: async (files) => {
    try {
      const formData = new FormData();
      for (const f of files) formData.append("images", f);
      const response = await adminApi.post("/api/admin/website/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // keys: photo file names; only photos used nowhere are deleted.
  deleteMedia: async (keys) => {
    try {
      const response = await adminApi.delete("/api/admin/website/media", { data: { keys } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // params: brandId (id | 'global' | ''), search
  listPolicies: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/website/policies", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // params: brandId, search, state (all|live|fix|hidden), page, limit
  listSeoPages: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/website/seo-pages", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
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
      invalidateCache('/api/products');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAllProducts: async (page = 1, limit = 10, search = "", signal = null, forceRefresh = false, brandSlug = '', listMode = false) => {
    // Bake brandSlug + listMode into the cache key so a lean "table" response
    // and a full response never overwrite each other.
    const cacheParams = { page, limit, search: search || '', brand: brandSlug || '', view: listMode ? 'list' : 'full' };

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = dataCache.get('/api/products', cacheParams);
      if (cached) return cached;
    }

    return makeRateLimitedCall('/api/products', async () => {
      try {
        const params = { page, limit, search };
        if (!search) {
          delete params.search;
        }
        if (listMode) params.view = 'list'; // lean columns for the admin table
        const config = { params };
        if (signal) config.signal = signal;
        // Per-request brand header — adminApi has none by default so the
        // admin sees every brand's products. Setting this scopes the list
        // to one brand via the backend's optional brand middleware.
        if (brandSlug) {
          config.headers = { ...(config.headers || {}), 'X-Brand-Name': brandSlug };
        }
        const response = await adminApi.get("/api/products", config);
        const validated = validatePaginatedResponse(response.data);
        const result = {
          products: validated.items,
          data: validated.items,
          total: validated.total,
          page: validated.page,
          pages: validated.pages,
          limit: validated.limit
        };
        // Cache successful response
        dataCache.set('/api/products', result, cacheParams, 3 * 60 * 1000); // 3 min TTL
        return result;
      } catch (error) {
        if (error.name === 'CanceledError') {
          const emptyResult = { products: [], data: [], total: 0, page: 1, pages: 0, limit: 10 };
          return emptyResult;
        }
        // Try to use stale cache on error
        const stale = dataCache.getStale('/api/products', cacheParams);
        if (stale) return stale;
        throw new Error(getErrorMessage(error.response?.data || error.message));
      }
    }, `products_list_page${page}_limit${limit}_search${search}`);
  },

  getProduct: async (id, signal = null) => {
    return makeRateLimitedCall(`/api/products/${id}`, async () => {
      try {
        const config = {};
        if (signal) config.signal = signal;
        const response = await adminApi.get(`/api/products/${id}`, config);
        const product = validateItemResponse(response.data, 'data') || validateItemResponse(response.data);
        return product || {};
      } catch (error) {
        if (error.name === 'CanceledError') return {};
        throw new Error(getErrorMessage(error.response?.data || error.message));
      }
    }, `product_${id}`);
  },

  updateProduct: async (id, productData) => {
    try {
      const response = await adminApi.put(`/api/products/${id}`, productData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // No timeout here
      });
      invalidateCache('/api/products');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Products page — stock-first list (server-side search/filter/sort/paging),
  // one product's sizes, and the inline stock edit. Errors keep the server's
  // body ({ message, code, current }) so the page can roll back precisely.
  getStockList: async (params = {}, signal) => {
    const response = await adminApi.get('/api/products/admin/stock-list', { params, signal });
    return response.data;
  },
  getVariationStock: async (productId) => {
    const response = await adminApi.get(`/api/products/admin/${productId}/variations`);
    return response.data;
  },
  updateVariationStock: async (variationId, stock, expected) => {
    try {
      const response = await adminApi.patch(`/api/products/admin/variations/${variationId}/stock`, { stock, expected });
      invalidateCache('/api/products');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message || 'Could not save the stock' };
    }
  },

  // Re-runs the backend's SEO auto-fill helper from scratch and returns the
  // derived fields (or persists them when persist=true). Used by the "Regenerate
  // from product data" button in the SEO section of the product editor.
  regenerateSeo: async (id, persist = false) => {
    try {
      const response = await adminApi.post(`/api/products/${id}/seo/regenerate`, { persist });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await adminApi.delete(`/api/products/${id}`);
      invalidateCache('/api/products');
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

};

// Coupon Services (admin). Every call throws an Error with the server's message.
const couponCall = async (fn) => {
  try {
    return (await fn()).data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || error?.message || 'Request failed');
  }
};
export const couponService = {
  // { coupons, counts, pagination, period } — tab live|scheduled|off|ended|all, brandId '' = all stores
  list: ({ tab = 'live', search = '', brandId = '', page = 1, limit = 25, days = 30 } = {}) =>
    couponCall(() => adminApi.get('/api/coupons', { params: { tab, page, limit, days, ...(search ? { search } : {}), ...(brandId ? { brandId } : {}) } })),
  summary: ({ brandId = '', days = 30 } = {}) =>
    couponCall(() => adminApi.get('/api/coupons/admin/summary', { params: { days, ...(brandId ? { brandId } : {}) } })).then((d) => d.summary),
  dependencies: () => couponCall(() => adminApi.get('/api/coupons/admin/dependencies')).then((d) => d.warnings || []),
  // kind 'category' | 'product'; ids resolves names for chips already chosen
  picker: ({ kind, search = '', ids = [] }) =>
    couponCall(() => adminApi.get('/api/coupons/admin/picker', { params: { kind, ...(search ? { search } : {}), ...(ids.length ? { ids: ids.join(',') } : {}) } })).then((d) => d.items || []),
  get: (id) => couponCall(() => adminApi.get(`/api/coupons/${id}`)).then((d) => d.coupon),
  create: (data) => couponCall(() => adminApi.post('/api/coupons', data)),
  update: (id, data) => couponCall(() => adminApi.put(`/api/coupons/${id}`, data)),
  remove: (id) => couponCall(() => adminApi.delete(`/api/coupons/${id}`)),
  // Admin: switch on and, when asked, make it usable for a store ({ brandId, owner, allBrands })
  switchOn: (id, body = {}) => couponCall(() => adminApi.post(`/api/coupons/${id}/switch-on`, body)),
};

// Review Services
export const reviewService = {
  // Moderation list: { reviews, pagination, counts, avgRating, reviewRequestsToday }.
  // tab = pending | approved | rejected | photos; brandId '' = all brands.
  getModerationList: async ({ tab = 'pending', brandId, search, page = 1, limit = 20 } = {}) => {
    try {
      const response = await adminApi.get('/api/reviews/admin/all', {
        params: { tab, page, limit, ...(brandId ? { brandId } : {}), ...(search ? { search } : {}) },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // One-tap / bulk moderation in one transaction. action = approve | reject | feature | unfeature.
  bulkModerate: async (ids, action) => {
    try {
      const response = await adminApi.post('/api/reviews/admin/bulk', { ids, action });
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

  // Status / featured / staff notes for one review.
  moderateReview: async (id, { status, is_featured, admin_notes }) => {
    try {
      const response = await adminApi.put(`/api/reviews/admin/${id}/moderate`, { status, is_featured, admin_notes });
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

  // Bulk-import reviews from an Excel / CSV file. The selected brand is sent as
  // the X-Brand-Name header so every imported review is scoped to that brand
  // (rows may still override it with a `brand` column). Returns the per-row
  // import report { created, skipped, errors[] }.
  bulkUpload: async (file, { brandSlug, defaultStatus = 'approved' } = {}) => {
    try {
      const form = new FormData();
      form.append('file', file);
      if (defaultStatus) form.append('defaultStatus', defaultStatus);
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (brandSlug) headers['X-Brand-Name'] = brandSlug;
      const response = await adminApi.post('/api/reviews/admin/bulk-upload', form, { headers });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// SEO Services — adminApi by default sends NO brand header, but the backend
// schema requires brand_id NOT NULL on writes. We tag every SEO request with
// X-Brand-Name: <brandSlug> so the backend resolves brand_id and scopes the
// page metadata to that brand. The slug comes from the brand selector in the
// SEO hub; it defaults to 'crosscoin' (brand id 1) when none is supplied.
const seoBrandHeader = (brandSlug = 'crosscoin') => ({ 'X-Brand-Name': brandSlug || 'crosscoin' });

export const seoService = {

  getSEOData: async (pageName, brandSlug) => {
    try {
      const response = await adminApi.get(`/api/seo?page_name=${pageName}`, { headers: seoBrandHeader(brandSlug) });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createSEOData: async (formData, brandSlug) => {
    try {
      const data = new FormData();
      data.append("page_name", formData.get("page_name"));
      data.append("meta_title", formData.get("meta_title"));
      data.append("meta_description", formData.get("meta_description"));
      data.append("meta_keywords", formData.get("meta_keywords"));

      // Carry the SEO fields the backend's /create accepts. These used to be
      // dropped here, so renaming a page (delete old + create new) silently
      // lost its canonical URL, robots directive and JSON-LD. Only append when
      // present so we never overwrite with empty strings on a bare create.
      ["canonical_url", "robots", "structured_data"].forEach((k) => {
        const v = formData.get(k);
        if (v !== null && v !== undefined && String(v).length) data.append(k, v);
      });

      const image = formData.get("meta_image");
      if (image && image instanceof File) {
        data.append("meta_image", image);
      } else if (image) {
        data.append("meta_image", image);
      }

      const response = await adminApi.post("/api/seo/create", data, {
        headers: { "Content-Type": "multipart/form-data", ...seoBrandHeader(brandSlug) },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateSEOData: async (formData, brandSlug) => {
    try {
      const response = await adminApi.put("/api/seo/update", formData, {
        headers: { "Content-Type": "multipart/form-data", ...seoBrandHeader(brandSlug) },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteSEOData: async (pageName, brandSlug) => {
    try {
      const response = await adminApi.delete(`/api/seo/${pageName}`, { headers: seoBrandHeader(brandSlug) });
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
  // Shared company GSTIN — set once, substituted into every policy's {{GSTIN}}.
  getCompanyInfo: async () => {
    try {
      const response = await adminApi.get("/api/policies/company-info");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  setCompanyInfo: async (gstin) => {
    try {
      const response = await adminApi.put("/api/policies/company-info", { gstin });
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

// SEO admin services — health summary, bulk product SEO editor.
// Dashboard → Attributes (choices shoppers pick, and the store menu filters).
const attrCall = async (fn) => {
  try { return (await fn()).data; } catch (error) { throw error.response?.data || error.message; }
};
export const attributeAdminService = {
  overview: (brandId) => attrCall(() => adminApi.get("/api/admin/attributes", { params: { brandId } })),
  create: (data) => attrCall(() => adminApi.post("/api/admin/attributes", data)),
  update: (id, data) => attrCall(() => adminApi.put(`/api/admin/attributes/${id}`, data)),
  remove: (id) => attrCall(() => adminApi.delete(`/api/admin/attributes/${id}`)),
  addValues: (id, values) => attrCall(() => adminApi.post(`/api/admin/attributes/${id}/values`, { values })),
  updateValue: (id, valueId, data) => attrCall(() => adminApi.put(`/api/admin/attributes/${id}/values/${valueId}`, data)),
  removeValue: (id, valueId) => attrCall(() => adminApi.delete(`/api/admin/attributes/${id}/values/${valueId}`)),
  reorder: (data) => attrCall(() => adminApi.put("/api/admin/attributes/order", data)),
};

export const seoAdminService = {
  // SEO page: score, tiles and the "To fix" list for one store.
  overview: async (brandId) => {
    try {
      const response = await adminApi.get("/api/admin/seo/overview", { params: { brandId } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Store details (SEO_* settings) — open to product managers.
  storeDetails: async (brandId) => {
    try {
      const response = await adminApi.get("/api/admin/seo/store-details", { params: { brandId } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  saveStoreDetails: async (brandId, values) => {
    try {
      const response = await adminApi.put("/api/admin/seo/store-details", { brandId, values });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  health: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/seo/health", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  listProducts: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/seo/products", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  bulkUpdate: async (items) => {
    try {
      const response = await adminApi.put("/api/admin/seo/products/bulk", { items });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// FAQ Services (admin CRUD + public read)
export const faqService = {
  list: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/faqs", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  create: async (data) => {
    try {
      const response = await adminApi.post("/api/admin/faqs", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  update: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/admin/faqs/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  remove: async (id) => {
    try {
      const response = await adminApi.delete(`/api/admin/faqs/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  reorder: async (order) => {
    try {
      const response = await adminApi.put("/api/admin/faqs/reorder", { order });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Pack / bundle pricing tiers (buy more, save more) managed per brand.
export const bundleService = {
  list: async (params = {}) => {
    try {
      const response = await adminApi.get("/api/admin/bundle-tiers", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  create: async (data) => {
    try {
      const response = await adminApi.post("/api/admin/bundle-tiers", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  update: async (id, data) => {
    try {
      const response = await adminApi.put(`/api/admin/bundle-tiers/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  remove: async (id) => {
    try {
      const response = await adminApi.delete(`/api/admin/bundle-tiers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Dashboard Services
export const dashboardService = {
  // Home "today": work queues, pipeline, numbers and recent activity.
  getToday: async (brandId) => {
    const { data } = await adminApi.get("/api/dashboard/today", { params: brandId ? { brandId } : {} });
    if (!data?.success) throw new Error(data?.message || "Failed to load today's dashboard");
    return data;
  },
  // Menu badges — { orders, problems, whatsapp, products, reviews, health },
  // only the ones this user's roles can open.
  getNavCounts: async (brandId) => {
    const { data } = await adminApi.get("/api/admin/nav-counts", { params: brandId ? { brandId } : {} });
    return data?.counts || {};
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
  // ── Dashboard → Brands (plain forms; secrets come back masked) ──
  getOverview: async () => {
    try {
      const response = await adminApi.get("/api/admin/brand-settings/overview");
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getForm: async (brandId, { checkSite = true } = {}) => {
    try {
      const response = await adminApi.get("/api/admin/brand-settings/form", { params: { brandId, checkSite: checkSite ? 1 : 0 } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // body: { values: { KEY: value }, remove: [KEY], brand: { display_name, … } }
  saveForm: async (brandId, body) => {
    try {
      const response = await adminApi.put("/api/admin/brand-settings/form", { brandId, ...body });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  testRazorpay: async (brandId) => {
    try {
      const response = await adminApi.post("/api/admin/brand-settings/test/razorpay", { brandId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Existing WhatsApp test send (shared number, this brand's name in the text).
  sendWhatsAppTest: async (brandId, phone) => {
    try {
      const response = await adminApi.post("/api/whatsapp/settings/test", { brandId, phone });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAudit: async (brandId, page = 1) => {
    try {
      const response = await adminApi.get("/api/admin/brand-settings/audit", { params: { brandId, page } });
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

  // List the warehouses iThink considers visible to this brand's API token.
  // Used by the Shipping Settings page to diagnose "Warehouse Address Not Found".
  listIThinkWarehouses: async (brandId) => {
    try {
      const response = await adminApi.get('/api/admin/shipping/ithink-warehouses', {
        params: { brandId },
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
  uploadThumbnailImage: async (id, file) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await adminApi.post(`/api/blogs/admin/posts/${id}/thumbnail-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
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

  // Canonical default template definitions (for the management UI).
  listDefaultTemplates: async (brandId = 1) => {
    const response = await adminApi.get(`/api/whatsapp/templates/defaults?brandId=${brandId}`);
    return response.data;
  },

  // Seed default templates. Pass `names` (array) to seed one or a selected
  // batch; omit for all.
  seedTemplates: async (brandId = 1, names = null) => {
    const body = { brandId };
    if (Array.isArray(names) && names.length) body.names = names;
    const response = await adminApi.post('/api/whatsapp/templates/seed', body);
    return response.data;
  },

  // Delete + recreate (re-submit for approval). Pass `names` for a subset.
  syncAllTemplates: async (brandId = 1, names = null) => {
    const body = { brandId };
    if (Array.isArray(names) && names.length) body.names = names;
    const response = await adminApi.put('/api/whatsapp/templates/sync-all', body);
    return response.data;
  },

  // Update a single template (delete + recreate → re-enters PENDING review).
  updateTemplate: async (name, brandId = 1) => {
    const response = await adminApi.put(`/api/whatsapp/templates/${name}`, { brandId });
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

  // Orders, totals and the 24-hour reply window for the panel beside a chat.
  getContext: async (conversationId) => {
    const response = await adminApi.get(`/api/whatsapp/conversations/${conversationId}/context`);
    return response.data;
  },

  getMessages: async (conversationId, before = null, signal = undefined) => {
    const response = await adminApi.get(`/api/whatsapp/conversations/${conversationId}/messages`, {
      params: before ? { before } : {},
      signal, // lets the caller abort a superseded fetch when the agent switches chats
    });
    return response.data;
  },

  // Live inbox long-poll: holds open until a new inbound message or ~25s.
  streamUpdates: async (brandId = 1, status = 'open', since = null, signal = undefined) => {
    const response = await adminApi.get('/api/whatsapp/stream', {
      params: { brandId, status, ...(since ? { since } : {}) },
      signal,
      timeout: 40000,
    });
    return response.data;
  },

  sendReply: async (conversationId, message, brandId = 1, quotedWaMessageId = null) => {
    const response = await adminApi.post(`/api/whatsapp/conversations/${conversationId}/reply`, {
      message, brandId, ...(quotedWaMessageId ? { quotedWaMessageId } : {})
    });
    return response.data;
  },

  // Catalog-free product card(s): photo + name/price + product link.
  sendProductLink: async (conversationId, productIds, brandId = 1) => {
    const response = await adminApi.post(`/api/whatsapp/conversations/${conversationId}/send-product-link`, {
      productIds, brandId,
    });
    return response.data;
  },

  // ── Web Push (browser notifications) ──
  getPushVapidKey: async () => {
    const response = await adminApi.get('/api/notifications/push/vapid-public-key');
    return response.data;
  },
  savePushSubscription: async (subscription) => {
    const response = await adminApi.post('/api/notifications/push/subscribe', { subscription });
    return response.data;
  },

  // Attach & send a file (image / video / audio / document) to the customer.
  sendMedia: async (conversationId, file, brandId = 1, caption = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('brandId', brandId);
    if (caption) form.append('caption', caption);
    const response = await adminApi.post(`/api/whatsapp/conversations/${conversationId}/send-media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  },

  resolveConversation: async (conversationId, status = 'resolved') => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/resolve`, { status });
    return response.data;
  },

  setConversationBrand: async (conversationId, brandId) => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/brand`, { brandId });
    return response.data;
  },

  updateConversationNote: async (conversationId, note) => {
    const response = await adminApi.put(`/api/whatsapp/conversations/${conversationId}/note`, { note });
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

  seedCannedResponses: async (brandId = 1) => {
    const response = await adminApi.post('/api/whatsapp/canned-responses/seed', { brandId });
    return response.data;
  },

  // Returns a proxied URL for a Meta media ID (audio, image, video, document)
  getMediaProxyUrl: (mediaId, brandId = 1) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
    return `${adminApi.defaults.baseURL}/api/whatsapp/media/${mediaId}?brandId=${brandId}&token=${token}`;
  },

  syncProductsCatalog: async (brandId = 1) => {
    const response = await adminApi.post('/api/whatsapp/products/sync-catalog', { brandId });
    return response.data;
  },
};

// ── Returns & Refunds (admin) ──────────────────────────────────────────────
export const returnService = {
  approve: async (id, payload) => {
    try {
      const res = await adminApi.post(`/api/returns/${id}/approve`, payload);
      return res.data;
    } catch (error) {
      const d = error.response?.data;
      const e = new Error(getErrorMessage(d || error.message));
      e.code = d?.code;
      throw e;
    }
  },
  reject: async (id, reason) => {
    try {
      const res = await adminApi.post(`/api/returns/${id}/reject`, { reason });
      return res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  uploadProof: async (id, file) => {
    try {
      const fd = new FormData();
      fd.append('proof', file);
      const res = await adminApi.post(`/api/returns/${id}/proof`, fd);
      return res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },  markPickedUp: async (id) => {
    try {
      const res = await adminApi.post(`/api/returns/${id}/picked-up`);
      return res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  // Parcel back at the warehouse — restocks (unless restock=false) and refunds.
  receive: async (id, restock = true) => {
    try {
      const res = await adminApi.post(`/api/returns/${id}/receive`, { restock });
      return res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error.response?.data || error.message));
    }
  },
  // Issue/retry the refund for a received return (e.g. after uploading proof).
  refund: async (id, refundAmount) => {
    try {
      const res = await adminApi.post(`/api/returns/${id}/refund`, refundAmount != null ? { refund_amount: refundAmount } : {});
      return res.data;
    } catch (error) {
      const d = error.response?.data;
      const e = new Error(getErrorMessage(d || error.message));
      e.code = d?.code;
      throw e;
    }
  },
};
