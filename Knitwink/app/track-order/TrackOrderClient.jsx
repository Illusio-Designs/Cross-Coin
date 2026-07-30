'use client'

import { useState } from 'react'
import { Search, Package, Truck, CheckCircle, MapPin, Phone, Clock } from 'lucide-react'
import { trackOrder } from '@/lib/api/orders'
// SeoWrapper removed — metadata is now set server-side in page.jsx.

const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered']

// Order-item images are ImageKit assets. Absolute URLs pass through; relative
// paths get the ImageKit endpoint (NOT the API host, which 404s on these paths).
const IK_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL
  ?? process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  ?? 'https://ik.imagekit.io/wp2oatzmf'
function resolveImg(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let url = raw
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    url = url.substring(url.lastIndexOf('https://'))
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IK_ENDPOINT}${url.startsWith('/') ? '' : '/'}${url}`
}
function pickItemImage(it) {
  const p = it.product || it.Product || {}
  const v = it.variation || it.ProductVariation || {}
  return resolveImg(p.image || p.ProductImages?.[0]?.image_url || p.images?.[0]?.image_url
    || v.VariationImages?.[0]?.image_url || it.image || it.image_url || '')
}

const fmtDateTime = (v) => {
  if (!v) return ''
  try { return new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) }
  catch { return '' }
}
function getTimeline(data) {
  const fship = data?.fship_data?.tracking_history
  if (Array.isArray(fship) && fship.length) {
    return [...fship].reverse().map(h => ({ status: h.status, note: h.location || h.description || '', time: h.timestamp || h.created_at || '' }))
  }
  const sh = data?.status_history
  const finalStatus = String(data?.order?.status || '').toLowerCase()
  if (Array.isArray(sh) && sh.length) {
    const filtered = finalStatus !== 'cancelled' ? sh.filter(h => h.status !== 'cancelled') : sh
    return [...filtered].reverse().map(h => ({ status: h.status, note: h.notes || '', time: h.created_at || h.createdAt || '' })).filter(i => i.status)
  }
  return []
}

// Client subtree for /track-order — see app/track-order/page.jsx for the server shell.
export default function TrackOrderClient() {
  const [orderNumber, setOrderNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [addr, setAddr] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e) => {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setLoading(true)
    setError('')
    setOrder(null); setItems([]); setAddr(null); setTracking(null); setTimeline([])
    try {
      const res = await trackOrder(orderNumber.trim())
      // Backend wraps the payload: { success, data: { order, items, shipping_address, ... } }
      const payload = res && res.data ? res.data : res
      const ord = payload.order || payload
      setOrder(ord)
      setItems(payload.items || ord.OrderItems || ord.items || [])
      setAddr(payload.shipping_address || ord.ShippingAddress || null)
      setTracking(payload.tracking || null)
      setTimeline(getTimeline(payload))
    } catch {
      setError('Order not found. Please check the order number.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = order ? STATUS_STEPS.indexOf(order.status?.toLowerCase()) : -1
  const awb = order?.tracking_number || tracking?.tracking_number
  const trackUrl = tracking?.tracking_url || order?.tracking_url

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
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
                  <p className="mt-1 text-[11px] text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}{order.final_amount != null ? ` · ₹${Number(order.final_amount).toFixed(0)}` : ''}</p>
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
                    </div>
                  ))}
                </div>
              )}

              {/* Order items with thumbnails */}
              {items.length > 0 && (
                <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4">
                  {items.map((it, i) => {
                    const name = it.name || it.product?.name || it.Product?.name || it.product_name || 'Item'
                    const img = pickItemImage(it)
                    const qty = it.quantity || it.qty || 1
                    const price = Number(it.total_price || (Number(it.price || it.unit_price || 0) * qty))
                    const sku = it.variation?.sku || it.ProductVariation?.sku
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                          {img
                            ? <img src={img} alt={name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            : <Package size={18} className="text-gray-300" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-brand-black">{name}</p>
                          <p className="text-[11px] text-gray-400">{sku ? `SKU ${String(sku).replace(/^\s*SKU\s*[:·-]\s*/i, '')} · ` : ''}{it.size ? `Size ${it.size} · ` : ''}Qty {qty}</p>
                        </div>
                        {price > 0 && <span className="text-xs font-semibold text-brand-black">₹{price.toFixed(0)}</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tracking timeline */}
              {timeline.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <ol className="ml-1 space-y-3 border-l border-gray-200">
                    {timeline.map((ev, i) => (
                      <li key={i} className="relative pl-5">
                        <span className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${i === 0 ? 'border-brand-black bg-brand-black' : 'border-gray-300 bg-white'}`} />
                        <p className="text-xs font-medium capitalize text-brand-black">{String(ev.status).replace(/_/g, ' ')}</p>
                        {ev.note && <p className="text-[11px] text-gray-400">{ev.note}</p>}
                        {ev.time && <p className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-400"><Clock size={10} /> {fmtDateTime(ev.time)}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Order details */}
              <div className="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-4">
                {order.final_amount != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total</span>
                    <span className="font-semibold text-brand-black">₹{Number(order.final_amount).toFixed(2)}</span>
                  </div>
                )}
                {order.payment_type && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Payment</span>
                    <span className="text-gray-600">{order.payment_type === 'cod' ? 'Cash on Delivery' : order.payment_type.toUpperCase()}</span>
                  </div>
                )}
                {awb && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">AWB</span>
                    <span className="font-mono text-gray-600">{awb}</span>
                  </div>
                )}
              </div>

              {/* Delivery address */}
              {addr && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><MapPin size={12} /> Delivery to</p>
                  {(addr.full_name || addr.fullName) && <p className="text-xs font-semibold text-brand-black">{addr.full_name || addr.fullName}</p>}
                  <p className="text-[11px] leading-relaxed text-gray-500">{addr.address}, {addr.city}, {addr.state} {addr.pincode || addr.postal_code}</p>
                  {(addr.phone || addr.phone_number) && <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500"><Phone size={11} /> {addr.phone || addr.phone_number}</p>}
                </div>
              )}

              {/* Live courier tracking */}
              {trackUrl && (
                <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-black px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80">
                  <Truck size={15} /> Live courier tracking
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
