'use client'

import Link from 'next/link'
import { User, Package, MapPin, Settings } from 'lucide-react'

const recentOrders = [
  {
    id: '#1234',
    date: 'Jan 15, 2024',
    status: 'Delivered',
    total: 54.99,
  },
  {
    id: '#1233',
    date: 'Jan 10, 2024',
    status: 'In Transit',
    total: 29.99,
  },
  {
    id: '#1232',
    date: 'Dec 28, 2023',
    status: 'Delivered',
    total: 74.99,
  },
]

export default function AccountPage() {
  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-bold mb-8">My Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link
          href="/account/orders"
          className="p-6 border border-border hover:border-primary transition-colors"
        >
          <Package size={32} className="mb-4" />
          <h3 className="font-bold text-lg mb-2">Orders</h3>
          <p className="text-muted text-sm">View order history</p>
        </Link>

        <Link
          href="/account/addresses"
          className="p-6 border border-border hover:border-primary transition-colors"
        >
          <MapPin size={32} className="mb-4" />
          <h3 className="font-bold text-lg mb-2">Addresses</h3>
          <p className="text-muted text-sm">Manage addresses</p>
        </Link>

        <Link
          href="/account/details"
          className="p-6 border border-border hover:border-primary transition-colors"
        >
          <User size={32} className="mb-4" />
          <h3 className="font-bold text-lg mb-2">Account Details</h3>
          <p className="text-muted text-sm">Edit your information</p>
        </Link>

        <Link
          href="/account/settings"
          className="p-6 border border-border hover:border-primary transition-colors"
        >
          <Settings size={32} className="mb-4" />
          <h3 className="font-bold text-lg mb-2">Settings</h3>
          <p className="text-muted text-sm">Preferences & security</p>
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Recent Orders</h2>
        <div className="border border-border">
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
                <tr key={order.id} className="border-t">
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
                  <td className="p-4 font-medium">${order.total.toFixed(2)}</td>
                  <td className="p-4">
                    <Link href={`/account/orders/${order.id}`} className="link-hover font-medium">
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
