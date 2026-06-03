'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/* ---------------------------------------------------------------- */
/* Lightbox — warm ivory ground, espresso backdrop, gold accents    */
/* ---------------------------------------------------------------- */
function Lightbox({ images, startIndex, productName, onClose }) {
  const [active, setActive] = useState(startIndex)
  const scrollRef = useRef(null)
  const imgRefs = useRef([])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    const el = imgRefs.current[startIndex]
    if (el) el.scrollIntoView({ block: 'start' })
  }, [startIndex])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index)
            if (!isNaN(idx)) setActive(idx)
          }
        })
      },
      { root: container, threshold: 0.5 }
    )
    imgRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [images.length])

  const scrollToImage = (i) => {
    setActive(i)
    imgRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483647 }}>
      {/* Espresso backdrop with subtle blur */}
      <div className="absolute inset-0 bg-brand-black/45 backdrop-blur-sm" onClick={onClose} />

      {/* Warm-ivory stage */}
      <div className="relative flex h-full w-full flex-col bg-ivory">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-white text-gold transition-colors hover:border-gold hover:bg-gold hover:text-white"
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.6} />
        </button>

        {/* Counter */}
        <span className="absolute left-6 top-6 z-10 font-display italic text-[14px] tracking-[0.2em] text-gold">
          {String(active + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>

        {/* Scrollable image stack */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 md:px-10">
            {images.map((img, i) => (
              <div
                key={i}
                ref={(el) => { imgRefs.current[i] = el }}
                data-index={i}
                className="w-full"
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${i + 1}`}
                  className="w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gold-ringed thumb rail — bottom */}
        <div className="border-t border-gold/15 bg-ivory/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => scrollToImage(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-md bg-cream transition-all ${
                  i === active
                    ? 'ring-1 ring-gold ring-offset-2 ring-offset-ivory'
                    : 'border border-gold/20 opacity-60 hover:opacity-100'
                }`}
                aria-label={`Image ${i + 1}`}
              >
                <img src={img.url} alt={`${productName} ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ---------------------------------------------------------------- */
/* Main gallery — vertical thumb rail + large clean main image      */
/* ---------------------------------------------------------------- */
export function ProductGallery({ images, colorImages, activeColorName, productName }) {
  const resolvedImages =
    activeColorName && colorImages?.[activeColorName]?.length
      ? colorImages[activeColorName]
      : images

  const [selected, setSelected] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxStart, setLightboxStart] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setSelected(0) }, [activeColorName])

  if (!resolvedImages?.length) return <div className="aspect-square bg-cream" />

  const openLightbox = (index) => {
    setLightboxStart(index)
    setLightboxOpen(true)
  }

  const main = resolvedImages[selected] ?? resolvedImages[0]

  return (
    <div className="relative">
      {/* DESKTOP: vertical thumb rail + main image side by side */}
      <div className="flex gap-4 md:gap-5">
        {/* Vertical thumb rail (desktop only) */}
        {resolvedImages.length > 1 && (
          <div className="hidden w-20 shrink-0 flex-col gap-3 md:flex">
            {resolvedImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                aria-label={`View image ${i + 1}`}
                className={`h-16 w-16 overflow-hidden rounded-md bg-cream transition-all ${
                  i === selected
                    ? 'ring-1 ring-gold ring-offset-2 ring-offset-ivory'
                    : 'border border-gold/20 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main image — clean warm bed, no frame */}
        <div className="relative flex-1 min-w-0">
          <div
            className="group relative overflow-hidden rounded-xl bg-cream"
            style={{ cursor: 'zoom-in' }}
            onClick={() => openLightbox(selected)}
          >
            <img
              src={main?.url}
              alt={main?.alt || productName}
              className="w-full object-contain min-h-[360px] p-8 transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03] sm:min-h-[440px] md:min-h-[520px] lg:min-h-[520px]"
            />

            {/* Click to zoom hint — bottom right */}
            <span className="pointer-events-none absolute bottom-3 right-4 font-display italic text-[12px] tracking-wide text-gold/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              click to zoom
            </span>
          </div>
        </div>
      </div>

      {/* MOBILE: horizontal thumb row */}
      {resolvedImages.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 md:hidden">
          {resolvedImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-md bg-cream transition-all ${
                i === selected
                  ? 'ring-1 ring-gold ring-offset-2 ring-offset-ivory'
                  : 'border border-gold/20 opacity-70'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt || `${productName} ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {mounted && lightboxOpen && (
        <Lightbox
          images={resolvedImages}
          startIndex={lightboxStart}
          productName={productName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}