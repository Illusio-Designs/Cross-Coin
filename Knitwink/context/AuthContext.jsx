'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false)

  const fetchUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) { setUser(null); setLoading(false); return }
    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Brand-Name': 'knitwink' },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        localStorage.removeItem('token')
        setUser(null)
      }
    } catch {
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

  // Listen for token changes (guest checkout, login from another tab)
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem('token')
      if (token && !user) fetchUser()
      if (!token && user) { setUser(null); setLoading(false) }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user, fetchUser])

  const logout = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (token) {
      await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Brand-Name': 'knitwink' },
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
