import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        
        // Check if token is expired
        if (tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
          setUser(parsedUser);
        } else {
          // Token expired, clear storage
          logout();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Simulate API call - replace with actual API
      // For demo, accept any email/password
      const mockUser = {
        id: Date.now(),
        email: email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString()
      };

      // Generate mock token
      const token = btoa(email + Date.now());
      
      // Set token expiry to 30 days
      const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
      
      // Store in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
      setUser(mockUser);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      // Simulate API call - replace with actual API
      const mockUser = {
        id: Date.now(),
        email: email,
        name: name,
        createdAt: new Date().toISOString()
      };

      // Generate mock token
      const token = btoa(email + Date.now());
      
      // Set token expiry to 30 days
      const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
      
      // Store in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(mockUser));
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
      setUser(mockUser);
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    router.push('/');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
