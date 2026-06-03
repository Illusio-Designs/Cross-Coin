'use client'

import { useEffect, useState } from 'react'
import { Star, PenLine } from 'lucide-react'
import { ReviewModal } from './ReviewModal'

function Stars({ rating, size = 12 }) {
  const r = Number(rating) || 0
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.4}
          className={i < r ? 'fill-gold text-gold' : 'fill-transparent text-gold/30'}
        />
      ))}
    </div>
  )
}

/**
 * ReviewCard — editorial "printed quote" card.
 * Cream surface, hairline gold border, gold stars, refined serif body,
 * a thin gold rule, and the reviewer name in serif italic gold below.
 */
function ReviewCard({ review }) {
  const name = review.reviewerName || review.guestName || 'Anonymous'
  const body = review.review || review.comment || review.body || ''
  const title = review.title || ''
  return (
    <div className="flex flex-col gap-3 rounded-md border border-gold/25 bg-cream/60 p-4 sm:p-5">
      <Stars rating={review.rating} />
      {title && (
        <p className="font-display text-[14px] leading-tight text-brand-black line-clamp-1">
          {title}
        </p>
      )}
      <p className="font-display text-[13px] italic leading-relaxed text-brand-black/75 line-clamp-3">
        “{body}”
      </p>
      <span className="mt-1 inline-block h-px w-8 bg-gold/40" aria-hidden />
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-gold">
        — {name}
      </p>
    </div>
  )
}

function buildCols(reviews) {
  const a = reviews.filter((_, i) => i % 3 === 0)
  const b = reviews.filter((_, i) => i % 3 === 1)
  const c = reviews.filter((_, i) => i % 3 === 2)
  const max = Math.max(a.length, b.length, c.length)
  const pad = (arr) => {
    while (arr.length < max) arr = [...arr, ...reviews]
    return arr.slice(0, max)
  }
  const pa = pad(a), pb = pad(b), pc = pad(c)
  return {
    col1: [...pa, ...pa, ...pa],
    col2: [...pb, ...pb, ...pb],
    col3: [...pc, ...pc, ...pc],
  }
}

/**
 * ReviewsSection — editorial testimonials.
 *
 * Left: a refined rating block (Playfair italic average, gold stars,
 * subtle caption, a pulled quote in italic serif).
 * Right: three slow-scrolling columns of cream review cards. On mobile
 * a single horizontal marquee replaces the columns.
 */
export function ReviewsSection({ productId = null, productName = null, fetchFn = null }) {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({ average: 4.8, total: 50000 })
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!fetchFn) return
    fetchFn()
      .then((data) => {
        const list = data?.reviews ?? data ?? []
        if (list.length > 0) {
          setReviews(list)
          if (data?.stats) setStats(data.stats)
        }
      })
      .catch(() => {})
  }, [fetchFn])

  const display = reviews
  const hasReviews = display.length > 0
  const { col1, col2, col3 } = buildCols(display)
  const avg = stats?.average ?? 0
  const total = stats?.total ?? display.length
  const totalLabel = total >= 1000 ? `${(total / 1000).toFixed(0)}k+` : `${total}+`

  // Mobile horizontal marquee — duplicated for seamless loop
  const mobileRow = [...display, ...display]

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.7fr] lg:gap-14 lg:px-8 lg:py-16">

        {/* LEFT — refined rating block */}
        <aside className="flex flex-col justify-center">
          <div className="flex items-baseline gap-5">
            <p className="font-display text-7xl font-normal leading-none text-brand-black md:text-8xl">
              {avg ? avg.toFixed(1) : '—'}
            </p>
            <div className="flex flex-col gap-2">
              <Stars rating={Math.round(avg || 0)} size={14} />
              <p className="text-[11px] uppercase tracking-[0.22em] text-brand-black/55">
                {totalLabel} reviews
              </p>
            </div>
          </div>

          <span className="mt-7 inline-block h-px w-12 bg-gold/60" aria-hidden />

          <p className="mt-7 max-w-sm font-display text-xl italic leading-snug text-brand-black md:text-2xl">
            “Treasured by thousands,&nbsp;worn for a lifetime.”
          </p>

          <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-brand-black/60">
            Notes from the people who carry our pieces — handwritten after every order.
          </p>

          {productId && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-9 inline-flex w-fit items-center gap-2 rounded-full bg-brand-black px-6 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:bg-gold-deep"
            >
              <PenLine size={13} strokeWidth={1.5} />
              Leave a Review
            </button>
          )}
        </aside>

        {/* RIGHT — review wall */}
        {hasReviews ? (
          <div
            className="relative hidden overflow-hidden lg:grid lg:grid-cols-3 lg:gap-3"
            style={{ height: 520 }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-white to-transparent"
            />
            <div className="flex flex-col gap-3 animate-scroll-up">
              {col1.map((r, i) => (
                <ReviewCard key={`c1-${i}`} review={r} />
              ))}
            </div>
            <div className="flex flex-col gap-3 animate-scroll-down">
              {col2.map((r, i) => (
                <ReviewCard key={`c2-${i}`} review={r} />
              ))}
            </div>
            <div className="flex flex-col gap-3 animate-scroll-up">
              {col3.map((r, i) => (
                <ReviewCard key={`c3-${i}`} review={r} />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="hidden items-center justify-center text-[14px] italic text-brand-black/40 lg:flex"
            style={{ height: 520 }}
          >
            Notes from the atelier will appear here as the first letters arrive.
          </div>
        )}

        {/* Mobile / tablet — single horizontal marquee */}
        {hasReviews && (
          <div className="relative overflow-hidden lg:hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent"
            />
            <div className="animate-scroll-left gap-3 py-2">
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