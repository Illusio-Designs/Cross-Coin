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
    <section className="bg-white">
      {/* Section heading */}
      <div className="mx-auto flex max-w-[1320px] flex-col items-center px-4 pt-20 text-center md:pt-28 lg:px-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
          Testimonials
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
          A Legacy of Trust
        </h2>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
          Notes from the people who carry our pieces.
        </p>
        <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
      </div>

      {/* Existing reviews marquee — content untouched */}
      <ReviewsSection fetchFn={fetchFn} />
    </section>
  )
}