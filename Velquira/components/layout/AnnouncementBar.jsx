'use client'

import { useState, useEffect } from 'react'

const PHRASES = [
  'Complimentary Insured Shipping on Orders Above ₹2,500',
  'Lifetime Craftsmanship Guarantee',
  'Hallmarked 18k Gold',
]

export function AnnouncementBar() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`sticky top-0 z-[60] relative w-full overflow-hidden border-b border-gold/20 bg-brand-black transition-all duration-300 ${hidden ? 'h-0 opacity-0' : 'h-[30px] opacity-100'}`}
      role="region"
      aria-label="Announcement"
    >
      <span className="vq-shine opacity-30" aria-hidden />

      <div className="relative flex h-[30px] items-center justify-center px-4">
        <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[10px] font-light uppercase tracking-[0.32em] text-white/80 sm:gap-3">
          {PHRASES.map((phrase, idx) => (
            <span key={phrase} className="flex items-center gap-2 sm:gap-3">
              <span className="whitespace-nowrap text-gold-light/90">{phrase}</span>
              {idx < PHRASES.length - 1 && (
                <span
                  className="vq-diamond hidden sm:inline-block"
                  aria-hidden
                  style={{ width: 4, height: 4, opacity: 0.85 }}
                />
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}