'use client'

import { ReviewsMarquee } from '@/components/ui/ReviewsMarquee'

export function ReviewBand() {
  return (
    <section className="bg-white px-4 py-12 md:px-8 lg:px-16">
      <ReviewsMarquee
        eyebrow="Real Stories"
        title="Comfort You Can <strong>Feel & Trust</strong>"
      />
    </section>
  )
}
