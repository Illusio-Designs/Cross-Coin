'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, User, LogOut, MapPin, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUserOrders } from '@/lib/api/orders'

export default function AccountPage() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [loading, isAuthenticated, router])

  // Fetch recent orders
  useEffect(() => {
    if (!isAuthenticated) return
    setOrdersLoading(true)
    getUserOrders({ limit: 3 })
      .then(data => setOrders(data?.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [isAuthenticated])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-black border-t-transparent" />
    </div>
  )

  if (!user) return null

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-black px-6 py-14 text-center md:px-10 md:py-18">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">My Account</h1>
          <p className="mt-3 text-sm text-white/45">Welcome back, {user.username}</p>
        </div>
      </section>

      <div className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto max-w-3xl">

          {/* Profile card */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-black text-lg font-bold text-white">
                {user.username?.charAt(0)?.toUpperCase() || 'K'}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-brand-black">{user.username}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
                {user.phone && <p className="text-xs text-gray-400">+91 {user.phone}</p>}
              </div>
              <Link href="/account/settings" className="text-xs font-medium text-brand-black underline underline-offset-2">
                Edit
              </Link>
            </div>
          </div>

          {/* Quick links */}
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
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-black">Recent Orders</p>
                <Link href="/account/orders" className="text-xs text-gray-400 underline underline-offset-2">View all</Link>
              </div>
              <div className="flex flex-col gap-3">
                {orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-brand-black">{order.order_number}</p>
                      <p className="text-xs text-gray-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-brand-black">₹{Number(order.final_amount || 0).toFixed(0)}</p>
                      <span className={`text-[10px] font-semibold uppercase ${
                        order.status === 'delivered' ? 'text-green-600' :
                        order.status === 'cancelled' ? 'text-red-500' :
                        'text-gray-500'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logout */}
          <button onClick={handleLogout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-red-200 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50">
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}
