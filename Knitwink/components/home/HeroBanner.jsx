'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShimmerImg } from '@/components/ui/ShimmerImg'

const SLIDE_DURATION = 5000

// Frontend mirror of the backend category-slug rule (same as Crosscoin's
// collectionUrl) so a slide routes to a clean /collections/<slug> URL instead
// of a URL-encoded category name.
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[®™©]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Build the redirect target for a slide from its linked category/collection.
// Priority: explicit buttonLink → category slug → slugified category name →
// collections index. Mirrors the Crosscoin hero-slider behaviour.
function slideHref(slide) {
  if (slide.buttonLink) return slide.buttonLink
  const slug = slide.categorySlug || slide.category?.slug || slugify(slide.categoryName || slide.category?.name)
  return slug ? `/collections/${slug}` : '/collections'
}

export function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef(null)
  const progressRef = useRef(null)

  const goTo = useCallback((i) => { setCurrent(i); setProgress(0) }, [])
  const next = useCallback(() => { setCurrent((c) => (c + 1) % slides.length); setProgress(0) }, [slides.length])

  useEffect(() => { setCurrent(0); setProgress(0) }, [slides.length])

  useEffect(() => {
    if (paused) return
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (SLIDE_DURATION / 50), 100))
    }, 50)
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [current, paused])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    intervalRef.current = setInterval(next, SLIDE_DURATION)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [next, paused, slides.length])

  if (slides.length === 0) {
    return (
      <section className="">
        <div className="min-h-[88vh] animate-pulse rounded-2xl bg-gray-200" />
      </section>
    )
  }

  const slide = slides[current]
  const buttonHref = slideHref(slide)

  return (
    <section
      className=""
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex min-h-[66vh] items-end justify-start bg-gray-900 sm:min-h-[70vh] md:min-h-[88vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            {/* Full-bleed banner — fills the whole (taller) hero at full height
                and width. */}
            <ShimmerImg
              src={slide.image}
              alt={slide.title || 'Banner'}
              shimmerClassName="bg-gray-800"
              className="absolute inset-0 h-full w-full object-cover object-top sm:object-center"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 via-brand-black/10 to-transparent" />

        <div className="relative z-10 max-w-xl p-4 pb-14 sm:p-8 sm:pb-12 md:max-w-2xl md:p-14 lg:max-w-3xl lg:p-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="inline-block rounded-2xl bg-brand-black/25 p-4 backdrop-blur-md sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
            >
              {slide.title && (
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/70 sm:mb-3 sm:text-xs">{slide.title}</p>
              )}
              {slide.description && (
                <h1 className="whitespace-pre-line font-display text-lg font-normal leading-[1.15] tracking-tight text-white drop-shadow-sm sm:text-2xl md:text-4xl lg:text-5xl">
                  {slide.description}
                </h1>
              )}
              <div style={{ marginTop: 'calc(var(--spacing) * 4)', marginBottom: 'calc(var(--spacing) * 2)' }}>
                <Link
                  href={buttonHref}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-brand-black transition-colors hover:bg-off-white sm:px-7 sm:py-3 sm:text-sm"
                >
                  {slide.buttonText || 'Shop Now'}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-5 pb-4 sm:gap-4 sm:px-8 sm:pb-6 md:px-14 lg:px-20">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`no-touch-min h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
          <div className="flex-1 h-[2px] rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-none" style={{ width: `${progress}%` }} />
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play' : 'Pause'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-white hover:border-white"
          >
            {paused
              ? <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0l10 6-10 6V0z" /></svg>
              : <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><rect x="0" y="0" width="3" height="12" /><rect x="7" y="0" width="3" height="12" /></svg>
            }
          </button>
        </div>
      </div>
    </section>
  )
}
