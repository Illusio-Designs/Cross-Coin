'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ReviewsSection as SharedReviewsSection } from '@/components/ui/ReviewsMarquee'
import { getProductReviews } from '@/lib/api/reviews'

/**
 * Product-page reviews wrapper.
 *
 * Accepts `initialReviews` from the server shell so the first render
 * has no network round-trip. Falls back to the original fetchFn
 * pattern when no initialData is supplied (e.g. older callers).
 *
 * The underlying ReviewsMarquee handles the UI and pagination; this
 * component just owns the data plumbing.
 */
export function ReviewsSection({ productId, productName, initialReviews }) {
  // useQuery seeded with server-fetched payload when available.
  const { data: reviews } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => getProductReviews(productId),
    enabled: !!productId,
    initialData: initialReviews,
    // Reviews don't change frequently — give them a longer stale window
    // than the queryClient default.
    staleTime: 10 * 60 * 1000,
  })

  // Stable fetchFn fallback for the shared component's pagination logic.
  // When initialReviews + reviews are both populated, the shared
  // component can render immediately without refetching.
  const fetchFn = useCallback(() => Promise.resolve(reviews || []), [reviews])

  return (
    <SharedReviewsSection
      fetchFn={fetchFn}
      initialReviews={reviews}
      productId={productId}
      productName={productName}
    />
  )
}
