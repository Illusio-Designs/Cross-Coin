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
 * HeroBanner — quiet full-bleed slider.
 *
 * One image fills the viewport. Tiny editorial copy sits in the
 * bottom-left over a soft warm gradient. Thin dash pagination at the
 * bottom-center. Slides crossfade slowly. No ornaments, no counter,
 * no rotated wordmarks — just photograph + refined type.
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
        categoryName: 'Velquira',
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

  const eyebrow = slide.categoryName || 'Velquira'

  const imageInitial = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }
  const imageAnimate = reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
  const imageExit    = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Velquira fine jewellery editorial"
      className="relative isolate overflow-hidden bg-brand-black text-white min-h-[78vh] md:min-h-[88vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Image — slow Ken Burns crossfade */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.id ?? safe}
          className="absolute inset-0"
          initial={imageInitial}
          animate={imageAnimate}
          exit={imageExit}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <Image
            src={slide.image || FALLBACK_IMAGE}
            alt={slide.title || 'Velquira fine jewellery'}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>
      </AnimatePresence>

      {/* Warm gradient — legibility for bottom-left copy */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-black/65 via-brand-black/15 to-transparent"
      />

      {/* Editorial copy — bottom-left */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 md:pb-24 lg:px-20 lg:pb-28">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`txt-${safe}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
              className="max-w-2xl"
            >
              {/* Eyebrow */}
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
                {eyebrow}
              </p>

              {/* Title */}
              {slide.title && (
                <h1
                  className="mt-5 font-display text-4xl font-normal leading-[1.04] tracking-tight text-white md:text-5xl lg:text-6xl"
                  style={{ textWrap: 'balance' }}
                >
                  {slide.title}
                </h1>
              )}

              {/* Description */}
              {slide.description && (
                <p className="mt-5 max-w-md text-[14px] leading-relaxed text-white/75 md:text-[15px]">
                  {slide.description}
                </p>
              )}

              {/* CTA — refined gold link */}
              <Link
                href={buttonHref}
                className="group/cta mt-8 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors duration-200 hover:text-gold-light"
              >
                <span className="relative pb-1.5">
                  {slide.buttonText || 'Discover the edit'}
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 h-px w-full origin-left bg-gold transition-transform duration-500 ease-out group-hover/cta:scale-x-110"
                  />
                </span>
                <ArrowRight
                  size={13}
                  strokeWidth={1.7}
                  className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1.5"
                />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination — thin dashes, bottom-center */}
      {list.length > 1 && (
        <div className="absolute inset-x-0 bottom-7 z-20 flex justify-center md:bottom-10">
          <div
            role="tablist"
            aria-label="Slide navigation"
            className="flex items-center gap-3"
          >
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
                  className="group/dash relative h-4 w-7 cursor-pointer focus-visible:outline-none"
                >
                  <span
                    className={`pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-all duration-500 ease-out ${
                      active
                        ? 'bg-gold'
                        : 'bg-white/35 group-hover/dash:bg-white/70'
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