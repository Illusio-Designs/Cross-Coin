'use client'

import { useCallback } from 'react'
import { ReviewsSection } from '@/components/ui/ReviewsMarquee'
import { getAllReviews } from '@/lib/api/reviews'

/**
 * ReviewBand — homepage testimonials.
 * Quiet centred chapter heading (eyebrow + serif headline + thin gold
 * rule) above the existing reviews marquee. No Roman numerals, no
 * diamond ornaments — just the minimal section header pattern shared
 * with the rest of the homepage.
 */
export function ReviewBand() {
  // useCallback so the reference is stable and doesn't re-trigger useEffect
  const fetchFn = useCallback(() => getAllReviews(), [])

  return (
    <section className="bg-cream">
      {/* Section heading */}
      <div className="vq-container pt-20 md:pt-28">
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Reviews</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            Customer Reviews <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>
      </div>

      {/* Existing reviews marquee — content untouched */}
      <ReviewsSection fetchFn={fetchFn} />
    </section>
  )
}