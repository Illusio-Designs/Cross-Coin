'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublicCategories } from '@/lib/api/categories'

function cleanImg(url) {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

export default function CollectionsPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-black" style={{ minHeight: 380 }}>
        <img
          src="/collection hero.jpg"
          alt="Collections"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 to-transparent" />
        <div className="relative flex h-full min-h-[380px] flex-col items-start justify-end px-6 pb-10 md:px-10">
          <h1 className="text-3xl font-bold text-white lg:text-4xl">Our Collections</h1>
          <p className="mt-2 text-sm text-white/50">
            Explore our range of premium knitwear designed for comfort and style.
          </p>
        </div>
      </section>

      {/* Collections grid */}
      <div className="bg-off-white px-4 py-10 md:px-6">
        {loading ? (
          <div className="mx-auto grid max-w-site grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="py-20 text-center text-sm text-gray-400">No collections yet.</p>
        ) : (
          <div className="mx-auto grid max-w-site grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map(c => {
              const img = cleanImg(c.image)
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${encodeURIComponent(c.name.trim())}`}
                  className="group relative overflow-hidden rounded-2xl"
                  style={{ minHeight: 380 }}
                >
                  {img
                    ? <img src={img} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="absolute inset-0 bg-gray-200" />
                  }
                  <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/40" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
                    <span className="rounded-full border border-white/60 bg-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-2">
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
        )}
      </div>
    </>
  )
}
