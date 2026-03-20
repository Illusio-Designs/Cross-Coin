'use client'

import { Star } from 'lucide-react'

interface Review {
  id: string
  authorName: string
  rating: number
  title: string
  body: string
  createdAt: string
  verified: boolean
}

const FALLBACK_REVIEWS: Review[] = [
  { id: '1', authorName: 'Priya S.', rating: 5, title: 'Best shoes I own', body: 'Incredibly comfortable from day one. I wear them everywhere — work, walks, travel. The wool keeps my feet at the perfect temperature.', createdAt: '2024-11-10', verified: true },
  { id: '2', authorName: 'Arjun M.', rating: 5, title: 'Worth every rupee', body: 'Lightweight, breathable, and they look great. I was skeptical about the price but after wearing them daily for 3 months I completely understand.', createdAt: '2024-10-22', verified: true },
  { id: '3', authorName: 'Kavya R.', rating: 4, title: 'Great but runs slightly large', body: 'Love the feel and the sustainability story. Just size down half a size — they stretched a little after a few weeks of wear.', createdAt: '2024-09-15', verified: true },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? 'fill-brand-black text-brand-black' : 'fill-gray-200 text-gray-200'}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

interface ReviewsSectionProps {
  reviews?: Review[]
  averageRating?: number
  totalReviews?: number
}

export function ReviewsSection({ reviews, averageRating = 4.8, totalReviews }: ReviewsSectionProps) {
  const items = reviews && reviews.length > 0 ? reviews : FALLBACK_REVIEWS
  const count = totalReviews ?? items.length

  return (
    <section className="border-t border-gray-200 pt-12 mt-12">
      {/* Summary */}
      <div className="mb-10 flex items-center gap-4">
        <span className="font-display text-4xl font-normal text-brand-black">{averageRating.toFixed(1)}</span>
        <div className="flex flex-col gap-1">
          <Stars rating={Math.round(averageRating)} />
          <p className="text-xs text-gray-600">{count} reviews</p>
        </div>
      </div>

      {/* Review list */}
      <div className="flex flex-col divide-y divide-gray-200">
        {items.map((review) => (
          <div key={review.id} className="py-6">
            <div className="mb-2 flex items-center justify-between gap-4">
              <Stars rating={review.rating} />
              {review.verified && (
                <span className="text-xs font-medium uppercase tracking-widest text-sage">
                  Verified
                </span>
              )}
            </div>
            <p className="mb-1 text-sm font-medium text-brand-black">{review.title}</p>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">{review.body}</p>
            <p className="text-xs text-gray-400">
              {review.authorName} &middot;{' '}
              {new Date(review.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
