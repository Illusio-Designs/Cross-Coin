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
