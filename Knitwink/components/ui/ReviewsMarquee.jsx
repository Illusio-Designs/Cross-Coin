'use client'

import { Star } from 'lucide-react'

const DEFAULT_REVIEWS = [
  { id: '1', authorName: 'Priya S.',  location: 'Mumbai',    rating: 5, title: 'Best socks I own',      body: 'Incredibly comfortable from day one. The alignment really works — my toes feel so much better after long walks.', createdAt: '2024-11-10', verified: true },
  { id: '2', authorName: 'Arjun M.',  location: 'Bangalore', rating: 5, title: 'Worth every rupee',     body: 'Lightweight, breathable, and they look great. I was skeptical but after wearing them daily for 3 months I completely understand.', createdAt: '2024-10-22', verified: true },
  { id: '3', authorName: 'Kavya R.',  location: 'Delhi',     rating: 4, title: 'Great quality',         body: 'Love the feel and the material. My feet feel relaxed after wearing these all day. Highly recommend.', createdAt: '2024-09-15', verified: true },
  { id: '4', authorName: 'Rohit T.',  location: 'Chennai',   rating: 5, title: 'Game changer',          body: 'I had bunion pain for years. These socks have genuinely helped. The toe separator design is subtle but effective.', createdAt: '2024-08-30', verified: true },
  { id: '5', authorName: 'Sneha P.',  location: 'Pune',      rating: 5, title: 'Gifted to my mom too',  body: 'Bought for myself first, loved them so much I ordered 3 more pairs for family. The white color stays clean too.', createdAt: '2024-08-12', verified: true },
  { id: '6', authorName: 'Vikram D.', location: 'Hyderabad', rating: 4, title: 'Solid product',         body: 'Good build quality, comfortable fit. The free size works perfectly for me. Delivery was fast too.', createdAt: '2024-07-20', verified: true },
]

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
      ))}
    </div>
  )
}

export function ReviewsMarquee({ reviews, averageRating = 4.8, totalReviews, eyebrow = 'Testimonials', title = 'What our customers say' }) {
  const items = reviews?.length > 0 ? reviews : DEFAULT_REVIEWS
  const doubled = [...items, ...items]
  const count = totalReviews ?? items.length

  return (
    <div>
      {/* Header */}
      <div className="mb-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">{eyebrow}</p>
        <h2 className="mt-1.5 font-display text-2xl font-normal text-brand-black lg:text-3xl" dangerouslySetInnerHTML={{ __html: title }} />
      </div>

      {/* Rating summary */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <span className="text-3xl font-bold text-brand-black">{averageRating.toFixed(1)}</span>
        <div>
          <Stars rating={Math.round(averageRating)} />
          <p className="mt-0.5 text-xs text-gray-400">{count} verified reviews</p>
        </div>
      </div>

      {/* Infinite marquee — px on wrapper gives breathing room so first card isn't clipped */}
      <div>
        <div className="flex animate-marquee gap-4 will-change-transform hover:[animation-play-state:paused]">
          {doubled.map((review, i) => (
            <div
              key={`${review.id}-${i}`}
              className="w-72 shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <Stars rating={review.rating} />
                {review.verified && (
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-300">Verified</span>
                )}
              </div>
              {review.title && (
                <p className="mb-1.5 text-sm font-semibold text-brand-black">{review.title}</p>
              )}
              <p className="mb-4 text-sm leading-relaxed text-gray-500 line-clamp-3">{review.body}</p>
              <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {review.authorName.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-medium text-brand-black">{review.authorName}</p>
                  {review.location && <p className="text-[10px] text-gray-400">{review.location}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
