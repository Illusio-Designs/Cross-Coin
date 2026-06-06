'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { toastLogoutSuccess } from '@/lib/toast'
import { getAuthToken, clearAuthToken } from '@/lib/authToken'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false)

  const fetchUser = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) { setUser(null); setLoading(false); return }

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Brand-Name': BRAND,
        },
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        clearAuthToken()
        setUser(null)
      }
    } catch (err) {
      console.error('[Auth] fetchUser error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true
      fetchUser()
    }
  }, [fetchUser])

  useEffect(() => {
    const onStorage = () => {
      const token = getAuthToken()
      if (token && !user) { checkedRef.current = false; fetchUser() }
      if (!token && user) { setUser(null); setLoading(false) }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user, fetchUser])

  const logout = useCallback(async () => {
    const token = getAuthToken()
    if (token) {
      fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Brand-Name': BRAND },
      }).catch(() => {})
    }
    clearAuthToken()
    setUser(null)
    toastLogoutSuccess()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
