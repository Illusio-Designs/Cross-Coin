import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService, authService } from '../services';
import { loginUser, registerUser, getCurrentUser as getPublicCurrentUser, logout as publicLogout } from '../services/publicindex';
import { useContext as useReactContext } from 'react';
import { WishlistContext } from './WishlistContext';
import { 
  showLoginSuccessToast, 
  showLoginErrorToast, 
  showRegisterSuccessToast, 
  showRegisterErrorToast, 
  showLogoutSuccessToast 
} from '../utils/toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { setIsAuthenticated } = useContext(WishlistContext) || {};

    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Unified check for current user
                try {
                    const userData = await userService.getCurrentUser();
                    setUser(userData);
                } catch {
                    const userData = await getPublicCurrentUser();
                    setUser(userData);
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (credentials) => {
        try {
            const response = await loginUser(credentials);
            if (response.user.role !== 'consumer' && response.user.role !== 'customer') {
                throw new Error('Only consumer accounts can log in here.');
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            if (setIsAuthenticated) {
                setIsAuthenticated(true);
            }
            showLoginSuccessToast();
            return response;
        } catch (error) {
            showLoginErrorToast(error.message);
            throw error;
        }
    }, [setIsAuthenticated]);

    const adminLogin = useCallback(async (credentials) => {
        try {
            const response = await authService.login(credentials);
            localStorage.setItem('token', response.token);
            setUser(response.user);
            if (setIsAuthenticated) {
                setIsAuthenticated(true);
            }
            showLoginSuccessToast();
            return response;
        } catch (error) {
            showLoginErrorToast(error.message);
            throw error;
        }
    }, [setIsAuthenticated]);

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
            // Try public logout first
            try {
                await publicLogout();
            } catch {
                await userService.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            if (setIsAuthenticated) {
                setIsAuthenticated(false);
            }
            showLogoutSuccessToast();
        }
    }, [setIsAuthenticated]);

    const value = {
        user,
        loading,
        login,
        adminLogin,
        logout,
        register,
        checkAuth,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 