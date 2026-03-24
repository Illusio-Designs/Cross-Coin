import Cookies from 'js-cookie'
import type { ApiError } from '@/types'

const getBaseUrl = () =>
  typeof window === 'undefined'
    ? process.env.API_URL ?? 'http://localhost:4000'
    : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : undefined

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  }

  const res = await fetch(`${getBaseUrl()}${path}`, { ...init, headers })

  if (!res.ok) {
    const error: ApiError = {
      message: 'An error occurred',
      status: res.status,
    }
    try {
      const body = await res.json()
      error.message = body.message ?? error.message
      error.code = body.code
    } catch {
      // ignore parse errors
    }
    throw error
  }

  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'DELETE' }),
}
