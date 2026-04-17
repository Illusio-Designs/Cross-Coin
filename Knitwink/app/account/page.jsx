'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, User, LogOut, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function AccountPage() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login')
  }, [loading, isAuthenticated, router])

  if (loading || !user) return (
    <div className="px-6 py-20 text-center text-sm text-gray-400">Loading...</div>
  )

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-16 text-center md:px-10 md:py-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">My Account</h1>
          <p className="mt-3 text-sm text-white/45">Welcome back, {user.username}</p>
        </div>
      </section>

      <section className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Profile card */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-black text-lg font-bold text-white">
                {user.username?.charAt(0)?.toUpperCase() || 'K'}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-black">{user.username}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
                {user.phone && <p className="text-xs text-gray-400">+91 {user.phone}</p>}
              </div>
            </div>
          </div>

          {/* Quick links */}
          {[
            { icon: Package, label: 'My Orders', href: '/account/orders', desc: 'Track and manage your orders' },
            { icon: MapPin, label: 'Addresses', href: '/account/addresses', desc: 'Manage shipping addresses' },
            { icon: User, label: 'Edit Profile', href: '/account/settings', desc: 'Update your details' },
          ].map(({ icon: Icon, label, href, desc }) => (
            <Link key={href} href={href} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-6 transition-colors hover:bg-gray-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Icon size={18} className="text-brand-black" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-black">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </Link>
          ))}

          {/* Logout */}
          <button onClick={handleLogout} className="flex items-center gap-4 rounded-2xl border border-red-100 p-6 text-left transition-colors hover:bg-red-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
              <LogOut size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-500">Logout</p>
              <p className="text-xs text-gray-400">Sign out of your account</p>
            </div>
          </button>
        </div>
      </section>
    </>
  )
}
