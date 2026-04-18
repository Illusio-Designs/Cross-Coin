'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, LogOut, MapPin, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in'

export default function AccountPage() {
  const { user, loading, logout } = useAuth()
  const [orders, setOrders] = useState([])

  // Fetch recent orders when user is available
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_URL}/api/orders/my-orders?limit=3`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-Brand-Name': 'knitwink' },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.orders) setOrders(data.orders) })
      .catch(() => {})
  }, [user])

  const handleLogout = async () => {
    await logout()
    window.location.replace('/')
  }

  // Loading state
  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-black border-t-transparent" />
    </div>
  )

  // Not logged in
  if (!user) {
    // Check if token exists but user fetch failed
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('token')
    if (!hasToken) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-400">Please login to view your account</p>
          <Link href="/login" className="rounded-full bg-brand-black px-8 py-3 text-sm font-semibold text-white">
            Go to Login
          </Link>
        </div>
      )
    }
    // Token exists but user not loaded yet — show loading
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-black border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-14 text-center md:px-10">
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">My Account</h1>
          <p className="mt-3 text-sm text-white/45">Welcome back, {user.username}</p>
        </div>
      </section>

      <div className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto max-w-3xl">
          {/* Profile */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-black text-lg font-bold text-white">
                {user.username?.charAt(0)?.toUpperCase() || 'K'}
              </div>
              <div>
                <p className="text-base font-semibold text-brand-black">{user.username}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
                {user.phone && <p className="text-xs text-gray-400">+91 {user.phone}</p>}
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: Package, label: 'My Orders', href: '/account/orders', desc: 'Track and manage orders' },
              { icon: MapPin, label: 'Addresses', href: '/account/addresses', desc: 'Manage shipping addresses' },
            ].map(({ icon: Icon, label, href, desc }) => (
              <Link key={href} href={href} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-5 transition-colors hover:bg-gray-50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Icon size={18} className="text-brand-black" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-black">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300" />
              </Link>
            ))}
          </div>

          {/* Recent orders */}
          {orders.length > 0 && (
            <div className="mt-8">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-black">Recent Orders</p>
              <div className="flex flex-col gap-3">
                {orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-brand-black">{order.order_number}</p>
                      <p className="text-xs text-gray-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase ${
                      order.status === 'delivered' ? 'text-green-600' : order.status === 'cancelled' ? 'text-red-500' : 'text-gray-500'
                    }`}>{order.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logout */}
          <button onClick={handleLogout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-red-200 py-3 text-sm font-semibold text-red-500 hover:bg-red-50">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </>
  )
}
