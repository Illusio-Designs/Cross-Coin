import axios from "axios";
import { API_URL, BRAND_NAME, addBrandHeader } from "./config";

export const getUserOrders = async (params = {}) => {
  try {
    const token = localStorage.getItem("token");
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    const response = await axios.get(`${API_URL}/api/orders/my-orders?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const createOrder = async (orderData) => {
  try {
    const token = localStorage.getItem("token");
    const utmSessionId = localStorage.getItem('utm_session_id');
    if (utmSessionId) orderData.utm_session_id = utmSessionId;
    const response = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
      withCredentials: true, timeout: 30000,
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const createGuestOrder = async (orderData) => {
  try {
    const utmSessionId = localStorage.getItem('utm_session_id');
    if (utmSessionId) orderData.utm_session_id = utmSessionId;
    const response = await axios.post(`${API_URL}/api/orders/guest-checkout`, orderData, {
      headers: { "X-Brand-Name": "crosscoin" }, withCredentials: true,
    });
    const newToken = response.headers['x-auth-token'];
    if (newToken) {
      localStorage.setItem('token', newToken);
      window.dispatchEvent(new Event('storage'));
    }
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const trackOrderByOrderNumber = async (orderNumber) => {
  try {
    const response = await axios.get(`${API_URL}/api/orders/track/${encodeURIComponent(orderNumber)}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const trackOrderByAWB = async (awbNumber) => {
  try {
    const response = await axios.get(`${API_URL}/api/orders/track/awb?awb_number=${encodeURIComponent(awbNumber)}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const cancelOrder = async (orderId, reason = '') => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${API_URL}/api/orders/${orderId}/cancel`, { reason }, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": BRAND_NAME },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const initiateReturn = async (orderId, reason = '') => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/api/orders/${orderId}/return`, { reason }, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": BRAND_NAME },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};
