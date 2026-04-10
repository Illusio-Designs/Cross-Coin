'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDE_DURATION = 5000

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
    if (paused || slides.length <= 1) return
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (SLIDE_DURATION / 50), 100))
    }, 50)
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [current, paused, slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    intervalRef.current = setInterval(next, SLIDE_DURATION)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [next, paused, slides.length])

  if (slides.length === 0) {
    return (
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl">
        <div className="min-h-[88vh] animate-pulse rounded-2xl bg-gray-200" />
      </section>
    )
  }

  const slide = slides[current]
  const buttonHref = slide.buttonLink || (slide.categoryName ? `/collections/${encodeURIComponent(slide.categoryName)}` : '/collections')

  return (
    <section
      className="mx-2 mt-2 overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex min-h-[88vh] items-end justify-start bg-gray-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt={slide.title || 'Banner'} className="absolute inset-0 h-full w-full object-cover object-center" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 via-brand-black/10 to-transparent" />

        <div className="relative z-10 p-8 md:p-14 lg:p-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {slide.title && (
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/70">{slide.title}</p>
              )}
              {slide.description && (
                <h1 className="whitespace-pre-line font-display text-5xl font-normal tracking-tight text-white md:text-6xl lg:text-7xl">
                  {slide.description}
                </h1>
              )}
              <div className="mt-8">
                <Link
                  href={buttonHref}
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium uppercase tracking-wider text-brand-black transition-colors hover:bg-off-white"
                >
                  {slide.buttonText || 'Shop Now'}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-4 px-8 pb-6 md:px-14 lg:px-20">
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
            <div className="flex-1 h-[2px] rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
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
        )}
      </div>
    </section>
  )
}
