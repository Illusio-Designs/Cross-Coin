'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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

  // Scroll to start image on open
  useEffect(() => {
    const el = imgRefs.current[startIndex]
    if (el) el.scrollIntoView({ block: 'start' })
  }, [startIndex])

  // Track which image is in view while scrolling
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Full screen */}
      <div className="relative flex h-full w-full bg-[#f5f5f0]">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-black shadow-md hover:bg-gray-100 transition-colors"
          style={{ zIndex: 10 }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Thumbnail rail — left, aligned to bottom */}
        <div className="hidden w-24 shrink-0 flex-col justify-end gap-2 overflow-y-auto px-3 py-5 md:flex">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => scrollToImage(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === active ? 'border-brand-black' : 'border-transparent opacity-40 hover:opacity-70'
              }`}
            >
              <img src={img.url} alt={`${productName} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        {/* Scrollable images — full width */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-2 px-4 py-6 md:px-10">
            {images.map((img, i) => (
              <div
                key={i}
                ref={(el) => { imgRefs.current[i] = el }}
                data-index={i}
                className="w-full max-w-2xl"
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
      </div>
    </div>,
    document.body
  )
}

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

  if (!resolvedImages?.length) return <div className="aspect-square rounded-2xl bg-gray-100" />

  const openLightbox = (index) => {
    setLightboxStart(index)
    setLightboxOpen(true)
  }

  const main = resolvedImages[selected] ?? resolvedImages[0]
  const rest = resolvedImages.filter((_, i) => i !== selected)

  return (
    <div className="flex flex-col gap-2">
      {/* Main large image — custom + cursor */}
      <div
        className="group relative overflow-hidden rounded-2xl bg-gray-50"
        style={{ cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'48\' viewBox=\'0 0 48 48\'%3E%3Ccircle cx=\'24\' cy=\'24\' r=\'22\' fill=\'white\' stroke=\'%230a0a0a\' stroke-width=\'0.8\'/%3E%3Cline x1=\'24\' y1=\'15\' x2=\'24\' y2=\'33\' stroke=\'%230a0a0a\' stroke-width=\'0.8\' stroke-linecap=\'round\'/%3E%3Cline x1=\'15\' y1=\'24\' x2=\'33\' y2=\'24\' stroke=\'%230a0a0a\' stroke-width=\'0.8\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 24 24, pointer' }}
        onClick={() => openLightbox(selected)}
      >
        <img
          src={main?.url}
          alt={main?.alt || productName}
          className="w-full object-contain"
          style={{ minHeight: 420 }}
        />
      </div>

      {/* Grid of remaining images — 2 columns, same + cursor */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {rest.map((img, i) => {
            const realIndex = resolvedImages.indexOf(img)
            return (
              <div
                key={i}
                className="overflow-hidden rounded-xl bg-gray-50"
                style={{ cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'48\' viewBox=\'0 0 48 48\'%3E%3Ccircle cx=\'24\' cy=\'24\' r=\'22\' fill=\'white\' stroke=\'%230a0a0a\' stroke-width=\'0.8\'/%3E%3Cline x1=\'24\' y1=\'15\' x2=\'24\' y2=\'33\' stroke=\'%230a0a0a\' stroke-width=\'0.8\' stroke-linecap=\'round\'/%3E%3Cline x1=\'15\' y1=\'24\' x2=\'33\' y2=\'24\' stroke=\'%230a0a0a\' stroke-width=\'0.8\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 24 24, pointer' }}
                onClick={() => openLightbox(realIndex)}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${i + 2}`}
                  className="aspect-square w-full object-contain"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox popup */}
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
