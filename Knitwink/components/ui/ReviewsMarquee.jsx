'use client'

import { useEffect, useState } from 'react'
import { Star, PenLine } from 'lucide-react'
import { ReviewModal } from './ReviewModal'

const EMPTY = []

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  const name = review.reviewerName || review.guestName || 'Anonymous'
  const body = review.review || review.comment || review.body || ''
  const title = review.title || ''
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm flex flex-col gap-2" style={{ minHeight: 130 }}>
      <Stars rating={review.rating} />
      {title && <p className="text-xs font-semibold text-brand-black line-clamp-1">{title}</p>}
      <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2 flex-1">{body}</p>
      <div className="flex items-center gap-2 border-t border-gray-50 pt-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <p className="text-[11px] font-medium text-brand-black">{name}</p>
      </div>
    </div>
  )
}

function buildCols(reviews) {
  if (!reviews.length) return { col1: [], col2: [], col3: [] }
  // Build a dense pool first so every column has enough cards to overflow the
  // 440px viewport — with only a few unique reviews the old split produced
  // short columns and the scroll loop revealed big empty gaps. Each column is
  // then tripled so the -33.333% keyframe loops seamlessly.
  let pool = reviews
  while (pool.length < 15) pool = [...pool, ...reviews]
  const a = pool.filter((_, i) => i % 3 === 0)
  const b = pool.filter((_, i) => i % 3 === 1)
  const c = pool.filter((_, i) => i % 3 === 2)
  return {
    col1: [...a, ...a, ...a],
    col2: [...b, ...b, ...b],
    col3: [...c, ...c, ...c],
  }
}

export function ReviewsSection({ productId = null, productName = null, fetchFn = null }) {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({ average: 4.8, total: 50000 })
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!fetchFn) return
    fetchFn().then((data) => {
      const list = data?.reviews ?? data ?? []
      if (list.length > 0) {
        setReviews(list)
        if (data?.stats) setStats(data.stats)
      }
    }).catch(() => {})
  }, [fetchFn])

  const displayReviews = reviews.length > 0 ? reviews : []
  const hasReviews = displayReviews.length > 0

  const { col1, col2, col3 } = buildCols(displayReviews)
  const avg = stats?.average ?? 0
  const total = stats?.total ?? displayReviews.length

  // For mobile marquee — duplicate for seamless loop
  const mobileRow = [...displayReviews, ...displayReviews]

  return (
    <section className="bg-white">
      <div className="grid grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.8fr_2fr] lg:px-8 lg:py-12">

        {/* LEFT */}
        <div className="flex flex-col justify-center gap-5 lg:gap-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">What They Say</p>

          {/* Big rating block */}
          <div className="flex items-center gap-4 rounded-2xl bg-gray-50 px-5 py-4 sm:px-6 sm:py-5">
            <span className="text-5xl font-bold leading-none text-brand-black sm:text-6xl">{avg.toFixed(1)}</span>
            <div className="flex flex-col gap-1.5">
              <Stars rating={Math.round(avg)} />
              <p className="text-xs text-gray-400">Based on {total >= 1000 ? `${(total / 1000).toFixed(0)}K+` : `${total}+`} reviews</p>
              <p className="text-xs font-semibold text-brand-black">98% would recommend</p>
            </div>
          </div>

          <p className="text-xl font-semibold leading-snug text-brand-black sm:text-2xl lg:text-3xl">
            "Thousands of happy<br />feet can't be wrong."
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { value: '50K+', label: 'Customers' },
              { value: '98%',  label: 'Recommend' },
              { value: avg.toFixed(1), label: 'Avg Rating' },
              { value: '5★',   label: 'Top Reviews' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-300 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-base font-bold text-brand-black sm:text-lg">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {productId && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-brand-black px-6 py-3 text-sm font-semibold uppercase tracking-wider text-brand-black transition-colors hover:bg-brand-black hover:text-white"
            >
              <PenLine size={15} />
              Review This Product
            </button>
          )}
        </div>

        {/* RIGHT — 3 infinite scrolling columns (desktop only) */}
        {hasReviews ? (
          <div className="relative hidden overflow-hidden lg:grid lg:grid-cols-3 lg:gap-2" style={{ height: 440 }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />
            <div className="flex flex-col gap-2 animate-scroll-up">
              {col1.map((r, i) => <ReviewCard key={`c1-${i}`} review={r} />)}
            </div>
            <div className="flex flex-col gap-2 animate-scroll-down">
              {col2.map((r, i) => <ReviewCard key={`c2-${i}`} review={r} />)}
            </div>
            <div className="flex flex-col gap-2 animate-scroll-up">
              {col3.map((r, i) => <ReviewCard key={`c3-${i}`} review={r} />)}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm" style={{ height: 440 }}>
            No reviews yet — be the first!
          </div>
        )}

        {/* Mobile / tablet — infinite horizontal marquee */}
        {hasReviews && (
          <div className="relative overflow-hidden lg:hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
            <div className="animate-scroll-left gap-3 py-1">
              {mobileRow.map((r, i) => (
                <div key={i} className="w-[270px] shrink-0 sm:w-[300px]">
                  <ReviewCard review={r} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <ReviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={productId}
        productName={productName}
      />
    </section>
  )
}
