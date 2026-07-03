'use client'

const PHRASES = [
  'Complimentary Insured Shipping on Orders Above ₹2,500',
  'Lifetime Craftsmanship Guarantee',
  'Hallmarked 18k Gold',
]

/** Always-visible top strip — no hide-on-scroll (avoids layout jump). */
export function AnnouncementBar() {
  return (
    <div
      className="sticky top-0 z-[51] w-full overflow-hidden border-b border-gold/20 bg-brand-black"
      role="region"
      aria-label="Announcement"
    >
      <span className="vq-shine opacity-20" aria-hidden />

      <div className="flex h-[30px] items-center justify-center px-4">
        <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[10px] font-light uppercase tracking-[0.32em] text-white/80 sm:gap-3">
          {PHRASES.map((phrase, idx) => (
            <span key={phrase} className="flex items-center gap-2 sm:gap-3">
              <span className="whitespace-nowrap text-gold-light/90">{phrase}</span>
              {idx < PHRASES.length - 1 && (
                <span className="vq-diamond hidden sm:inline-block" aria-hidden style={{ width: 4, height: 4 }} />
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}
