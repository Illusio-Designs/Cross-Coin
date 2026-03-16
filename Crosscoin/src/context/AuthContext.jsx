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

const AuthContext = createContext(null);

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const apiCalledRef = useRef(false);

    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Unified check for current user
                try {
                    const userData = await userService.getCurrentUser();
                    setUser(userData);
                } catch {
                    try {
                        const userData = await getPublicCurrentUser();
                        setUser(userData);
                    } catch {
                        // If both fail, clear token but don't redirect
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
        if (apiCalledRef.current) return; // Prevent multiple calls
        apiCalledRef.current = true;
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
            try {
                await publicLogout();
            } catch {
                await userService.logout();
            }
        } catch (error) {
            } finally {
            localStorage.removeItem('token');
            setUser(null);
            showLogoutSuccessToast();
        }
    }, []);

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
}

function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { AuthProvider, useAuth };
