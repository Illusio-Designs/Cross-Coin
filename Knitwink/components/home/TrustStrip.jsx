'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Lock, Truck, Star, MapPin, RotateCcw, Banknote } from 'lucide-react'
import { getAllReviews } from '@/lib/api/reviews'

const ITEMS = [
  { icon: ShieldCheck, title: 'Premium Quality',    sub: 'Finest materials, built to last',        badge: 'Since 2020',    dark: false },
  { icon: Lock,        title: 'Secure Shopping',    sub: '100% safe & encrypted checkout',         badge: 'SSL Protected', dark: true  },
  { icon: Truck,       title: 'Fast Delivery',      sub: 'Pan India delivered to your doorstep',   badge: 'Pan India',     dark: false },
  { icon: Star,        title: 'Authentic Products', sub: '100% genuine Knitwink, guaranteed',      badge: 'Verified',      dark: true  },
]

// Only FACTUAL signals: Made in India (Knitwink is based in Morbi, Gujarat,
// India), secure payments, free shipping (now on all orders), the 7-day returns
// policy (see /account/returns and the PDP), and Cash on Delivery (offered at
// checkout).
const SIGNALS = [
  { icon: MapPin,     label: 'Made in India' },
  { icon: Lock,       label: '100% secure payments' },
  { icon: Truck,      label: 'Free shipping on all orders' },
  { icon: RotateCcw,  label: 'Easy 7-day returns' },
  { icon: Banknote,   label: 'COD available' },
]

// Derive the store-wide rating ({ avg, total }) from a raw /api/reviews/all
// payload, or null when there's nothing real to show — never a fabricated number.
function deriveRating(data) {
  const list = data?.reviews ?? data ?? []
  if (!Array.isArray(list)) return null
  const rated = list.filter((r) => Number(r.rating) > 0)
  const sampleAvg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0
  const avg = Number(data?.stats?.average) || sampleAvg
  const total = Math.max(Number(data?.pagination?.total ?? data?.stats?.total) || 0, list.length)
  return avg > 0 && total > 0 ? { avg, total } : null
}

export function TrustStrip({ reviews: reviewsData = null }) {
  // Reuse the real store-wide review total (same /api/reviews/all source as the
  // home ReviewBand). When the server already fetched the reviews, derive the
  // rating from them and skip the duplicate client fetch; otherwise fall back to
  // fetching. Render the rating line only when real reviews exist.
  const serverRating = deriveRating(reviewsData)
  const [rating, setRating] = useState(serverRating)

  useEffect(() => {
    if (deriveRating(reviewsData)) return // server already supplied the reviews — don't refetch
    let active = true
    getAllReviews()
      .then((data) => {
        const r = deriveRating(data)
        if (active && r) setRating(r)
      })
      .catch(() => {})
    return () => { active = false }
  }, [reviewsData])

  return (
    <div className="px-3 py-6">
      <p className="mb-4 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
        Why Knitwink
      </p>

      {/* Prominent factual trust-signal strip + real rating */}
      <div className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-center gap-2 md:gap-3">
        {rating && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-black px-3 py-1.5 text-[11px] font-semibold text-white md:text-xs">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            Rated {rating.avg.toFixed(1)}★ by {rating.total.toLocaleString('en-IN')}+ happy shoppers
          </span>
        )}
        {SIGNALS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-black/15 bg-[#f0ece6] px-3 py-1.5 text-[11px] font-semibold text-brand-black md:text-xs"
          >
            <Icon size={14} className="text-brand-black" />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {ITEMS.map(({ icon: Icon, title, sub, badge, dark }) => (
          <div
            key={title}
            className={`aspect-square relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 text-center md:aspect-auto md:min-h-[300px] md:gap-0 md:px-6 md:py-8 ${
              dark ? 'bg-brand-black text-white' : 'bg-[#f0ece6] text-brand-black'
            }`}
          >
            {/* subtle bg circle */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.07] md:-right-6 md:-top-6 md:h-28 md:w-28 md:opacity-[0.08] ${dark ? 'bg-white' : 'bg-brand-black'}`} />
            <div className={`hidden md:block absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-[0.06] ${dark ? 'bg-white' : 'bg-brand-black'}`} />

            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:mb-6 md:h-14 md:w-14 ${dark ? 'bg-white/10' : 'bg-brand-black/8'}`}>
              <Icon size={18} className={`md:hidden ${dark ? 'text-white' : 'text-brand-black'}`} />
              <Icon size={24} className={`hidden md:block ${dark ? 'text-white' : 'text-brand-black'}`} />
            </div>

            <div>
              <p className="text-[11px] font-bold leading-tight md:text-base md:font-semibold">{title}</p>
              <p className={`mt-1 text-[10px] leading-snug md:mt-2 md:text-xs md:leading-relaxed ${dark ? 'text-white/50 md:text-white/55' : 'text-gray-500 md:text-gray-600'}`}>{sub}</p>
            </div>

            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest md:mt-6 md:px-3 md:py-1 md:text-[10px] ${dark ? 'border-white/20 text-white/40 md:text-white/40' : 'border-brand-black/20 text-brand-black/40 md:text-brand-black/50'}`}>
              {badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
