'use client'

import { useState } from 'react'
import { Search, CheckCircle } from 'lucide-react'
import { trackOrder } from '@/lib/api/orders'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'

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
    <SeoWrapper pageName="track-order">
      <main className="min-h-screen bg-ivory">
        {/* Refined page header */}
        <section className="px-4 pt-36 pb-10 text-center sm:px-6 md:px-10">
          <Reveal>
            <span className="vq-diamond mx-auto block" aria-hidden />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Bespoke Journey</p>
          </Reveal>
          <Reveal delay={0.16}>
            <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
              Track Your Order
            </h1>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
              Enter your order reference to follow each piece on its way to you.
            </p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
          </Reveal>
        </section>

        {/* Search */}
        <section className="px-4 pb-16 md:px-6">
          <Reveal delay={0.1}>
            <form
              onSubmit={handleTrack}
              className="mx-auto flex max-w-xl flex-col gap-2"
            >
              <label className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Order Reference</label>
              <div className="flex items-center gap-4 border-b border-gold/30 focus-within:border-gold">
                <input
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="ORD-12345"
                  className="flex-1 border-0 bg-transparent px-0 py-3 text-sm text-brand-black placeholder:text-brand-black/30 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-2 py-3 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:text-gold-deep disabled:opacity-50"
                >
                  <Search size={13} strokeWidth={1.6} />
                  {loading ? 'Tracking…' : 'Track'}
                </button>
              </div>
              {error && <p className="mt-4 text-center text-xs italic text-red-500">{error}</p>}
            </form>
          </Reveal>

          {/* Result */}
          {order && (
            <Reveal delay={0.12}>
              <div className="mx-auto mt-14 max-w-2xl">
                <div className="flex items-baseline justify-between border-b border-gold/20 pb-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Order</p>
                    <p className="mt-1 font-display text-lg text-brand-black">{order.order_number}</p>
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-[0.28em] ${
                    order.status === 'delivered' ? 'text-gold' :
                    order.status === 'cancelled' ? 'text-red-500' :
                    'text-brand-black/65'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {/* Horizontal stepper */}
                {order.status !== 'cancelled' && (
                  <div className="mt-10">
                    <div className="relative flex items-start justify-between">
                      {STATUS_STEPS.map((step, i) => {
                        const reached = i <= currentStep
                        return (
                          <div key={step} className="relative z-10 flex flex-1 flex-col items-center gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full border bg-ivory transition-colors ${
                                reached
                                  ? 'border-gold bg-gold text-white'
                                  : 'border-gold/30 text-brand-black/40'
                              }`}
                            >
                              {reached ? <CheckCircle size={14} strokeWidth={1.6} /> : <span className="font-display text-xs">{i + 1}</span>}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-[0.22em] capitalize ${
                              reached ? 'text-brand-black' : 'text-brand-black/40'
                            }`}>
                              {step}
                            </span>
                          </div>
                        )
                      })}
                      {/* Connecting rule */}
                      <div className="absolute left-0 right-0 top-[18px] -z-0 mx-6 flex justify-between">
                        {STATUS_STEPS.slice(0, -1).map((_, i) => (
                          <div key={i} className="h-px flex-1">
                            <div
                              className={`h-full transition-colors ${
                                i < currentStep ? 'bg-gold' : 'bg-gold/20'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Particulars */}
                <div className="mt-12 flex flex-col gap-3 border-t border-gold/20 pt-6 text-sm">
                  {order.final_amount && (
                    <div className="flex justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-black/55">Total</span>
                      <span className="font-display text-brand-black">₹{Number(order.final_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {order.payment_type && (
                    <div className="flex justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-black/55">Payment</span>
                      <span className="uppercase tracking-wider text-brand-black/75">{order.payment_type}</span>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          )}
        </section>
      </main>
    </SeoWrapper>
  )
}