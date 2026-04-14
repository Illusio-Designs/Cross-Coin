'use client'

import { useCallback } from 'react'
import { ReviewsSection } from '@/components/ui/ReviewsMarquee'
import { getAllReviews } from '@/lib/api/reviews'

export function ReviewBand() {
  // useCallback so the reference is stable and doesn't re-trigger useEffect
  const fetchFn = useCallback(() => getAllReviews(), [])
  return <ReviewsSection fetchFn={fetchFn} />
}
