'use client'

import { useCallback } from 'react'
import { ReviewsSection } from '@/components/ui/ReviewsMarquee'
import { getAllReviews } from '@/lib/api/reviews'

export function ReviewBand({ reviews = null }) {
  // useCallback so the reference is stable and doesn't re-trigger useEffect.
  // When the server already fetched the reviews (passed as `reviews`),
  // ReviewsSection uses them directly and skips the client fetch; otherwise the
  // fetchFn fallback runs so nothing breaks if the server fetch returned empty.
  const fetchFn = useCallback(() => getAllReviews(), [])
  return <ReviewsSection fetchFn={fetchFn} data={reviews} />
}
