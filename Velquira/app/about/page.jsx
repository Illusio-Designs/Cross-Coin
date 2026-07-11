'use client'

import Link from 'next/link'
import SeoWrapper from '@/components/SeoWrapper'
import { PageHero } from '@/components/layout/PageHero'
import { Reveal } from '@/components/ui/Reveal'

const PROMISES = [
  { phrase: 'Ethically Sourced.', sub: 'Traceable diamonds and conflict-free gemstones, certified at origin.' },
  { phrase: 'Hand-Finished.',     sub: 'Each piece bench-set by a single artisan from casting to polish.' },
  { phrase: 'Hallmarked 18k.',    sub: 'Solid 18k yellow, rose and white gold cast from recycled bullion.' },
  { phrase: 'For Generations.',   sub: 'Generous metalwork and settings designed to be re-set and inherited.' },
]

export default function AboutPage() {
  return (
    <SeoWrapper pageName="about">
      <PageHero
        variant="obsidian"
        eyebrow="The Velquira House"
        title="Light, set"
        titleAccent="by hand."
        description="A quiet atelier in Morbi, Gujarat, working in solid 18k gold and certified stones — shaping jewellery slowly, the way it was always meant to be made."
      />

      <section className="bg-ivory">
        <div className="mx-auto max-w-site px-4 py-16 sm:px-6 md:px-10 md:py-20">
          <Reveal>
            <div className="mx-auto w-full max-w-5xl overflow-hidden border border-gold/20 bg-white p-2">
              <div className="aspect-[3/2] w-full overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1600"
                  alt="A diamond solitaire from the Velquira atelier"
                  className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out hover:scale-[1.03]"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. The Atelier — editorial 2-column split */}
      <section className="bg-white">
        <div className="mx-auto max-w-site px-4 py-20 sm:px-6 md:px-10 lg:py-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                  The Atelier
                </p>
                <h2 className="mt-5 font-display text-4xl font-normal leading-[1.08] text-brand-black md:text-5xl">
                  In the atelier
                </h2>
                <div className="mt-6 h-px w-12 bg-gold/60" />

                <div className="mt-8 flex flex-col gap-5 text-[15px] leading-[1.85] text-brand-black/75">
                  <p>
                    Velquira began as a quiet exchange between three jewellers who shared one
                    frustration — fine jewellery, made carelessly, designed to be replaced.
                    We resolved to make the opposite.
                  </p>
                  <p>
                    Every piece begins as a sketch on tracing paper, is cast in solid 18k gold,
                    then hand-finished at the bench — pavé set, milgrain edged, mirror polished.
                    No production lines. No shortcuts.
                  </p>
                  <p>
                    We work directly with our diamond cutters and gemstone suppliers, refuse
                    synthetic certifications, and price our pieces by the craft they hold —
                    not the season they belong to.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-7">
              <div className="relative">
                <div className="aspect-[4/5] w-full overflow-hidden bg-cream">
                  <img
                    src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200"
                    alt="An artisan setting a stone at the Velquira bench"
                    className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out hover:scale-[1.03]"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. Our Promise */}
      <section className="bg-cream">
        <div className="mx-auto max-w-site px-4 py-20 sm:px-6 md:px-10 lg:py-28">
          <Reveal>
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                Our Promise
              </p>
              <h2 className="mt-5 font-display text-4xl font-normal text-brand-black md:text-5xl">
                Crafted to Endure
              </h2>
              <div className="mx-auto mt-6 h-px w-12 bg-gold/60" />
            </div>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {PROMISES.map((p, i) => (
              <Reveal key={p.phrase} delay={i * 0.08}>
                <div className="flex flex-col items-start gap-3 border-t border-gold/25 pt-6">
                  <p className="font-display italic text-[20px] leading-snug text-brand-black">
                    {p.phrase}
                  </p>
                  <p className="text-[14px] leading-[1.7] text-brand-black/60">
                    {p.sub}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Visit the Atelier */}
      <section className="bg-ivory">
        <div className="mx-auto max-w-site px-4 py-20 text-center sm:px-6 md:px-10 lg:py-28">
          <Reveal>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              By Invitation
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="mx-auto mt-6 max-w-3xl font-display text-3xl font-normal leading-tight text-brand-black md:text-5xl">
              Visit the Velquira Atelier
            </h2>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mx-auto mt-6 h-px w-12 bg-gold/60" />
          </Reveal>

          <Reveal delay={0.22}>
            <p className="mx-auto mt-8 max-w-xl text-[15px] leading-[1.85] text-brand-black/70">
              Step into our workspace to see pieces in person, discuss a commission,
              or have a heirloom re-set. We receive a small number of guests each week.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <Link
              href="/contact"
              className="mt-10 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-gold transition-colors hover:text-gold-deep"
            >
              Request an Appointment
              <span aria-hidden>&rarr;</span>
            </Link>
          </Reveal>

          <Reveal delay={0.38}>
            <p className="mt-8 font-display italic text-[13px] text-gold/80">
              By appointment only &middot; Morbi, Gujarat
            </p>
          </Reveal>
        </div>
      </section>
    </SeoWrapper>
  )
}