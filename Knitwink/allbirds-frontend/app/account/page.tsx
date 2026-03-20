import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe } from '@/lib/api/auth'
import { getOrders } from '@/lib/api/orders'
import { ROUTES } from '@/lib/constants'
import { Package, Settings, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'My Account' }

export default async function AccountPage() {
  const [user, orders] = await Promise.allSettled([getMe(), getOrders()])

  const userData = user.status === 'fulfilled' ? user.value : null
  const ordersData = orders.status === 'fulfilled' ? orders.value : []
  const lastOrder = ordersData[0]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-normal text-brand-black">
          Hello, {userData?.firstName ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Member since {userData ? new Date(userData.createdAt).getFullYear() : '—'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Total Orders</p>
          <p className="mt-2 font-display text-3xl font-normal text-brand-black">{ordersData.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Last Order</p>
          <p className="mt-2 text-sm font-medium capitalize text-brand-black">
            {lastOrder?.status ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Member Since</p>
          <p className="mt-2 text-sm font-medium text-brand-black">
            {userData ? new Date(userData.createdAt).getFullYear() : '—'}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href={ROUTES.orders} className="group flex items-center justify-between rounded-2xl border border-gray-200 p-6 transition-colors duration-150 hover:border-brand-black">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-sage" />
            <span className="text-sm font-medium text-brand-black">View Orders</span>
          </div>
          <ArrowRight size={16} className="text-gray-400 transition-transform duration-150 group-hover:translate-x-1" />
        </Link>
        <Link href={ROUTES.settings} className="group flex items-center justify-between rounded-2xl border border-gray-200 p-6 transition-colors duration-150 hover:border-brand-black">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-sage" />
            <span className="text-sm font-medium text-brand-black">Account Settings</span>
          </div>
          <ArrowRight size={16} className="text-gray-400 transition-transform duration-150 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}
