import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request interceptor
api.interceptors.request.use((config) => {
    console.log("=== API Request ===");
    console.log("URL:", config.url);
    console.log("Method:", config.method);
    console.log("Base URL:", API_BASE_URL);
    
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Authorization header set");
    } else {
        console.log("No token found for request");
    }
    
    if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
}, (error) => {
    console.log("=== Request Error ===");
    console.log("Error:", error.message);
    return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log("=== API Response Success ===");
        console.log("Status:", response.status);
        console.log("Data:", response.data);
        return response;
    },
    (error) => {
        console.log("=== API Response Error ===");
        console.log("Status:", error.response?.status);
        console.log("Message:", error.message);
        console.log("Error Data:", error.response?.data);
        
        if (error.code === 'ECONNABORTED') {
            console.log("Request timed out");
            return Promise.reject(new Error('Request timed out. Please try again.'));
        }
        
        if (error.response?.status === 401) {
            console.log("Unauthorized - clearing token");
            localStorage.removeItem('token');
            // Don't redirect here, let the component handle the redirect
        }
        
        return Promise.reject(error);
    }
);

// Error handler
const handleApiError = (error) => {
    if (error.response) {
        throw error.response.data;
    } else if (error.request) {
        throw { message: 'No response from server' };
    } else {
        throw { message: error.message };
    }
};

