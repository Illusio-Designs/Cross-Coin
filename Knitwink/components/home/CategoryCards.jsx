'use client'

import Link from 'next/link'

function cleanImg(url) {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

export function CategoryCards({ categories = [] }) {
  if (!categories.length) return null

  return (
    <div className="flex gap-3 px-3 py-3">
      {categories.slice(0, 4).map((c) => {
        const img = cleanImg(c.image)
        const href = `/collections?category=${encodeURIComponent(c.name.trim())}`
        return (
          <Link
            key={c.id}
            href={href}
            className="group relative flex-1 overflow-hidden rounded-2xl"
            style={{ minHeight: 400 }}
          >
            {img
              ? <img src={img} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              : <div className="absolute inset-0 bg-gray-200" />
            }
            <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/45" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <span className="rounded-full border border-white/60 bg-white/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white text-center backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-2">
                {c.name.trim()}
              </span>
              <span className="translate-y-3 rounded-full bg-white px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-brand-black opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                Shop Now
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
