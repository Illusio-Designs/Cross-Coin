'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPublicCategories } from '@/lib/api/categories'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'

/* Strip duplicated `https://` prefixes that occasionally appear in image fields. */
function cleanImg(url) {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

// Editorial fallback imagery — rotates by index when a category has no image.
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200',
]

/**
 * CollectionsPage — the dedicated /collections route.
 *
 * Minimal editorial header (eyebrow + Playfair title + intro + thin
 * gold rule) above a clean grid of premium category cards. Same card
 * pattern as the homepage CategoryCards / ProductCard so the site
 * coheres. No Roman numerals, no rotated ornaments.
 */
export default function CollectionsPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCategories()
      .then((c) => setCategories(Array.isArray(c) ? c : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SeoWrapper pageName="categories">
      <main className="bg-ivory">
        {/* Editorial page header */}
        <section className="px-4 pt-20 pb-12 text-center md:pt-28 md:pb-16 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                Collections
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-4 font-display text-4xl font-normal leading-[1.05] tracking-tight text-brand-black md:text-6xl">
                The Velquira House
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
                Edits drawn from the same bench, the same eye — composed and finished by hand at the atelier.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
            </Reveal>
          </div>
        </section>

        {/* Category grid */}
        <section className="px-4 pb-24 md:pb-32 lg:px-8">
          <div className="mx-auto max-w-[1320px]">
            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-gold/20 bg-white p-3"
                  >
                    <div className="aspect-[3/4] animate-pulse rounded-xl bg-cream" />
                    <div className="mt-4 mx-auto h-3 w-1/2 animate-pulse rounded bg-cream" />
                    <div className="mt-2 mx-auto h-2.5 w-1/4 animate-pulse rounded bg-cream" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <Reveal>
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
                  <span className="inline-block h-px w-12 bg-gold/60" aria-hidden />
                  <p className="font-display text-2xl italic text-brand-black">
                    No collections published yet.
                  </p>
                  <p className="text-[14px] leading-relaxed text-brand-black/55">
                    New houses will be added to the catalogue shortly.
                  </p>
                </div>
              </Reveal>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {categories.map((c, i) => {
                  const name = (c.name || '').trim()
                  const img = cleanImg(c.image) || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]
                  const href = `/products?category=${encodeURIComponent(name)}`
                  const productCount = c.productCount ?? c.product_count

                  return (
                    <Reveal key={c.id || c.slug || name || i} delay={i * 0.05}>
                      <Link
                        href={href}
                        className="group flex flex-col rounded-2xl border border-gold/20 bg-white p-3 transition-[border-color,box-shadow] duration-300 hover:border-gold/55 hover:shadow-[0_22px_45px_-26px_rgba(143,102,32,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-cream">
                          <Image
                            src={img}
                            alt={name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        </div>

                        <div className="mt-3.5 px-1 pb-1 text-center">
                          <p className="font-display text-[16px] leading-tight text-brand-black">
                            {name}
                          </p>
                          {typeof productCount === 'number' && productCount > 0 && (
                            <p className="mt-0.5 text-[11px] italic text-brand-black/45">
                              {productCount} {productCount === 1 ? 'piece' : 'pieces'}
                            </p>
                          )}
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.28em] text-gold transition-colors duration-200 group-hover:text-gold-deep">
                            Shop
                            <ArrowRight
                              size={10}
                              strokeWidth={1.7}
                              className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                          </p>
                        </div>
                      </Link>
                    </Reveal>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Closing — view all link */}
        {!loading && categories.length > 0 && (
          <section className="px-4 pb-24 text-center md:pb-32 lg:px-8">
            <Reveal>
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-brand-black/70 transition-colors duration-200 hover:text-gold"
              >
                <span className="relative pb-1">
                  Browse every piece
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-500 ease-out group-hover:scale-x-100"
                  />
                </span>
                <ArrowRight
                  size={12}
                  strokeWidth={1.7}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </Reveal>
          </section>
        )}
      </main>
    </SeoWrapper>
  )
}