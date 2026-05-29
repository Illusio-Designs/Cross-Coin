import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userService, authService } from '../services';
import { loginUser, registerUser, getCurrentUser as getPublicCurrentUser, logout as publicLogout } from '../services/publicApi';
import { 
  showLoginSuccessToast, 
  showLoginErrorToast, 
  showRegisterSuccessToast, 
  showRegisterErrorToast, 
  showLogoutSuccessToast 
} from '../utils/toast';

const AuthContext = globalThis.__AUTH_CONTEXT__ || (globalThis.__AUTH_CONTEXT__ = createContext(null));

// All non-consumer staff roles
export const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

// Role display labels
export const ROLE_LABELS = {
  admin:             'Admin',
  product_manager:   'Product Manager',
  order_manager:     'Order Manager',
  whatsapp_manager:  'WhatsApp Manager',
  consumer:          'Consumer',
};

// Which sidebar views each role can access
export const ROLE_VIEWS = {
  admin: null, // null = all views
  product_manager: [
    'main', 'products', 'categories', 'attributes', 'media-gallery',
    'brands', 'slider', 'blogs', 'seo', 'faqs', 'lookbooks', 'reels-admin', 'instagram-admin',
  ],
  order_manager: [
    'main', 'orders', 'payments', 'coupons', 'shippingFees',
    'reviews', 'consumers',
  ],
  whatsapp_manager: [
    'main', 'whatsapp', 'whatsapp-chat',
  ],
};

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const apiCalledRef = useRef(false);

    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await userService.getCurrentUser();
                    setUser(userData);
                } catch {
                    try {
                        const userData = await getPublicCurrentUser();
                        setUser(userData);
                    } catch {
                        localStorage.removeItem('token');
                        setUser(null);
                    }
                }
            }
        } catch (error) {
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (apiCalledRef.current) return;
        apiCalledRef.current = true;
        checkAuth();
    }, [checkAuth]);

    // Re-check auth when token is set externally (e.g. after guest checkout auto-creates user)
    useEffect(() => {
        const handleStorage = () => {
            const token = localStorage.getItem('token');
            if (token && !user) checkAuth();
            if (!token && user) setUser(null);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [user, checkAuth]);

    const login = useCallback(async (credentials) => {
        try {
            const response = await loginUser(credentials);
            if (response.user.role !== 'consumer' && response.user.role !== 'customer') {
                throw new Error('Only consumer accounts can log in here.');
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            showLoginSuccessToast();
            return response;
        } catch (error) {
            showLoginErrorToast(error.message);
            throw error;
        }
    }, []);

    const adminLogin = useCallback(async (credentials) => {
        try {
            const response = await authService.login(credentials);
            // Allow any staff role
            if (!STAFF_ROLES.includes(response.user?.role)) {
                throw new Error('Access denied. Staff accounts only.');
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            showLoginSuccessToast();
            return response;
        } catch (error) {
            showLoginErrorToast(error.message);
            throw error;
        }
    }, []);

    const register = useCallback(async (userData) => {
        try {
            const response = await registerUser(userData);
            showRegisterSuccessToast();
            return response;
        } catch (error) {
            showRegisterErrorToast(error.message);
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            try { await publicLogout(); } catch { await userService.logout(); }
        } catch (error) {
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            showLogoutSuccessToast();
        }
    }, []);

    // Helper: can this user access a given view?
    const canAccessView = useCallback((view) => {
        if (!user) return false;
        const allowed = ROLE_VIEWS[user.role];
        if (allowed === null) return true; // admin
        return allowed?.includes(view) ?? false;
    }, [user]);

    const value = {
        user,
        loading,
        login,
        adminLogin,
        logout,
        register,
        checkAuth,
        canAccessView,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: STAFF_ROLES.includes(user?.role),
        role: user?.role ?? null,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { AuthProvider, useAuth };
