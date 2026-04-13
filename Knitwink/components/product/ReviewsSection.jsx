'use client'

import { ReviewsMarquee } from '@/components/ui/ReviewsMarquee'

export function ReviewsSection({ reviews, averageRating = 4.8, totalReviews }) {
  return (
    <div className="bg-white px-6 py-10 md:px-8 md:py-12">
      <p className="mb-6 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
        What They Say
      </p>
      <ReviewsMarquee
        reviews={reviews}
        averageRating={averageRating}
        totalReviews={totalReviews}
      />
    </div>
  )
}
