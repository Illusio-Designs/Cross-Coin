'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, logout as apiLogout } from '@/lib/api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        const userData = await getMe()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch {
      if (typeof window !== 'undefined') localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  // Re-check when token changes (e.g. guest checkout auto-login)
  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem('token')
      if (token && !user) checkAuth()
      if (!token && user) setUser(null)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [user, checkAuth])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
