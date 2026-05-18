import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toastLogoutSuccess } from '../utils/toast';

/* Auth state — backed by the live API (same flow as Knitwink).
   The OTP login/register pages set localStorage 'token'; this context
   resolves it to the current user via /api/users/me. */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND   = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'gripzus';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) { setUser(null); setLoading(false); return; }

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Brand-Name': BRAND,
        },
      });

      if (res.ok) {
        setUser(await res.json());
      } else {
        // Token expired or invalid
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (err) {
      // Network/CORS error — keep the token, it might be temporary
      console.error('[Auth] fetchUser error:', err);
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

  // Keep tabs in sync — react to token changes from login/register/logout.
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem('token');
      if (token && !user) { checkedRef.current = false; fetchUser(); }
      if (!token && user) { setUser(null); setLoading(false); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user, fetchUser]);

  const logout = useCallback(async (silent = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-Brand-Name': BRAND },
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    setUser(null);
    if (!silent) toastLogoutSuccess();
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    fetchUser,
    logout,
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
