'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPublicCategories } from '@/lib/api/categories'
import { PageHero } from '@/components/layout/PageHero'
import SeoWrapper from '@/components/SeoWrapper'

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

/* Borderless image tile — rounded, dark gradient, serif name + Explore. */
function CategoryTile({ name, img, href, sizes, featured = false, className = '' }) {
  return (
    <Link
      href={href}
      className={`group relative block h-full overflow-hidden rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${className}`}
    >
      <div className="relative h-full overflow-hidden bg-paper">
        <Image
          src={img}
          alt={name}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#211b12]/85 via-[#211b12]/25 to-transparent"
        />

        <div className={`absolute inset-x-0 bottom-0 z-10 ${featured ? 'p-7 md:p-10' : 'p-5 md:p-6'}`}>
          <p
            className={`vq-display leading-tight text-cream ${
              featured ? 'text-[clamp(1.8rem,3.2vw,2.75rem)]' : 'text-2xl md:text-[26px]'
            }`}
          >
            {name}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-px w-6 bg-gold/70 transition-all duration-500 group-hover:w-10" />
            <p className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.32em] text-gold/90">
              Explore
              <ArrowRight
                size={10}
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

/**
 * CollectionsPage — the dedicated /collections route.
 *
 * Borderless editorial tiles. With 3+ categories the first tile runs large
 * (2 cols x 2 rows) for an asymmetric magazine grid; below that we fall back
 * to a clean even grid.
 */
export default function CollectionsPage({ initialCollections = [] }) {
  const [categories, setCategories] = useState(initialCollections)
  const [loading, setLoading] = useState(initialCollections.length === 0)

  useEffect(() => {
    if (initialCollections.length) return
    getPublicCategories()
      .then((c) => setCategories(Array.isArray(c) ? c : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [initialCollections.length])

  const isEditorial = categories.length >= 3

  return (
    <SeoWrapper pageName="categories">
      <main className="bg-cream">
        <PageHero
          variant="split"
          align="left"
          eyebrow="Collections"
          title="Our"
          titleAccent="Collections"
          description="Our collections, designed and handmade in our studio."
        />

        <section className="pb-24 md:pb-32">
          <div className="vq-container">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-paper" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
                <span className="inline-block h-px w-12 bg-gold/60" aria-hidden />
                <p className="vq-display text-[1.75rem] leading-snug text-ink">
                  No collections yet.
                </p>
                <p className="text-[15px] leading-[1.9] text-text-muted">
                  We are adding new collections soon. In the meantime, have a look at all our
                  products.
                </p>
                <Link
                  href="/products"
                  className="mt-4 rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
                >
                  Shop All Products
                </Link>
              </div>
            ) : isEditorial ? (
              /* Asymmetric editorial grid — first tile large */
              <div className="grid auto-rows-[190px] grid-cols-2 gap-4 sm:auto-rows-[230px] md:auto-rows-[250px] md:grid-cols-4 md:gap-6 lg:auto-rows-[290px]">
                {categories.map((c, i) => {
                  const name = (c.name || '').trim()
                  const img = cleanImg(c.image) || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]
                  const href = `/products?category=${encodeURIComponent(name)}`
                  const big = i === 0

                  return (
                    <CategoryTile
                      key={c.id || c.slug || name || i}
                      name={name}
                      img={img}
                      href={href}
                      featured={big}
                      className={big ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}
                      sizes={
                        big
                          ? '(max-width: 768px) 100vw, 50vw'
                          : '(max-width: 768px) 50vw, 25vw'
                      }
                    />
                  )
                })}
              </div>
            ) : (
              /* Clean even grid for 1–2 collections — a single tile runs wide,
                 two tiles sit side by side. Never a lone half-width card. */
              <div
                className={
                  categories.length === 1
                    ? 'grid grid-cols-1'
                    : 'grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8'
                }
              >
                {categories.map((c, i) => {
                  const name = (c.name || '').trim()
                  const img = cleanImg(c.image) || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]
                  const href = `/products?category=${encodeURIComponent(name)}`
                  const solo = categories.length === 1

                  return (
                    <div
                      key={c.id || c.slug || name || i}
                      className={solo ? 'aspect-[4/5] sm:aspect-[16/9]' : 'aspect-[4/5]'}
                    >
                      <CategoryTile
                        name={name}
                        img={img}
                        href={href}
                        featured
                        sizes={solo ? '100vw' : '(max-width: 640px) 100vw, 50vw'}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Closing — view all link */}
        {!loading && categories.length > 0 && (
          <section className="pb-24 text-center md:pb-32">
            <div className="vq-container">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-graphite transition-colors duration-200 hover:text-ink"
              >
                <span className="relative pb-1">
                  Browse All Products
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
            </div>
          </section>
        )}
      </main>
    </SeoWrapper>
  )
}
