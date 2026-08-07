import axios from "axios";
import { API_URL, addBrandHeader } from "./config";

export const getPublicCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/categories/listing`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicCategoryByName = async (categoryName) => {
  try {
    const response = await axios.get(`${API_URL}/api/categories/by-name/${categoryName}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicSliders = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/sliders/listing`, addBrandHeader());
    return response.data.sliders || response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicLookbooks = async () => {
  try { const r = await axios.get(`${API_URL}/api/lookbooks`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const getPublicLookbookBySlug = async (slug) => {
  try { const r = await axios.get(`${API_URL}/api/lookbooks/${encodeURIComponent(slug)}`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const getPublicProductBySlug = async (slug) => {
  try { const r = await axios.get(`${API_URL}/api/products/by-slug/${slug}`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const getAllPublicProducts = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append("category", params.category);
  if (params.search) queryParams.append("search", params.search);
  if (params.sort) queryParams.append("sort", params.sort);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);
  const url = `${API_URL}/api/products/catalog?${queryParams.toString()}`;
  try {
    const response = await axios.get(url, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const searchProducts = async (query, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("query", query);
    if (params.category) queryParams.append("category", params.category);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    const response = await axios.get(`${API_URL}/api/products/search?${queryParams.toString()}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicCoupons = async () => {
  try { const r = await axios.get(`${API_URL}/api/coupons/listing`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const validateCoupon = async (code, cartTotal, paymentMode = null, cartItems = null) => {
  try {
    const token = localStorage.getItem("token");
    const requestData = { code, cartTotal };
    if (paymentMode) requestData.paymentMode = paymentMode;
    if (cartItems && Array.isArray(cartItems)) requestData.cartItems = cartItems;
    const response = await axios.post(`${API_URL}/api/coupons/validate`, requestData, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicProductReviews = async (productId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);
    const response = await axios.get(`${API_URL}/api/reviews/product/${productId}?${queryParams.toString()}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
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
    if (files?.length > 0) files.forEach(f => formData.append("files", f));
    const response = await axios.post(`${API_URL}/api/reviews/submit`, formData, {
      headers: { "Content-Type": "multipart/form-data", "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getAllPublicReviews = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);
    const response = await axios.get(`${API_URL}/api/reviews/all?${queryParams.toString()}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getSeoByPageName = async (pageName) => {
  try {
    const response = await axios.get(`${API_URL}/api/seo?page_name=${encodeURIComponent(pageName)}`, addBrandHeader());
    return response.data.success ? response.data.data : response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicPolicyByName = async (name) => {
  try { const r = await axios.get(`${API_URL}/api/policies/name/${name}`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const getPublicBlogs = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append("category", params.category);
    if (params.tag) queryParams.append("tag", params.tag);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    const response = await axios.get(`${API_URL}/api/blogs/listing?${queryParams.toString()}`, addBrandHeader());
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getPublicBlogBySlug = async (slug) => {
  try { const r = await axios.get(`${API_URL}/api/blogs/by-slug/${slug}`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const getPublicBlogTags = async () => {
  try { const r = await axios.get(`${API_URL}/api/blogs/tags`, addBrandHeader()); return r.data; }
  catch (error) { throw error.response?.data || error.message; }
};

export const createShippingAddress = async (addressData) => {
  try {
    const token = localStorage.getItem("token");
    const payload = {
      address: addressData.address, landmark: addressData.landmark || null,
      city: addressData.city, state: addressData.state,
      postal_code: addressData.postalCode, country: addressData.country,
      phone_number: addressData.phoneNumber, is_default: addressData.isDefault,
    };
    const response = await axios.post(`${API_URL}/api/shipping-addresses`, payload, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data.shippingAddress || response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getUserShippingAddresses = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/shipping-addresses`, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data.shippingAddresses;
  } catch (error) { throw error.response?.data || error.message; }
};

export const updateShippingAddress = async (id, addressData) => {
  try {
    const token = localStorage.getItem("token");
    const payload = {
      address: addressData.address, landmark: addressData.landmark || null,
      city: addressData.city, state: addressData.state,
      postal_code: addressData.postalCode, country: addressData.country,
      phone_number: addressData.phoneNumber, is_default: addressData.isDefault,
    };
    const response = await axios.put(`${API_URL}/api/shipping-addresses/${id}`, payload, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const deleteShippingAddress = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/api/shipping-addresses/${id}`, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const setDefaultShippingAddress = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${API_URL}/api/shipping-addresses/${id}/default`, {}, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const createGuestShippingAddress = async (addressData, guestInfo) => {
  try {
    const payload = {
      address: addressData.address, landmark: addressData.landmark || null,
      city: addressData.city, state: addressData.state,
      postal_code: addressData.postalCode, country: addressData.country,
      phone_number: addressData.phoneNumber,
      guest_info: { email: guestInfo.email, firstName: guestInfo.firstName, lastName: guestInfo.lastName },
    };
    const response = await axios.post(`${API_URL}/api/shipping-addresses/guest`, payload, {
      headers: { "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getGuestShippingAddresses = async (guestEmail) => {
  try {
    const response = await axios.get(`${API_URL}/api/shipping-addresses/guest?guest_email=${encodeURIComponent(guestEmail)}`, {
      headers: { "X-Brand-Name": "crosscoin" },
    });
    return response.data.shippingAddresses;
  } catch (error) { throw error.response?.data || error.message; }
};
