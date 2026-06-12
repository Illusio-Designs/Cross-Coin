'use client'

import Link from 'next/link'
import { ShimmerImg } from '@/components/ui/ShimmerImg'

function cleanImg(url) {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

export function CategoryCards({ categories = [] }) {
  if (!categories.length) {
    return (
      <div className="grid grid-cols-2 gap-3 px-3 py-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-200 md:aspect-auto md:min-h-[320px] lg:min-h-[400px]"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-3 py-3 md:grid-cols-4">
      {categories.slice(0, 4).map((c) => {
        const img = cleanImg(c.image)
        const href = `/products?category=${encodeURIComponent(c.name.trim())}`
        return (
          <Link
            key={c.id}
            href={href}
            className="group relative overflow-hidden rounded-2xl aspect-[3/4] md:aspect-auto md:min-h-[320px] lg:min-h-[400px]"
          >
            {img
              ? <ShimmerImg
                  src={img}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              : <div className="absolute inset-0 bg-gray-200" />
            }
            <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/45" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <span className="rounded-full border border-white/60 bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white text-center backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-2 sm:px-4 sm:text-[11px]">
                {c.name.trim()}
              </span>
              <span className="translate-y-3 rounded-full bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-black opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:px-6 sm:py-2 sm:text-[11px]">
                Shop Now
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
