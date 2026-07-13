'use client'

const PROMISES = [
  { eyebrow: 'Sourcing', phrase: 'Ethically Sourced', sub: 'Conflict-free diamonds, responsibly mined gold.' },
  { eyebrow: 'Studio', phrase: 'Hand-Finished', sub: 'Set, polished and checked by our craftspeople.' },
  { eyebrow: 'Standard', phrase: 'Hallmarked 18k', sub: 'Independently certified and assay-verified.' },
  { eyebrow: 'Heirloom', phrase: 'For Generations', sub: 'Backed for life by the Velquira studio.' },
]

export function TrustStrip() {
  return (
    <section className="bg-beige vq-section">
      <div className="vq-container">
        {/* heading */}
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Why Velquira</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            Our Promise <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>

        {/* airy row — hairline dividers, no boxes */}
        <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line">
          {PROMISES.map((p) => (
            <div key={p.phrase} className="group px-8 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.4em] text-gold">{p.eyebrow}</p>
              <h3 className="vq-display mt-4 text-[1.7rem] leading-tight text-ink">{p.phrase}</h3>
              <span aria-hidden className="mx-auto mt-4 block h-px w-8 bg-gold/40 transition-all duration-500 group-hover:w-14" />
              <p className="mx-auto mt-4 max-w-[15rem] text-[13px] leading-relaxed text-text-muted">{p.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
