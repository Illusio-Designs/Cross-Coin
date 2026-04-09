import axios from "axios";
import { API_URL, addBrandHeader } from "./config";

export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/register`, userData);
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, credentials);
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/forgot-password`, { email });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const resetPassword = async (resetData) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/reset-password`, resetData);
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const updateUserProfile = async (profileData) => {
  try {
    const token = localStorage.getItem("token");
    let headers = { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" };
    if (profileData instanceof FormData) headers["Content-Type"] = "multipart/form-data";
    const response = await axios.put(`${API_URL}/api/users/update`, profileData, { headers });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const updateUserPassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.put(`${API_URL}/api/users/update-password`, { currentPassword, newPassword, confirmPassword }, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const logout = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/api/users/logout`, {}, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};

export const deleteAccount = async (reason = '') => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.delete(`${API_URL}/api/users/delete`, {
      headers: { Authorization: `Bearer ${token}`, "X-Brand-Name": "crosscoin" },
      data: { reason },
    });
    return response.data;
  } catch (error) { throw error.response?.data || error.message; }
};
