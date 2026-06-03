'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false)

  const fetchUser = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) { setUser(null); setLoading(false); return }

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Brand-Name': 'velquira',
        },
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        // Token expired or invalid
        localStorage.removeItem('token')
        setUser(null)
      }
    } catch (err) {
      // Network/CORS error — don't remove token, might be temporary
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
      const token = localStorage.getItem('token')
      if (token && !user) { checkedRef.current = false; fetchUser() }
      if (!token && user) { setUser(null); setLoading(false) }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user, fetchUser])

  const logout = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Brand-Name': 'velquira' },
      }).catch(() => {})
    }
    localStorage.removeItem('token')
    setUser(null)
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
