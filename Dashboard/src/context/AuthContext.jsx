import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { userService, authService } from '../services';
import { fbAdvancedMatching } from '../utils/fbAdvancedMatching';
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

// A user's effective role set = primary `role` ∪ additional `roles` (array).
// Everything that gates on role should use this so a multi-role user gets the
// union of their access.
export const getEffectiveRoles = (user) => {
  if (!user) return [];
  const set = new Set();
  if (user.role) set.add(user.role);
  if (Array.isArray(user.roles)) user.roles.forEach((r) => r && set.add(r));
  return [...set];
};

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
    'brands', 'slider', 'blogs',
    // Product managers can use every SEO tab except global brand-wide
    // settings (which lives behind admin in the hub but is the one tab
    // the legacy permission system wants to gate separately).
    'seo', 'seo-health', 'seo-bulk', 'seo-pages', 'faqs',
    'lookbooks',
  ],
  order_manager: [
    'main', 'orders', 'reports', 'payments', 'coupons', 'shippingFees',
    'reviews', 'consumers', 'loyalty',
  ],
  whatsapp_manager: [
    'main', 'whatsapp', 'whatsapp-chat',
  ],
};

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const apiCalledRef = useRef(false);

    // Meta Pixel — feed the signed-in user's data into Advanced Matching.
    useEffect(() => { fbAdvancedMatching(user); }, [user]);

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

    // Helper: can this user access a given view? Union of every effective role's
    // allowed views (admin ⇒ all).
    const canAccessView = useCallback((view) => {
        if (!user) return false;
        const roles = getEffectiveRoles(user);
        if (roles.includes('admin')) return true;
        return roles.some((r) => ROLE_VIEWS[r]?.includes(view));
    }, [user]);

    const roles = getEffectiveRoles(user);

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
        isAdmin: roles.includes('admin'),
        isStaff: roles.some((r) => STAFF_ROLES.includes(r)),
        role: user?.role ?? null,
        roles,
        hasRole: (r) => roles.includes(r),
        hasAnyRole: (list) => roles.some((r) => list.includes(r)),
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
