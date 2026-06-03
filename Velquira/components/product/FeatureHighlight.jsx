'use client'

/* "The Maker's Hand" — editorial story band on bg-cream.
   Minimal section header (eyebrow + Playfair headline + gold rule)
   over four micro-essays in a single horizontal row. */

const ESSAYS = [
  { phrase: 'Hand-Finished.', copy: 'Polished by master jewellers.' },
  { phrase: 'Hallmarked.',    copy: 'Assayed 18k & platinum.' },
  { phrase: 'Conflict-Free.', copy: 'Ethically sourced stones.' },
  { phrase: 'Lifetime Care.', copy: 'Cleanings & repairs, forever.' },
]

export function FeatureHighlight() {
  return (
    <section className="bg-cream px-4 py-24 sm:px-6 md:px-10">
      <div className="mx-auto max-w-site">
        {/* Section heading */}
        <div className="flex flex-col items-start">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
            The Maker’s Hand
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
            Crafted to Endure
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
            Every piece passes through skilled hands before it reaches yours.
          </p>
          <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
        </div>

        {/* Micro-essays — horizontal row */}
        <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {ESSAYS.map((e) => (
            <div key={e.phrase} className="flex flex-col">
              <p className="font-display italic text-[22px] leading-snug text-brand-black md:text-[24px]">
                {e.phrase}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-brand-black/65">
                {e.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}