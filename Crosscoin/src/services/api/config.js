import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
export const API_BASE_URL = API_URL;
export const BRAND_NAME = "crosscoin";

export const createPublicApiClient = () => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      "X-Brand-Name": BRAND_NAME,
    },
  });
};

export const addBrandHeader = (config = {}) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      "X-Brand-Name": BRAND_NAME,
    },
  };
};

export const authHeader = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Brand-Name": BRAND_NAME,
    },
  };
};

// Read a single cookie value by name from document.cookie. Returns null when
// absent or when document is unavailable (SSR). Never throws.
export const getCookie = (name) => {
  try {
    if (typeof document === "undefined" || !document.cookie) return null;
    const match = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    return null;
  }
};

// Attach Facebook _fbp / _fbc identifiers to an order/checkout payload so the
// backend Conversions API can match the user. Best-effort — wrapped so it can
// never block checkout.
export const attachFbTracking = (payload) => {
  try {
    const fbp = getCookie("_fbp");
    if (fbp) payload.fbp = fbp;

    let fbc = getCookie("_fbc");
    if (!fbc) {
      const fbclid = (typeof localStorage !== "undefined") ? localStorage.getItem("fbclid") : null;
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
    if (fbc) payload.fbc = fbc;
  } catch (e) {
    /* best-effort; never block checkout */
  }
  return payload;
};

// Axios instance for offer API
export const offerAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

offerAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
