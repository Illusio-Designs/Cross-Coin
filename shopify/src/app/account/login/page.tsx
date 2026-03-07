'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login:', formData)
  }

  return (
    <div className="container-custom py-20">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm">Remember me</span>
            </label>
            <Link href="/account/forgot-password" className="text-sm link-hover">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="w-full btn-primary">
            Sign In
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-muted">
            Don't have an account?{' '}
            <Link href="/account/register" className="font-medium link-hover">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
