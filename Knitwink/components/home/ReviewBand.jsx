'use client'

import { Star } from 'lucide-react'

const REVIEWS = [
  { id: 1, quote: 'The most comfortable socks I have ever worn. My toes feel so much better after long walks.', author: 'Priya S.', location: 'Mumbai', rating: 5 },
  { id: 2, quote: 'Incredibly lightweight and breathable. The alignment really works — bunion pain is gone.', author: 'Arjun M.', location: 'Bangalore', rating: 5 },
  { id: 3, quote: 'Love that they are free size and fit perfectly. Great for yoga and recovery.', author: 'Kavya R.', location: 'Delhi', rating: 5 },
  { id: 4, quote: 'Gifted to my mom too. She loves them. The white color stays clean after washing.', author: 'Sneha P.', location: 'Pune', rating: 5 },
  { id: 5, quote: 'Game changer for my foot fatigue. Wear them every evening after work.', author: 'Rohit T.', location: 'Chennai', rating: 5 },
  { id: 6, quote: 'Solid quality, fast delivery. The toe separator design is subtle but very effective.', author: 'Vikram D.', location: 'Hyderabad', rating: 4 },
]

const doubled = [...REVIEWS, ...REVIEWS]

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} aria-hidden="true" />
      ))}
    </div>
  )
}

export function ReviewBand() {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white py-10 md:py-14">
      <h2 className="mb-8 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
        What people are saying
      </h2>

      <div className="overflow-hidden">
        <div className="flex animate-marquee gap-4 will-change-transform">
          {doubled.map((review, i) => (
            <div
              key={`${review.id}-${i}`}
              className="w-72 shrink-0 rounded-2xl bg-white p-6 shadow-sm"
            >
              <Stars rating={review.rating} />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-800">&ldquo;{review.quote}&rdquo;</p>
              <div className="mt-4">
                <p className="text-sm font-medium text-brand-black">{review.author}</p>
                <p className="text-xs text-gray-500">{review.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
