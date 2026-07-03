'use client'

const PROMISES = [
  { eyebrow: 'Provenance', phrase: 'Ethically Sourced.', sub: 'Conflict-free diamonds, responsibly mined gold.' },
  { eyebrow: 'Atelier', phrase: 'Hand-Finished.', sub: 'Set, polished, and inspected by our craftspeople.' },
  { eyebrow: 'Standard', phrase: 'Hallmarked 18k.', sub: 'Independently certified and assay-verified.' },
  { eyebrow: 'Heirloom', phrase: 'For Generations.', sub: 'Backed for life by the Velquira atelier.' },
]

export function TrustStrip() {
  return (
    <section className="vq-lattice border-y border-gold/15 bg-ivory px-6 py-20 md:py-28">
      <div className="mx-auto max-w-site">
        <div className="mb-14 flex flex-col items-center text-center md:mb-20">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold">
            From the Atelier
          </p>
          <h2 className="vq-display mt-4 text-4xl text-brand-black md:text-5xl">
            Our Promise
          </h2>
          <span className="mt-6 inline-block h-px w-16 bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {PROMISES.map((p) => (
            <div
              key={p.phrase}
              className="group relative border border-gold/15 bg-white/60 p-8 text-center backdrop-blur-sm transition-all duration-500 hover:border-gold/40 hover:bg-white hover:shadow-[0_20px_40px_-24px_rgba(143,102,32,0.25)]"
            >
              <span
                aria-hidden
                className="mx-auto mb-5 block h-px w-8 bg-gold/40 transition-all duration-500 group-hover:w-12"
              />
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                {p.eyebrow}
              </p>
              <h3 className="mt-4 font-display text-xl italic leading-snug text-brand-black">
                {p.phrase}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-black/60">
                {p.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
