'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/* ---------------------------------------------------------------- */
/* Lightbox — clean cream ground, neutral scrim, hairline accents    */
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
      {/* Neutral scrim with subtle blur */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* Cream stage */}
      <div className="relative flex h-full w-full flex-col bg-cream">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-all duration-300 hover:border-ink hover:bg-ink hover:text-cream"
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.6} />
        </button>

        {/* Counter */}
        <span className="absolute left-6 top-6 z-10 text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
          {String(active + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>

        {/* Scrollable image stack */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16 md:px-10">
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

        {/* Thumb rail — bottom, borderless */}
        <div className="border-t border-line bg-cream/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => scrollToImage(i)}
                className="group shrink-0"
                aria-label={`Image ${i + 1}`}
              >
                <span className="block h-14 w-14 overflow-hidden bg-paper">
                  <img
                    src={img.url}
                    alt={`${productName} ${i + 1}`}
                    className={`h-full w-full object-contain p-1 transition-opacity duration-300 ${
                      i === active ? 'opacity-100' : 'opacity-50 group-hover:opacity-90'
                    }`}
                  />
                </span>
                <span
                  className={`mt-2 block h-px w-full transition-colors duration-300 ${
                    i === active ? 'bg-ink' : 'bg-transparent'
                  }`}
                  aria-hidden
                />
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
/* Main gallery — large image on a soft bed + thumb row underneath   */
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
      {/* Main image — soft cream bed, generous padding, nothing cropped */}
      <div
        className="group relative overflow-hidden bg-cream"
        style={{ cursor: 'zoom-in' }}
        onClick={() => openLightbox(selected)}
      >
        <img
          src={main?.url}
          alt={main?.alt || productName}
          className="w-full object-contain p-8 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04] sm:p-12 md:p-16"
          style={{ minHeight: 'clamp(360px, 46vw, 660px)', maxHeight: 720 }}
        />

        {/* Zoom hint */}
        <span className="pointer-events-none absolute bottom-5 right-6 text-[9px] font-semibold uppercase tracking-[0.3em] text-text-faint opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          Click to zoom
        </span>
      </div>

      {/* Thumbnail row — under the main image, borderless, active underline */}
      {resolvedImages.length > 1 && (
        <div className="mt-5 flex gap-4 overflow-x-auto pb-1 md:gap-6">
          {resolvedImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              className="group shrink-0"
            >
              <span className="block h-[68px] w-[68px] overflow-hidden bg-cream md:h-20 md:w-20">
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${i + 1}`}
                  className={`h-full w-full object-contain p-2 transition-opacity duration-300 ${
                    i === selected ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'
                  }`}
                />
              </span>
              <span
                className={`mt-2 block h-px w-full transition-colors duration-300 ${
                  i === selected ? 'bg-ink' : 'bg-line group-hover:bg-text-muted'
                }`}
                aria-hidden
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
