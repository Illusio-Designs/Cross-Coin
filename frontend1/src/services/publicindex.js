import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        const response = await axios.get(`${API_URL}/api/categories/public`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get public category by name
export const getPublicCategoryByName = async (categoryName) => {
    try {
        const response = await axios.get(`${API_URL}/api/categories/public/name/${categoryName}`);
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

// Get public product by slug
export const getPublicProductBySlug = async (slug) => {
    try {
        const response = await axios.get(`${API_URL}/api/products/public/${slug}`);
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

// Validate a coupon
export const validateCoupon = async (code) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/coupons/validate`, { code }, {
            headers: { Authorization: `Bearer ${token}` }
        });
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

// Get current user (public, requires token)
export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Update user profile (public, requires token)
export const updateUserProfile = async (profileData) => {
    try {
        const token = localStorage.getItem('token');
        let headers = { Authorization: `Bearer ${token}` };
        let data = profileData;
        if (profileData instanceof FormData) {
            headers['Content-Type'] = 'multipart/form-data';
        }
        const response = await axios.put(`${API_URL}/api/users/me`, data, { headers });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Shipping Address APIs (public, require token)
export const createShippingAddress = async (addressData) => {
    try {
        const token = localStorage.getItem('token');
        // Map camelCase to snake_case for backend
        const payload = {
            address: addressData.address,
            city: addressData.city,
            state: addressData.state,
            postal_code: addressData.postalCode,
            country: addressData.country,
            phone_number: addressData.phoneNumber,
            is_default: addressData.isDefault
        };
        const response = await axios.post(`${API_URL}/api/shipping-addresses`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const getUserShippingAddresses = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/shipping-addresses`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.shippingAddresses;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const updateShippingAddress = async (id, addressData) => {
    try {
        const token = localStorage.getItem('token');
        // Map camelCase to snake_case for backend
        const payload = {
            address: addressData.address,
            city: addressData.city,
            state: addressData.state,
            postal_code: addressData.postalCode,
            country: addressData.country,
            phone_number: addressData.phoneNumber,
            is_default: addressData.isDefault
        };
        const response = await axios.put(`${API_URL}/api/shipping-addresses/${id}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const deleteShippingAddress = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/api/shipping-addresses/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const setDefaultShippingAddress = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(`${API_URL}/api/shipping-addresses/${id}/default`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get user orders
export const getUserOrders = async (params = {}) => {
    try {
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);

        const response = await axios.get(`${API_URL}/api/orders/my-orders?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const createOrder = async (orderData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/orders`, orderData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Shipping Fees
export const getShippingFees = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/shipping-fees`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// SEO
export const getSeoByPageName = async (pageName) => {
    try {
        const response = await axios.get(`${API_URL}/api/seo/${pageName}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Wishlist APIs (public, require token)
export const getWishlist = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/wishlist`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.wishlist || [];
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const addToWishlist = async (productId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/wishlist/add/${productId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const removeFromWishlist = async (productId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/api/wishlist/remove/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const clearWishlist = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/api/wishlist/clear`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const logout = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/users/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Cart APIs (public, require token)
export const getCart = async () => {
    try {
        const token = localStorage.getItem('token');
        console.log('publicindex: getCart called');
        const response = await axios.get(`${API_URL}/api/cart`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('publicindex: getCart response:', response.data);
        return response.data.cart || [];
    } catch (error) {
        console.error('publicindex: getCart error:', error.response?.data || error.message);
        throw error.response?.data || error.message;
    }
};

export const addToCart = async ({ productId, variationId, quantity }) => {
    try {
        console.log('publicindex: addToCart called with:', { productId, variationId, quantity });
        const token = localStorage.getItem('token');
        const payload = { productId, variationId, quantity };
        const response = await axios.post(`${API_URL}/api/cart/add`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('publicindex: addToCart response:', response.data);
        return response.data;
    } catch (error) {
        console.error('publicindex: addToCart error:', error.response?.data || error.message);
        throw error.response?.data || error.message;
    }
};

export const updateCartItem = async (productId, quantity, variationId) => {
    try {
        const token = localStorage.getItem('token');
        const payload = { quantity, variationId };
        const response = await axios.put(`${API_URL}/api/cart/item/${productId}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const removeFromCart = async (productId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/api/cart/item/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const clearCart = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/api/cart/clear`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Create Razorpay order (public)
export const createRazorpayOrder = async ({ amount, currency = 'INR', receipt }) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/api/payments/razorpay-order`,
            { amount, currency, receipt },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data.order;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get all public reviews (for testimonials)
export const getAllPublicReviews = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.sort) queryParams.append('sort', params.sort);
        const response = await axios.get(`${API_URL}/api/reviews/public/all?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
