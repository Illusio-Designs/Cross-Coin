import axios from "axios";
import { API_URL, addBrandHeader } from "./config";

export const createRazorpayOrder = async ({ amount, currency = "INR", receipt, isGuest = false }) => {
  try {
    const endpoint = isGuest
      ? `${API_URL}/api/payments/guest/razorpay/order`
      : `${API_URL}/api/payments/razorpay/order`;
    const headers = { "X-Brand-Name": "crosscoin" };
    if (!isGuest) {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await axios.post(endpoint, { amount, currency, receipt }, { headers });
    return response.data.order;
  } catch (error) { throw error.response?.data || error.message; }
};

export const updateOrderPayment = async ({ orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id }) => {
  try {
    const response = await axios.post(`${API_URL}/api/payments/razorpay/verify`, {
      orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, reservation_id,
    }, { headers: { "X-Brand-Name": "crosscoin" } });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const initiateCheckout = async (checkoutData) => {
  try {
    const token = localStorage.getItem("token");
    const utmSessionId = localStorage.getItem('utm_session_id');
    if (utmSessionId) checkoutData.utm_session_id = utmSessionId;
    const response = await axios.post(`${API_URL}/api/checkout/initiate`, checkoutData, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
      withCredentials: true, timeout: 30000,
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const initiateGuestCheckout = async (checkoutData) => {
  try {
    const utmSessionId = localStorage.getItem('utm_session_id');
    if (utmSessionId) checkoutData.utm_session_id = utmSessionId;
    const response = await axios.post(`${API_URL}/api/checkout/guest/initiate`, checkoutData, {
      headers: { "X-Brand-Name": "crosscoin" }, withCredentials: true, timeout: 30000,
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const retryCheckout = async (reservationId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/api/checkout/retry`, { reservation_id: reservationId }, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
      timeout: 30000,
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const sendCheckoutPhoneOtp = async (phone) => {
  // MSG91 widget handles sending — this is a no-op kept for compatibility
  return { success: true, message: 'OTP sent via MSG91 widget.' };
};

export const verifyCheckoutPhoneOtp = async (phone, access_token) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/otp/verify`, { phone, access_token }, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getShippingFees = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/shipping-fees`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const checkPincodeServiceability = async (pincode) => {
  try {
    const response = await axios.get(`${API_URL}/api/serviceability/${pincode}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};
