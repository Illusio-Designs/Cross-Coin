'use client'

import { ReviewCard, Stars, SHARED_REVIEWS } from '@/components/ui/ReviewsMarquee'

const col1 = SHARED_REVIEWS.filter((_, i) => i % 2 === 0)
const col2 = SHARED_REVIEWS.filter((_, i) => i % 2 !== 0)

export function ReviewBand() {
  return (
    <section className="bg-white">
      <div className="grid grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_1.4fr] lg:px-8 lg:py-12">

        {/* LEFT — title + stats */}
        <div className="flex flex-col justify-center gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">What They Say</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-snug text-brand-black lg:text-4xl">
              Loved by<br /><strong>thousands</strong> of<br />happy feet
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-brand-black">4.8</span>
              <div>
                <Stars rating={5} />
                <p className="mt-0.5 text-xs text-gray-400">Average rating</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '50K+', label: 'Happy customers' },
                { value: '98%',  label: 'Would recommend' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-lg font-bold text-brand-black">{s.value}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — two scrolling columns (desktop only) */}
        <div className="relative hidden overflow-hidden lg:grid lg:grid-cols-2 lg:gap-3" style={{ height: 440 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />

          {/* Column 1 — scrolls UP */}
          <div className="flex flex-col gap-3 animate-scroll-up">
            {[...col1, ...col1].map((r, i) => <ReviewCard key={`c1-${i}`} review={r} />)}
          </div>

          {/* Column 2 — scrolls DOWN */}
          <div className="flex flex-col gap-3 animate-scroll-down" style={{ marginTop: -80 }}>
            {[...col2, ...col2].map((r, i) => <ReviewCard key={`c2-${i}`} review={r} />)}
          </div>
        </div>

        {/* Mobile — horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 lg:hidden">
          {SHARED_REVIEWS.map((r) => (
            <div key={r.id} className="w-72 shrink-0">
              <ReviewCard review={r} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
