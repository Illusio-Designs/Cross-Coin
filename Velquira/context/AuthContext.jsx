'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as apiLogout } from '@/lib/api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await getCurrentUser();
      setUser(data || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      fetchUser();
    }
  }, [fetchUser]);

  // React to login/logout happening elsewhere (setToken dispatches 'storage').
  useEffect(() => {
    const onStorage = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && !user) {
        checkedRef.current = false;
        fetchUser();
      }
      if (!token && user) {
        setUser(null);
        setLoading(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user, fetchUser]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
