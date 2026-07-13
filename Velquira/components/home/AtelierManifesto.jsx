'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

const MARQUEE_ITEMS = [
  'Hand-set diamonds',
  'Hallmarked 18k gold',
  'Conflict-free stones',
  'Lifetime care',
  'Insured worldwide shipping',
  'Custom orders',
]

/**
 * AtelierManifesto — dark emerald editorial band with infinite marquee.
 * Deep emerald-night section for finvera-style dark/light rhythm.
 */
export function AtelierManifesto() {
  const loop = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <section className="vq-night vq-aura relative overflow-hidden">
      {/* Top separator */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d9c7a0]/40 to-transparent" />

      {/* Marquee ribbon */}
      <div className="border-b border-white/10 bg-cream/[0.02] py-4 overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap px-4">
          {loop.map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-10">
              <span className="vq-grad-text-light text-[10px] font-semibold uppercase tracking-[0.4em]">
                {item}
              </span>
              <span className="vq-diamond shrink-0 opacity-70" style={{ width: 4, height: 4 }} />
            </span>
          ))}
        </div>
      </div>

      {/* Manifesto body */}
      <div className="relative vq-container vq-section">
        {/* Large watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-8 bottom-8 select-none font-display font-semibold leading-none"
          style={{
            fontSize: 'clamp(5rem, 14vw, 13rem)',
            color: 'rgba(55,199,154,0.045)',
            letterSpacing: '-0.04em',
          }}
        >
          Velquira
        </div>

        {/* Vertical rule */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d9c7a0]/20 to-transparent"
        />

        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <div className="mb-12 md:mb-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">About Us</p>
              <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-cream">
                Jewellery that lasts a lifetime. <span className="text-gold">✦</span>
              </h2>
              <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="max-w-xl text-[15px] leading-[1.85] text-white/72 md:text-base">
              Every Velquira piece starts as a sketch in our Mumbai studio — then goes through
              hundreds of hours of hand-setting, polishing, and checking before it reaches
              you. We only use hallmarked gold and certified stones, because jewellery this good
              deserves nothing less.
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.85] text-white/55 md:text-base">
              This isn't fast fashion for your wrist. It's made to be passed
              down, not thrown away.
            </p>

            <Link
              href={ROUTES.about}
              className="group/cta mt-10 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d9c7a0] transition-colors duration-300 hover:text-[#d9c7a0]"
            >
              <span className="relative pb-1.5">
                Our story
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-75 bg-[#d9c7a0]/50 transition-transform duration-500 ease-out group-hover/cta:scale-x-105 group-hover/cta:bg-[#d9c7a0]"
                />
              </span>
              <ArrowRight
                size={13}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover/cta:translate-x-2"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom separator */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d9c7a0]/40 to-transparent" />
    </section>
  )
}
