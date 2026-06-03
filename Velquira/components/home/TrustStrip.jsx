'use client'

/* ─────────────────────────────────────────────────────────────────────────
   Chapter V — "From the Atelier" / Our Promise.
   A thin editorial promise band — four micro-essays in a single
   horizontal row, separated by tiny gold diamond ornaments. NO icons,
   NO bordered cards. Sits on a cream ivory ground.
   ──────────────────────────────────────────────────────────────────────── */

const PROMISES = [
  { eyebrow: 'Provenance', phrase: 'Ethically Sourced.', sub: 'Conflict-free diamonds, responsibly mined gold.' },
  { eyebrow: 'Atelier',    phrase: 'Hand-Finished.',     sub: 'Set, polished, and inspected by our craftspeople.' },
  { eyebrow: 'Standard',   phrase: 'Hallmarked 18k.',    sub: 'Independently certified and assay-verified.' },
  { eyebrow: 'Heirloom',   phrase: 'For Generations.',   sub: 'Backed for life by the Velquira atelier.' },
]

export function TrustStrip() {
  return (
    <section className="relative bg-ivory px-6 py-24 md:py-28">
      <div className="mx-auto max-w-site">
        {/* Chapter header */}
        <div className="mb-14 flex flex-col items-center text-center md:mb-20">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-xl italic text-gold">V.</span>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              From the Atelier
            </p>
          </div>
          <h2 className="mt-5 font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
            Our Promise
          </h2>
          <div className="mt-7 flex items-center gap-4">
            <span className="h-px w-12 bg-gold/40" />
            <span className="vq-diamond" aria-hidden />
            <span className="h-px w-12 bg-gold/40" />
          </div>
        </div>

        {/* Promise row — four micro-essays, diamond ornaments between */}
        <div className="flex flex-col items-stretch gap-12 md:flex-row md:items-start md:justify-between md:gap-6 lg:gap-10">
          {PROMISES.map((p, i) => (
            <div key={p.phrase} className="flex flex-1 items-start gap-6 md:gap-4 lg:gap-6">
              <div className="flex flex-1 flex-col items-center text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                  {p.eyebrow}
                </p>
                <h3 className="mt-4 font-display text-[20px] italic font-normal leading-snug text-brand-black md:text-[20px]">
                  {p.phrase}
                </h3>
                <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-brand-black/60">
                  {p.sub}
                </p>
              </div>

              {/* Diamond separator — only between items, hidden on mobile */}
              {i < PROMISES.length - 1 && (
                <span
                  aria-hidden
                  className="vq-diamond mt-8 hidden shrink-0 md:inline-block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}