'use client'

import { ReviewsMarquee } from '@/components/ui/ReviewsMarquee'

export function ReviewsSection({ reviews, averageRating, totalReviews }) {
  return (
    <section className="rounded-2xl bg-gray-50 px-6 py-10 md:px-8 md:py-12">
      <ReviewsMarquee
        reviews={reviews}
        averageRating={averageRating}
        totalReviews={totalReviews}
        eyebrow="Customer Reviews"
        title="Hear it from <strong>Our Community</strong>"
      />
    </section>
  )
}
