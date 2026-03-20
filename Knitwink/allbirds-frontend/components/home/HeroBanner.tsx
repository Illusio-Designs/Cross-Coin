'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80',
    alt: 'Allbirds Dasher NZ — person walking in city',
    collection: 'The Dasher Collection',
    headline: 'Ready. Set.\nTake your time.',
    menHref: '/collections/mens',
    womenHref: '/collections/womens',
  },
  {
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1600&q=80',
    alt: 'Allbirds Tree Runner — lightweight everyday shoe',
    collection: 'The Tree Runner',
    headline: 'Light as air.\nEasy as Sunday.',
    menHref: '/collections/mens',
    womenHref: '/collections/womens',
  },
  {
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1600&q=80',
    alt: 'Allbirds Wool Runner — natural merino wool shoe',
    collection: 'The Wool Runner',
    headline: 'Feel good\nin every step.',
    menHref: '/collections/mens',
    womenHref: '/collections/womens',
  },
]

const SLIDE_DURATION = 5000 // ms per slide

export function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((index: number) => {
    setCurrent(index)
    setProgress(0)
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length)
    setProgress(0)
  }, [])

  // Progress bar tick
  useEffect(() => {
    if (paused) return
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (SLIDE_DURATION / 50), 100))
    }, 50)
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [current, paused])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    intervalRef.current = setInterval(next, SLIDE_DURATION)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [next, paused])

  const slide = SLIDES[current]

  return (
    <section
      className="mx-2 mt-2 overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex min-h-[88vh] items-end justify-start bg-gray-900">
        {/* Slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority={current === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 via-brand-black/10 to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-8 md:p-14 lg:p-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/70">
                {slide.collection}
              </p>
              <h1 className="whitespace-pre-line font-display text-5xl font-normal tracking-tight text-white md:text-6xl lg:text-7xl">
                {slide.headline}
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={slide.menHref}
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium uppercase tracking-wider text-brand-black transition-colors duration-150 hover:bg-off-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
                >
                  Shop Men
                </Link>
                <Link
                  href={slide.womenHref}
                  className="inline-flex items-center justify-center rounded-full border border-white px-7 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
                >
                  Shop Women
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom controls row */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-4 px-8 pb-6 md:px-14 lg:px-20">
          {/* Slide dot indicators */}
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  i === current ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="flex-1 h-[2px] rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Pause/play button */}
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-white transition-colors duration-150 hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {paused ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <path d="M0 0l10 6-10 6V0z" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <rect x="0" y="0" width="3" height="12" />
                <rect x="7" y="0" width="3" height="12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
