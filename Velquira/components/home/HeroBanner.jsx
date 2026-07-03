'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDE_DURATION = 7000
const EASE = [0.22, 0.65, 0.3, 1]

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1800'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

/**
 * HeroBanner — cinematic editorial hero.
 * Full-bleed photography, oversized split display type, gold vertical
 * rule, and a quiet bottom caption column. Navbar floats over this band.
 */
export function HeroBanner({ slides = [] }) {
  const reducedMotion = usePrefersReducedMotion()

  const list = useMemo(() => {
    if (slides && slides.length > 0) return slides
    return [
      {
        id: 'fallback',
        title: 'Where Light Becomes Heirloom',
        description:
          'Handcrafted in our atelier — 18k gold and certified diamonds.',
        buttonText: 'Discover the edit',
        image: FALLBACK_IMAGE,
        ctaHref: '/collections',
        categoryName: 'Velquira Atelier',
      },
    ]
  }, [slides])

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef(null)

  const safe = list.length ? current % list.length : 0
  const slide = list[safe]

  const goTo = useCallback((i) => setCurrent(i), [])
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % list.length),
    [list.length],
  )

  useEffect(() => {
    if (paused || list.length <= 1 || reducedMotion) return
    intervalRef.current = setInterval(next, SLIDE_DURATION)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [next, paused, list.length, reducedMotion])

  const buttonHref =
    slide.ctaHref ||
    slide.buttonLink ||
    (slide.categoryName
      ? `/products?category=${encodeURIComponent(slide.categoryName)}`
      : '/collections')

  const titleParts = (slide.title || 'Where Light Becomes Heirloom').split(/\s+(?=\S+$)/)
  const titleLead = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : slide.title
  const titleAccent = titleParts.length > 1 ? titleParts[titleParts.length - 1] : null

  const imageInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.08 }
  const imageAnimate = reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
  const imageExit = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Velquira fine jewellery editorial"
      className="vq-bleed relative isolate min-h-[92vh] overflow-hidden bg-brand-black text-white md:min-h-[96vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.id ?? safe}
          className="absolute inset-0"
          initial={imageInitial}
          animate={imageAnimate}
          exit={imageExit}
          transition={{ duration: 1.4, ease: EASE }}
        >
          <Image
            src={slide.image || FALLBACK_IMAGE}
            alt={slide.title || 'Velquira fine jewellery'}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_20%]"
          />
        </motion.div>
      </AnimatePresence>

      {/* Layered vignettes — spotlight on piece */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,transparent_0%,rgba(28,23,12,0.55)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-black/80 via-brand-black/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-black/70 via-transparent to-brand-black/30"
      />

      {/* Vertical gold rule — signature motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[8%] top-[18%] hidden h-[52%] w-px bg-gradient-to-b from-transparent via-gold/70 to-transparent md:block lg:left-[12%]"
      />

      {/* Oversized split headline */}
      <div className="relative z-10 flex min-h-[92vh] flex-col justify-end md:min-h-[96vh] md:justify-center">
        <div className="mx-auto w-full max-w-[1480px] px-6 pb-24 md:px-12 md:pb-0 lg:px-20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`txt-${safe}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16"
            >
              <div className="lg:col-span-7">
                <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-gold">
                  {slide.categoryName || 'Velquira Atelier'}
                </p>

                <h1 className="vq-display mt-6 text-[clamp(2.75rem,8vw,5.5rem)] text-white">
                  {titleLead && (
                    <span className="block">{titleLead}</span>
                  )}
                  {titleAccent && (
                    <span className="mt-1 block italic text-gold-light">{titleAccent}</span>
                  )}
                  {!titleAccent && slide.title && (
                    <span className="block">{slide.title}</span>
                  )}
                </h1>
              </div>

              <div className="flex flex-col justify-end lg:col-span-5 lg:pb-4">
                {slide.description && (
                  <p className="max-w-sm text-[14px] leading-[1.8] text-white/72 md:text-[15px]">
                    {slide.description}
                  </p>
                )}

                <Link
                  href={buttonHref}
                  className="group/cta mt-8 inline-flex items-center gap-3 self-start rounded-full border border-gold/50 bg-gold/10 px-6 py-3.5 text-[10px] font-medium uppercase tracking-[0.28em] text-gold backdrop-blur-sm transition-all duration-300 hover:border-gold hover:bg-gold hover:text-brand-black"
                >
                  {slide.buttonText || 'Discover the edit'}
                  <ArrowRight
                    size={13}
                    strokeWidth={1.7}
                    className="transition-transform duration-300 group-hover/cta:translate-x-1"
                  />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {list.length > 1 && (
        <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center md:bottom-12">
          <div role="tablist" aria-label="Slide navigation" className="flex items-center gap-4">
            {list.map((_, i) => {
              const active = i === safe
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className="group/dash relative h-5 w-8 cursor-pointer focus-visible:outline-none"
                >
                  <span
                    className={`pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-all duration-500 ${
                      active ? 'bg-gold' : 'bg-white/30 group-hover/dash:bg-white/65'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
