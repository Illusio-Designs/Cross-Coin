'use client'

/* "How It's Made" — quiet story band.
   Standard section header (eyebrow + Playfair headline + gold rule)
   over four short notes separated by hairlines. No boxes. */

const ESSAYS = [
  { phrase: 'Hand-Finished', copy: 'Every product is polished and set by our own jewellers.' },
  { phrase: 'Hallmarked', copy: 'Assayed 18k gold and platinum, certified in the box.' },
  { phrase: 'Conflict-Free', copy: 'Stones sourced from suppliers we can name and trace.' },
  { phrase: 'Lifetime Care', copy: 'Free cleaning and repairs from our studio, for good.' },
]

export function FeatureHighlight() {
  return (
    <section className="vq-section bg-paper">
      <div className="vq-container">
        {/* Section heading */}
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">How It’s Made</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            Made to Last <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>

        {/* Four notes — hairline separated */}
        <div className="grid grid-cols-1 gap-10 border-t border-line pt-10 sm:grid-cols-2 md:grid-cols-4 md:gap-0 md:divide-x md:divide-line">
          {ESSAYS.map((e) => (
            <div key={e.phrase} className="flex flex-col md:px-8 md:first:pl-0 md:last:pr-0">
              <span className="vq-diamond" aria-hidden />
              <p className="vq-display mt-5 text-[22px] leading-snug text-ink md:text-[24px]">
                {e.phrase}
              </p>
              <p className="mt-3 text-[13px] leading-[1.8] text-text-muted">
                {e.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
