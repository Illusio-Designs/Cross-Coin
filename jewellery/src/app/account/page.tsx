'use client'

import Link from 'next/link'
import { User, Package, MapPin, Settings } from 'lucide-react'

const recentOrders = [
  {
    id: '#2024-001',
    date: 'Feb 15, 2024',
    status: 'Delivered',
    total: 2499.99,
  },
  {
    id: '#2024-002',
    date: 'Feb 10, 2024',
    status: 'In Transit',
    total: 3299.99,
  },
  {
    id: '#2024-003',
    date: 'Jan 28, 2024',
    status: 'Delivered',
    total: 1899.99,
  },
]

export default function AccountPage() {
  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-serif font-bold mb-8">My Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link
          href="/account/orders"
          className="p-6 border border-gold/20 hover:border-gold transition-colors bg-white"
        >
          <Package size={32} className="mb-4 text-gold" />
          <h3 className="font-bold text-lg mb-2">Orders</h3>
          <p className="text-muted text-sm">View order history</p>
        </Link>

        <Link
          href="/account/addresses"
          className="p-6 border border-gold/20 hover:border-gold transition-colors bg-white"
        >
          <MapPin size={32} className="mb-4 text-gold" />
          <h3 className="font-bold text-lg mb-2">Addresses</h3>
          <p className="text-muted text-sm">Manage addresses</p>
        </Link>

        <Link
          href="/account/details"
          className="p-6 border border-gold/20 hover:border-gold transition-colors bg-white"
        >
          <User size={32} className="mb-4 text-gold" />
          <h3 className="font-bold text-lg mb-2">Account Details</h3>
          <p className="text-muted text-sm">Edit your information</p>
        </Link>

        <Link
          href="/account/settings"
          className="p-6 border border-gold/20 hover:border-gold transition-colors bg-white"
        >
          <Settings size={32} className="mb-4 text-gold" />
          <h3 className="font-bold text-lg mb-2">Settings</h3>
          <p className="text-muted text-sm">Preferences & security</p>
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-serif font-bold mb-6">Recent Orders</h2>
        <div className="border border-gold/20 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-bold">Order</th>
                <th className="text-left p-4 font-bold">Date</th>
                <th className="text-left p-4 font-bold">Status</th>
                <th className="text-left p-4 font-bold">Total</th>
                <th className="text-left p-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-gold/10">
                  <td className="p-4 font-medium">{order.id}</td>
                  <td className="p-4 text-muted">{order.date}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium ${
                        order.status === 'Delivered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-gold">${order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4">
                    <Link href={`/account/orders/${order.id}`} className="text-gold hover:text-darkGold font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
