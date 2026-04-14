'use client'

import { useCallback } from 'react'
import { ReviewsSection as SharedReviewsSection } from '@/components/ui/ReviewsMarquee'
import { getProductReviews } from '@/lib/api/reviews'

export function ReviewsSection({ productId, productName }) {
  const fetchFn = useCallback(() => getProductReviews(productId), [productId])
  return (
    <SharedReviewsSection
      fetchFn={fetchFn}
      productId={productId}
      productName={productName}
    />
  )
}
