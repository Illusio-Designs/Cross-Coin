'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { login as apiLogin, logout as apiLogout, register as apiRegister } from '@/lib/api/auth'
import type { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isAuthenticated = !!Cookies.get('auth_token')

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { user, token } = await apiLogin(email, password)
      Cookies.set('auth_token', token, { expires: 7 })
      setUser(user)
      router.push('/account')
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => {
    setLoading(true)
    try {
      const { user, token } = await apiRegister(data)
      Cookies.set('auth_token', token, { expires: 7 })
      setUser(user)
      router.push('/account')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await apiLogout()
    Cookies.remove('auth_token')
    setUser(null)
    router.push('/')
  }

  return { user, loading, isAuthenticated, login, register, logout }
}
