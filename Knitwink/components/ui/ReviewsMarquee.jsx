'use client'

import { Star } from 'lucide-react'

export const SHARED_REVIEWS = [
  { id: '1', authorName: 'Priya S.',  location: 'Mumbai',    rating: 5, title: 'Best socks I own',      body: 'Incredibly comfortable from day one. My toes feel so much better after long walks.', verified: true },
  { id: '2', authorName: 'Arjun M.',  location: 'Bangalore', rating: 5, title: 'Worth every rupee',     body: 'Lightweight, breathable, and they look great. After wearing them daily for 3 months I completely understand the hype.', verified: true },
  { id: '3', authorName: 'Kavya R.',  location: 'Delhi',     rating: 4, title: 'Great quality',         body: 'Love the feel and the material. My feet feel relaxed after wearing these all day. Highly recommend.', verified: true },
  { id: '4', authorName: 'Rohit T.',  location: 'Chennai',   rating: 5, title: 'Game changer',          body: 'The toe separator design is subtle but effective. I noticed a real difference within a week.', verified: true },
  { id: '5', authorName: 'Sneha P.',  location: 'Pune',      rating: 5, title: 'Gifted to my mom too',  body: 'Bought for myself first, loved them so much I ordered 3 more pairs for family. Absolutely worth it.', verified: true },
  { id: '6', authorName: 'Vikram D.', location: 'Hyderabad', rating: 4, title: 'Solid product',         body: 'Good build quality, comfortable fit. The free size works perfectly for me. Delivery was fast too.', verified: true },
  { id: '7', authorName: 'Meera K.',  location: 'Kolkata',   rating: 5, title: 'Obsessed',              body: 'I have tried many sock brands but Knitwink is on another level. The softness is unreal.', verified: true },
  { id: '8', authorName: 'Aditya N.', location: 'Ahmedabad', rating: 5, title: 'Reordered twice',       body: 'Already on my third order. The quality is consistent and they hold their shape after washing.', verified: true },
]

export function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
      ))}
    </div>
  )
}

// ── Shared review card — used by both ReviewBand and ReviewsMarquee ──────────
export function ReviewCard({ review }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Stars rating={review.rating} />
        {review.verified && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-300">Verified</span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-brand-black">{review.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500 line-clamp-3">{review.body}</p>
      <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {review.authorName.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-medium text-brand-black">{review.authorName}</p>
          {review.location && <p className="text-[10px] text-gray-400">{review.location}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Horizontal marquee — used on product detail page ─────────────────────────
export function ReviewsMarquee({ reviews, averageRating = 4.8, totalReviews }) {
  const items = reviews?.length > 0 ? reviews : SHARED_REVIEWS
  const doubled = [...items, ...items]
  const count = totalReviews ?? items.length

  return (
    <div>
      {/* Rating summary */}
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="text-2xl font-bold text-brand-black">{averageRating.toFixed(1)}</span>
        <div>
          <Stars rating={Math.round(averageRating)} />
          <p className="mt-0.5 text-xs text-gray-400">{count} verified reviews</p>
        </div>
      </div>

      {/* Infinite horizontal marquee */}
      <div className="overflow-hidden">
        <div className="flex animate-marquee gap-4 will-change-transform hover:[animation-play-state:paused]">
          {doubled.map((review, i) => (
            <div key={`${review.id}-${i}`} className="w-72 shrink-0">
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
