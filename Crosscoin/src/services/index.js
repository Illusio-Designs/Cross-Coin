import axios from "axios";
import { getTimeoutForEndpoint, handleTimeoutError, API_TIMEOUTS } from '../config/apiConfig';
import { validateListResponse, validateItemResponse, validatePaginatedResponse, getErrorMessage } from '../utils/apiResponseValidator';
import { rateLimiter } from '../utils/rateLimiter';
import { retryHandler } from '../utils/retryHandler';
import { dataCache } from '../utils/dataCache';
import { monitoring } from '../utils/monitoring';

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
          && window.location.pathname.startsWith("/dashboard")
          && !window.location.pathname.includes("/auth/")) {
        window.location.href = "/auth/adminlogin";
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


// ─────────────────────────────────────────────────────────────────────────
// NOTE: This was a 2,349-line admin service layer left over from when the
// dashboard lived in this app. The dashboard is now its own project, so only
// authService + userService (used by AuthContext) remain. Public storefront
// data access lives in services/api/* and services/publicApi.js.
// ─────────────────────────────────────────────────────────────────────────

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
      const response = await adminApi.get("/api/users/all?limit=1000");
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
