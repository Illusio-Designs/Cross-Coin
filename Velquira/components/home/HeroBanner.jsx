'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { JEWELLERY_CATEGORIES } from '@/lib/constants'

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
 * HeroBanner — Celestique-style taupe stage.
 * Oversized serif wordmark over the campaign image, a collection note with a
 * black pill CTA, and a hairline category index. Slides cross-fade behind.
 */
export function HeroBanner({ slides = [] }) {
  const reducedMotion = usePrefersReducedMotion()

  const list = useMemo(() => {
    if (slides && slides.length > 0) return slides
    return [
      {
        id: 'fallback',
        title: 'A celestial touch for timeless moments',
        description:
          'Discover exquisite jewellery inspired by light — each piece crafted to bring elegance to your most cherished occasions.',
        buttonText: 'Discover',
        image: FALLBACK_IMAGE,
        ctaHref: '/collections',
        categoryName: 'Collection 2025',
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

  const cats = (JEWELLERY_CATEGORIES || []).slice(0, 4)

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Velquira fine jewellery"
      className="px-3 pt-3 md:px-5 md:pt-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative isolate flex min-h-[74vh] flex-col justify-between overflow-hidden rounded-[26px] p-6 text-cream md:p-10 lg:p-12"
        style={{ background: 'linear-gradient(155deg,#b4a894 0%,#a1947f 100%)' }}
      >
        {/* campaign image */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id ?? safe}
            className="absolute inset-0 -z-10"
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: EASE }}
          >
            <Image
              src={slide.image || FALLBACK_IMAGE}
              alt={slide.title || 'Velquira fine jewellery'}
              fill
              priority
              sizes="100vw"
              className={`object-cover ${reducedMotion ? '' : 'vq-kenburns'}`}
            />
          </motion.div>
        </AnimatePresence>
        {/* light warm veils — keep the photo crisp, type legible top & bottom */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[rgba(150,137,120,0.28)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgba(45,37,25,0.42)] via-transparent to-[rgba(30,24,15,0.55)]" />

        {/* ── Top: wordmark + subhead ─────────────────────────────── */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <h1 className="vq-display leading-[0.86] text-cream" style={{ fontSize: 'clamp(3.4rem,9vw,8rem)', letterSpacing: '0.005em' }}>
            Velquira<span className="ml-2 align-top text-[0.32em] text-gold-bright">✦</span>
          </h1>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`sub-${safe}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="max-w-[16rem] font-display text-[13px] uppercase leading-[1.6] tracking-[0.16em] text-cream/90 md:pt-4 md:text-right"
            >
              {slide.title || 'A celestial touch for timeless moments'}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Bottom: collection note + category index ─────────────── */}
        <div className="mt-auto flex flex-col gap-8 pt-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cream/70">
              {slide.categoryName || 'Collection 2025'}
            </p>
            {slide.description && (
              <p className="mt-4 max-w-xs text-[13px] leading-[1.75] text-cream/85">
                {slide.description}
              </p>
            )}
            <Link
              href={buttonHref}
              className="group/cta mt-7 inline-flex items-center gap-3 rounded-full bg-[#1e1912] px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-400 hover:-translate-y-0.5 hover:bg-black"
            >
              {slide.buttonText || 'Discover'}
              <ArrowRight size={13} strokeWidth={2} className="transition-transform duration-300 group-hover/cta:translate-x-1" />
            </Link>
          </div>

          <div className="w-full max-w-[240px]">
            {cats.map((c) => (
              <Link
                key={c.href || c.label}
                href={c.href || `/products?category=${encodeURIComponent(c.label)}`}
                className="group/cat flex items-center justify-between border-t border-cream/25 py-3 text-[12px] uppercase tracking-[0.18em] text-cream/90 transition-all duration-300 hover:pl-2 hover:text-cream"
              >
                {c.label}
                <ArrowRight size={13} strokeWidth={1.6} className="transition-transform duration-300 group-hover/cat:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>

        {/* slide dots */}
        {list.length > 1 && (
          <div role="tablist" aria-label="Slide navigation" className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 md:bottom-6">
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
                  className={`h-1.5 rounded-full transition-all duration-500 ${active ? 'w-6 bg-cream' : 'w-1.5 bg-cream/50 hover:bg-cream/80'}`}
                />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
