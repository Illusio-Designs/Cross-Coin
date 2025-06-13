import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/';

// Authentication APIs
export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/api/users/register`, userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    } 
};

export const loginUser = async (credentials) => {
    try {
        const response = await axios.post(`${API_URL}/api/users/login`, credentials);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const forgotPassword = async (email) => {
    try {
        const response = await axios.post(`${API_URL}/api/users/forgot-password`, { email });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const resetPassword = async (resetData) => {
    try {
        const response = await axios.post(`${API_URL}/api/users/reset-password`, resetData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get public categories
export const getPublicCategories = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/categories/public/categories`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get public category by ID
export const getPublicCategoryById = async (categoryId) => {
    try {
        const response = await axios.get(`${API_URL}/api/categories/public/categories/${categoryId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get public sliders
export const getPublicSliders = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/sliders/public/sliders`);
        console.log('Public Sliders Response:', response.data);
        return response.data.sliders || response.data; // Handle both response formats
    } catch (error) {
        console.error('Error fetching public sliders:', error);
        throw error.response?.data || error.message;
    }
};

// Get public product by ID
export const getPublicProductById = async (productId) => {
    try {
        const response = await axios.get(`${API_URL}/api/products/public/${productId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get all public products
export const getAllPublicProducts = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.category) queryParams.append('category', params.category);
        if (params.search) queryParams.append('search', params.search);
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);

        const response = await axios.get(`${API_URL}/api/products/public?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
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
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.sort) queryParams.append('sort', params.sort);

        const response = await axios.get(`${API_URL}/api/reviews/public/${productId}?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Create a public review
export const createPublicReview = async (reviewData) => {
    try {
        const formData = new FormData();
        formData.append('productId', reviewData.get('productId'));
        formData.append('rating', reviewData.get('rating'));
        formData.append('comment', reviewData.get('comment'));
        formData.append('name', reviewData.get('name'));
        formData.append('email', reviewData.get('email'));

        // Append files if they exist
        const files = reviewData.getAll('files');
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('files', file);
            });
        }

        const response = await axios.post(`${API_URL}/api/reviews/public`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
