'use client'

import { Star } from 'lucide-react'

const REVIEWS = [
  { id: '1', authorName: 'Priya S.',  location: 'Mumbai',    rating: 5, title: 'Best socks I own',     body: 'Incredibly comfortable from day one. My toes feel so much better after long walks.' },
  { id: '2', authorName: 'Arjun M.',  location: 'Bangalore', rating: 5, title: 'Worth every rupee',    body: 'Lightweight, breathable, and they look great. After wearing them daily for 3 months I completely understand the hype.' },
  { id: '3', authorName: 'Kavya R.',  location: 'Delhi',     rating: 4, title: 'Great quality',        body: 'Love the feel and the material. My feet feel relaxed after wearing these all day. Highly recommend.' },
  { id: '4', authorName: 'Rohit T.',  location: 'Chennai',   rating: 5, title: 'Game changer',         body: 'The toe separator design is subtle but effective. I noticed a real difference within a week.' },
  { id: '5', authorName: 'Sneha P.',  location: 'Pune',      rating: 5, title: 'Gifted to my mom too', body: 'Bought for myself first, loved them so much I ordered 3 more pairs for family. Absolutely worth it.' },
  { id: '6', authorName: 'Vikram D.', location: 'Hyderabad', rating: 4, title: 'Solid product',        body: 'Good build quality, comfortable fit. The free size works perfectly for me. Delivery was fast too.' },
  { id: '7', authorName: 'Meera K.',  location: 'Kolkata',   rating: 5, title: 'Obsessed',             body: 'I have tried many sock brands but Knitwink is on another level. The softness is unreal.' },
  { id: '8', authorName: 'Aditya N.', location: 'Ahmedabad', rating: 5, title: 'Reordered twice',      body: 'Already on my third order. The quality is consistent and they hold their shape after washing.' },
]

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <Stars rating={review.rating} />
      <p className="mt-2 text-sm font-semibold text-brand-black">{review.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500 line-clamp-3">{review.body}</p>
      <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {review.authorName.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-medium text-brand-black">{review.authorName}</p>
          <p className="text-[10px] text-gray-400">{review.location}</p>
        </div>
      </div>
    </div>
  )
}

// Both columns use all reviews — col2 starts from middle for stagger effect
const col1 = [...REVIEWS, ...REVIEWS, ...REVIEWS]
const col2 = [...REVIEWS.slice(4), ...REVIEWS, ...REVIEWS, ...REVIEWS.slice(0, 4)]

export function ReviewsSection() {
  return (
    <section className="bg-white">
      <div className="grid grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_1.4fr] lg:px-8 lg:py-12">

        {/* LEFT — title + stats */}
        <div className="flex flex-col justify-center gap-6">

          {/* eyebrow */}
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">What They Say</p>

          {/* big rating block */}
          <div className="flex items-center gap-4 rounded-2xl bg-gray-50 px-6 py-5">
            <span className="text-6xl font-bold leading-none text-brand-black">4.8</span>
            <div className="flex flex-col gap-1.5">
              <Stars rating={5} />
              <p className="text-xs text-gray-400">Based on 50,000+ reviews</p>
              <p className="text-xs font-semibold text-brand-black">98% would recommend</p>
            </div>
          </div>

          {/* quote */}
          <p className="text-2xl font-semibold leading-snug text-brand-black lg:text-3xl">
            "Thousands of happy<br />feet can't be wrong."
          </p>

          {/* mini stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: '50K+', label: 'Customers' },
              { value: '98%',  label: 'Recommend' },
              { value: '4.8',  label: 'Avg Rating' },
              { value: '5★',   label: 'Top Reviews' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-300 px-4 py-3">
                <p className="text-lg font-bold text-brand-black">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT — two infinite scrolling columns (desktop) */}
        <div className="relative hidden overflow-hidden lg:grid lg:grid-cols-2 lg:gap-3" style={{ height: 440 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />

          {/* Column 1 — scrolls UP infinitely */}
          <div className="flex flex-col gap-3 animate-scroll-up">
            {col1.map((r, i) => <ReviewCard key={`c1-${i}`} review={r} />)}
          </div>

          {/* Column 2 — scrolls DOWN infinitely, starts mid-list for stagger */}
          <div className="flex flex-col gap-3 animate-scroll-down">
            {col2.map((r, i) => <ReviewCard key={`c2-${i}`} review={r} />)}
          </div>
        </div>

        {/* Mobile — horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 lg:hidden">
          {REVIEWS.map((r) => (
            <div key={r.id} className="w-72 shrink-0">
              <ReviewCard review={r} />
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
