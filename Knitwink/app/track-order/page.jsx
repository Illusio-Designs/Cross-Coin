'use client'

import { useState } from 'react'
import { Search, Package, Truck, CheckCircle } from 'lucide-react'
import { trackOrder } from '@/lib/api/orders'

const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered']

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e) => {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const data = await trackOrder(orderNumber.trim())
      setOrder(data.order || data)
    } catch {
      setError('Order not found. Please check the order number.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = order ? STATUS_STEPS.indexOf(order.status?.toLowerCase()) : -1

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-6 py-16 text-center md:px-10 md:py-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Track Your Order</h1>
          <p className="mt-3 text-sm text-white/45">Enter your order number to check delivery status</p>
        </div>
      </section>

      <section className="bg-white px-4 py-12 md:px-6">
        <div className="mx-auto max-w-lg">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="Enter order number (e.g. ORD-12345)"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none"
            />
            <button type="submit" disabled={loading}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-black px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <Search size={15} />
              {loading ? 'Tracking…' : 'Track'}
            </button>
          </form>

          {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}

          {order && (
            <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Order Number</p>
                  <p className="text-sm font-bold text-brand-black">{order.order_number}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                  order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                  order.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {order.status}
                </span>
              </div>

              {/* Progress steps */}
              {order.status !== 'cancelled' && (
                <div className="mt-6 flex items-center justify-between">
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        i <= currentStep ? 'bg-brand-black text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {i <= currentStep ? <CheckCircle size={14} /> : i + 1}
                      </div>
                      <span className="text-[10px] capitalize text-gray-500">{step}</span>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`absolute h-0.5 w-full ${i < currentStep ? 'bg-brand-black' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Order details */}
              <div className="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-4">
                {order.final_amount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total</span>
                    <span className="font-semibold text-brand-black">₹{Number(order.final_amount).toFixed(2)}</span>
                  </div>
                )}
                {order.payment_type && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Payment</span>
                    <span className="text-gray-600 uppercase">{order.payment_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