// Shipping Fee Services
export const shippingFeeService = {
    getAllShippingFees: async () => {
        try {
            const response = await api.get('/api/shipping-fees');
            return response.data.shippingFees;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getShippingFeeByType: async (type) => {
        try {
            const response = await api.get(`/api/shipping-fees/${type}`);
            return response.data.shippingFee;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    createShippingFee: async (feeData) => {
        try {
            const response = await api.post('/api/shipping-fees', feeData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateShippingFee: async (id, feeData) => {
        try {
            const response = await api.put(`/api/shipping-fees/${id}`, feeData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteShippingFee: async (id) => {
        try {
            const response = await api.delete(`/api/shipping-fees/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Shipping Address Services
export const shippingAddressService = {
    getUserShippingAddresses: async () => {
        try {
            const response = await api.get('/api/shipping-addresses');
            return response.data.shippingAddresses;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getShippingAddressById: async (id) => {
        try {
            const response = await api.get(`/api/shipping-addresses/${id}`);
            return response.data.shippingAddress;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    createShippingAddress: async (addressData) => {
        try {
            const response = await api.post('/api/shipping-addresses', addressData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateShippingAddress: async (id, addressData) => {
        try {
            const response = await api.put(`/api/shipping-addresses/${id}`, addressData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteShippingAddress: async (id) => {
        try {
            const response = await api.delete(`/api/shipping-addresses/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Order Services
export const orderService = {
    getAllOrders: async (params = {}) => {
        try {
            const response = await api.get('/api/orders', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getOrderById: async (id) => {
        try {
            const response = await api.get(`/api/orders/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateOrderStatus: async (id, statusData) => {
        try {
            const response = await api.put(`/api/orders/${id}/status`, statusData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getAllOrderStatusHistory: async (params = {}) => {
        try {
            const response = await api.get('/api/order-status-history', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update payment status for an order (admin)
    updateOrderPaymentStatus: async (id, paymentStatusData) => {
        try {
            const response = await api.put(`/api/orders/${id}/payment-status`, paymentStatusData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all Shiprocket orders
    getAllShiprocketOrders: async (params = {}) => {
        try {
            const response = await api.get('/api/orders/shiprocket/all', { params });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Sync orders with Shiprocket
    syncOrdersWithShiprocket: async () => {
        try {
            const response = await api.post('/api/orders/shiprocket/sync', {}, { timeout: 60000 });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Test Shiprocket credentials
    testShiprocketCredentials: async () => {
        try {
            const response = await api.get('/api/orders/shiprocket/test-credentials');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    }
};

// Payment Services
export const paymentService = {
    getAllPayments: async () => {
        try {
            const response = await api.get('/api/payments');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getPaymentById: async (id) => {
        try {
            const response = await api.get(`/api/payments/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updatePaymentStatus: async (id, statusData) => {
        try {
            const response = await api.put(`/api/payments/${id}/status`, statusData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deletePayment: async (id) => {
        try {
            const response = await api.delete(`/api/payments/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Settings Services
export const settingsService = {
    getAllSettings: async () => {
        try {
            const response = await api.get('/api/settings');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getSettingByKey: async (key) => {
        try {
            const response = await api.get(`/api/settings/${key}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    upsertSetting: async (settingData) => {
        try {
            const response = await api.post('/api/settings', settingData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteSetting: async (key) => {
        try {
            const response = await api.delete(`/api/settings/${key}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Auth Services
export const authService = {
    login: async (credentials) => {
        try {
            const response = await api.post('/api/users/admin/login', credentials);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    register: async (userData) => {
        try {
            const response = await api.post('/api/users/register', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    logout: async () => {
        try {
            const response = await api.post('/api/users/logout');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// User Services
export const userService = {
    getCurrentUser: async () => {
        console.log("=== getCurrentUser API Call ===");
        try {
            const token = localStorage.getItem("token");
            console.log("Token being used:", token ? "Present" : "Missing");
            
            const response = await api.get('/api/users/me');
            console.log("API Response:", response.data);
            
            // The API returns user data directly, not nested under a user property
            if (!response.data) {
                console.log("No user data in response");
                return null;
            }
            
            return response.data;
        } catch (error) {
            console.log("API Error:", {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
            
            if (error.response?.status === 401) {
                console.log("Unauthorized - removing token");
                localStorage.removeItem("token");
            }
            throw error.response?.data || error.message;
        }
    },

    getProfile: async () => {
        try {
            const response = await api.get('/api/users/profile');
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateProfile: async (profileData) => {
        try {
            const response = await api.put('/api/users/profile', profileData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateUser: async (userData) => {
        try {
            const response = await api.put('/api/users/me', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    changePassword: async (passwordData) => {
        try {
            const response = await api.put('/api/users/me/password', passwordData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteUser: async () => {
        try {
            const response = await api.delete('/api/users/delete');
            localStorage.removeItem('token');
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getAllUsers: async () => {
        try {
            const response = await api.get('/api/users/all');
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// Category Services
export const categoryService = {
    getAllCategories: async () => {
        try {
            const response = await api.get('/api/categories');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getCategoryById: async (id) => {
        try {
            const response = await api.get(`/api/categories/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    createCategory: async (formData) => {
        try {
            console.log('Creating category with data:', Object.fromEntries(formData.entries()));
            const response = await api.post('/api/categories', formData);
            return response.data;
        } catch (error) {
            console.error('Create category error:', error);
            throw error.response?.data || error.message;
        }
    },

    updateCategory: async (id, formData) => {
        try {
            console.log('Updating category with data:', Object.fromEntries(formData.entries()));
            const response = await api.put(`/api/categories/${id}`, formData);
            return response.data;
        } catch (error) {
            console.error('Update category error:', error);
            throw error.response?.data || error.message;
        }
    },

    deleteCategory: async (id) => {
        try {
            const response = await api.delete(`/api/categories/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export const sliderService = {
    createSlider: async (sliderData) => {
        try {
            const response = await api.post('/api/sliders', sliderData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getAllSliders: async () => {
        try {
            const response = await api.get('/api/sliders/admin/all');
            // Return the response data directly since it already contains the sliders array
            return response.data;
        } catch (error) {
            console.error('Error in getAllSliders:', error);
            throw handleApiError(error);
        }
    },

    getSliderById: async (id) => {
        try {
            const response = await api.get(`/api/sliders/${id}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateSlider: async (id, sliderData) => {
        try {
            const response = await api.put(`/api/sliders/${id}`, sliderData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteSlider: async (id) => {
        try {
            const response = await api.delete(`/api/sliders/${id}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// Product Services
export const productService = {
    createProduct: async (productData) => {
        try {
            console.log('Creating product with data:', Object.fromEntries(productData.entries()));
            const response = await api.post('/api/products', productData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000 // 30 seconds
            });
            return response.data;
        } catch (error) {
            console.error('Create product error:', error);
            throw error.response?.data || error.message;
        }
    },

    getAllProducts: async (page = 1, limit = 10, search = '') => {
        try {
            const params = { page, limit, search };
            if (!search) {
                delete params.search;
            }
            const response = await api.get('/api/products', { params });
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    getProduct: async (id) => {
        try {
            const response = await api.get(`/api/products/${id}`);
            console.log('Product Service Response:', response);
            // Return the data directly since the API response is already in the correct format
            return response.data;
        } catch (error) {
            console.error('Error fetching product:', error);
            throw error.response?.data || error.message;
        }
    },

    updateProduct: async (id, productData) => {
        try {
            console.log('Updating product with data:', Object.fromEntries(productData.entries()));
            const response = await api.put(`/api/products/${id}`, productData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000 // 30 seconds
            });
            return response.data;
        } catch (error) {
            console.error('Update product error:', error);
            throw error.response?.data || error.message;
        }
    },

    deleteProduct: async (id) => {
        try {
            const response = await api.delete(`/api/products/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getProductsByCategory: async (categoryId) => {
        try {
            const response = await api.get(`/api/products/category/${categoryId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    searchProducts: async (query) => {
        try {
            const response = await api.get(`/api/products/search?query=${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Coupon Services
export const couponService = {
    createCoupon: async (couponData) => {
        try {
            const response = await api.post('/api/coupons', couponData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getAllCoupons: async () => {
        try {
            const response = await api.get('/api/coupons');
            console.log('API Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error in getAllCoupons:', error);
            throw handleApiError(error);
        }
    },

    getCouponById: async (id) => {
        try {
            const response = await api.get(`/api/coupons/${id}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateCoupon: async (id, couponData) => {
        try {
            const response = await api.put(`/api/coupons/${id}`, couponData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteCoupon: async (id) => {
        try {
            const response = await api.delete(`/api/coupons/${id}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// Review Services
export const reviewService = {
    getAllReviews: async (status = 'all') => {
        try {
            const response = await api.get(`/api/reviews/admin/all?status=${status}`);
            if (response.data && response.data.reviews) {
                return response.data.reviews;
            }
            throw new Error('Invalid response format from server');
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getReviewById: async (id) => {
        try {
            const response = await api.get(`/api/reviews/admin/${id}`);
            return response.data.review;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateReviewStatus: async (id, statusData) => {
        try {
            const response = await api.put(`/api/reviews/admin/${id}/status`, statusData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteReview: async (id) => {
        try {
            const response = await api.delete(`/api/reviews/admin/${id}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    moderateReview: async (id, moderationData) => {
        try {
            console.log('Moderating review:', { id, moderationData });
            // Ensure the data is in the correct format
            const formattedData = {
                status: moderationData.status,
                is_featured: moderationData.is_featured,
                admin_notes: moderationData.admin_notes
            };
            console.log('Formatted moderation data:', formattedData);
            
            const response = await api.put(`/api/reviews/admin/${id}/moderate`, formattedData);
            console.log('Moderation response:', response.data);
            
            if (!response.data) {
                throw new Error('No response data received');
            }
            
            return response.data;
        } catch (error) {
            console.error('Moderation error:', error.response?.data || error);
            throw handleApiError(error);
        }
    },

    deleteReviewImage: async (imageId) => {
        try {
            const response = await api.delete(`/api/reviews/admin/images/${imageId}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// SEO Services
export const seoService = {
    getAllSEOData: async () => {
        try {
            const response = await api.get('/api/seo/all');
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getSEOData: async (pageName) => {
        try {
            const response = await api.get(`/api/seo?page_name=${pageName}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    createSEOData: async (formData) => {
        try {
            // Create a new FormData instance to ensure proper data handling
            const data = new FormData();
            
            // Add all form fields
            data.append('page_name', formData.get('page_name'));
            data.append('meta_title', formData.get('meta_title'));
            data.append('meta_description', formData.get('meta_description'));
            data.append('meta_keywords', formData.get('meta_keywords'));
            
            // Handle image if it exists
            const image = formData.get('meta_image');
            if (image && image instanceof File) {
                data.append('meta_image', image);
            } else if (image) {
                data.append('meta_image', image);
            }

            console.log('Creating SEO data:', Object.fromEntries(data.entries()));
            
            const response = await api.post('/api/seo/create', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error in createSEOData:', error);
            throw handleApiError(error);
        }
    },

    updateSEOData: async (formData) => {
        try {
            console.log('Sending SEO update data:', Object.fromEntries(formData.entries()));

            const response = await api.put('/api/seo/update', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error in updateSEOData:', error);
            throw handleApiError(error);
        }
    },

    deleteSEOData: async (pageName) => {
        try {
            const response = await api.delete(`/api/seo/${pageName}`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// Attribute Services
export const attributeService = {
    getAllAttributes: async () => {
        try {
            const response = await api.get('/api/attributes');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getAttributeById: async (id) => {
        try {
            const response = await api.get(`/api/attributes/${id}`);
            if (!response.data) {
                throw new Error('Attribute not found');
            }
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Attribute not found');
            }
            throw error.response?.data || error.message;
        }
    },

    createAttribute: async (attributeData) => {
        try {
            const response = await api.post('/api/attributes', attributeData);
            if (!response.data?.attribute) {
                throw new Error('Invalid response from server');
            }
            return response.data.attribute;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateAttribute: async (id, attributeData) => {
        try {
            const response = await api.put(`/api/attributes/${id}`, attributeData);
            if (!response.data?.attribute) {
                throw new Error('Invalid response from server');
            }
            return response.data.attribute;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Attribute not found');
            }
            throw error.response?.data || error.message;
        }
    },

    deleteAttribute: async (id) => {
        try {
            const response = await api.delete(`/api/attributes/${id}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Attribute not found');
            }
            throw error.response?.data || error.message;
        }
    },

    addAttributeValues: async (id, values) => {
        try {
            const response = await api.post(`/api/attributes/${id}/values`, { values });
            if (!response.data?.attribute) {
                throw new Error('Invalid response from server');
            }
            return response.data.attribute;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Attribute not found');
            }
            throw error.response?.data || error.message;
        }
    },

    removeAttributeValues: async (id, valueIds) => {
        try {
            const response = await api.delete(`/api/attributes/${id}/values`, { data: { valueIds } });
            if (!response.data?.attribute) {
                throw new Error('Invalid response from server');
            }
            return response.data.attribute;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Attribute not found');
            }
            throw error.response?.data || error.message;
        }
    }
};

export const policyService = {
    createPolicy: async (data) => {
        try {
            const response = await api.post('/api/policies', data);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
    getAllPolicies: async () => {
        try {
            const response = await api.get('/api/policies');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
    getPolicyById: async (id) => {
        try {
            const response = await api.get(`/api/policies/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
    updatePolicy: async (id, data) => {
        try {
            const response = await api.put(`/api/policies/${id}`, data);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
    deletePolicy: async (id) => {
        try {
            const response = await api.delete(`/api/policies/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export const testShiprocketCredentials = () => api.get('/api/shiprocket/test-credentials');

export default api;