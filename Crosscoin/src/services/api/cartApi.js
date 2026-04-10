import axios from "axios";
import { API_URL } from "./config";

const cartHeaders = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" } };
};

export const getCart = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/cart`, cartHeaders());
    return response.data.cart || [];
  } catch (error) { throw error.response?.data || error.message; }
};

export const addToCart = async ({ productId, variationId, quantity, size }) => {
  try {
    const response = await axios.post(`${API_URL}/api/cart/items`, { productId, variationId, quantity, size }, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const updateCartItem = async (productId, quantity, variationId) => {
  try {
    const response = await axios.put(`${API_URL}/api/cart/items/${productId}`, { quantity, variationId }, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const removeFromCart = async (productId, variationId) => {
  try {
    let url = `${API_URL}/api/cart/items/${productId}`;
    if (variationId !== null && variationId !== undefined) url += `/${variationId}`;
    const response = await axios.delete(url, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const clearCart = async () => {
  try {
    const response = await axios.delete(`${API_URL}/api/cart`, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getWishlist = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/wishlist`, cartHeaders());
    return response.data.wishlist || [];
  } catch (error) { throw error.response?.data || error.message; }
};

export const addToWishlist = async (productId) => {
  try {
    const response = await axios.post(`${API_URL}/api/wishlist/${productId}`, {}, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const removeFromWishlist = async (productId) => {
  try {
    const response = await axios.delete(`${API_URL}/api/wishlist/${productId}`, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const clearWishlist = async () => {
  try {
    const response = await axios.delete(`${API_URL}/api/wishlist`, cartHeaders());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};
