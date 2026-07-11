'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

const MARQUEE_ITEMS = [
  'Hand-set diamonds',
  'Hallmarked 18k gold',
  'Conflict-free stones',
  'Lifetime atelier care',
  'Insured worldwide shipping',
  'Bespoke commissions',
]

/**
 * AtelierManifesto — a dark editorial band with infinite gold marquee
 * and a quiet manifesto column. Unique to Velquira's homepage rhythm.
 */
export function AtelierManifesto() {
  const loop = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <section className="relative overflow-hidden bg-brand-black text-white">
      {/* Gold marquee ribbon */}
      <div className="border-y border-gold/25 bg-brand-black py-3.5">
        <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap px-4">
          {loop.map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-10">
              <span className="text-[10px] font-medium uppercase tracking-[0.38em] text-gold/90">
                {item}
              </span>
              <span className="vq-diamond shrink-0 opacity-70" style={{ width: 5, height: 5 }} />
            </span>
          ))}
        </div>
      </div>

      {/* Manifesto body */}
      <div className="relative mx-auto max-w-[1480px] px-6 py-20 md:px-12 md:py-28 lg:px-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gold/30 to-transparent"
        />

        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold">
              The Atelier
            </p>
            <h2 className="mt-5 font-display text-4xl font-normal leading-[1.06] tracking-tight md:text-5xl lg:text-[3.25rem]">
              Jewellery that
              <span className="block italic text-gold-light">outlives the moment.</span>
            </h2>
          </div>

          <div className="lg:col-span-7">
            <p className="max-w-xl text-[15px] leading-[1.85] text-white/70 md:text-base">
              Every Velquira piece begins as a sketch in our Morbi atelier — refined through
              hundreds of hours of hand-setting, polishing, and inspection before it ever reaches
              you. We work only in hallmarked gold and certified stones, because heirlooms demand
              nothing less.
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.85] text-white/55 md:text-base">
              This is not fast fashion for your wrist. It is quiet luxury — designed to be passed
              down, not discarded.
            </p>

            <Link
              href={ROUTES.about}
              className="group/cta mt-10 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:text-gold-light"
            >
              <span className="relative pb-1.5">
                Our story
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-px w-full origin-left bg-gold transition-transform duration-500 group-hover/cta:scale-x-110"
                />
              </span>
              <ArrowRight
                size={13}
                strokeWidth={1.7}
                className="transition-transform duration-300 group-hover/cta:translate-x-1.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
