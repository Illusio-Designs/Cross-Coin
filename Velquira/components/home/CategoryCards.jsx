'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function cleanImg(url) {
  if (!url) return ''
  if (url.includes('https://') && url.indexOf('https://') !== url.lastIndexOf('https://')) {
    return url.substring(url.lastIndexOf('https://'))
  }
  return url
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200',
]

function SectionHead() {
  return (
    <div className="mb-12 flex flex-col items-start md:mb-16 lg:max-w-xl">
      <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold">
        Collections
      </p>
      <h2 className="vq-display mt-4 text-4xl text-brand-black md:text-5xl lg:text-[3.25rem]">
        The House
      </h2>
      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
        Five families of fine jewellery — composed in the atelier, finished by hand.
      </p>
      <span className="mt-6 inline-block h-px w-16 bg-gradient-to-r from-gold to-transparent" aria-hidden />
    </div>
  )
}

function CategoryTile({ c, fallback, className = '', featured = false }) {
  const img = cleanImg(c.image) || fallback
  const name = (c.name || '').trim()
  const href = `/products?category=${encodeURIComponent(name)}`

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden bg-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${className}`}
    >
      <div className={`relative w-full overflow-hidden ${featured ? 'h-full min-h-[320px]' : 'aspect-[4/5]'}`}>
        <Image
          src={img}
          alt={name}
          fill
          sizes={featured ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-brand-black/85 via-brand-black/20 to-transparent transition-opacity duration-500 group-hover:from-brand-black/90"
        />
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <p
            className={`font-display text-white ${featured ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}
          >
            {name}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.3em] text-gold transition-colors group-hover:text-gold-light">
            Explore
            <ArrowRight size={10} strokeWidth={1.7} className="transition-transform group-hover:translate-x-1" />
          </p>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-3 border border-gold/0 transition-colors duration-500 group-hover:border-gold/40"
        />
      </div>
    </Link>
  )
}

/**
 * CategoryCards — asymmetric bento mosaic.
 * One hero tile + four supporting tiles — an editorial layout unique
 * to Velquira's homepage rhythm.
 */
export function CategoryCards({ categories = [] }) {
  const items = categories.slice(0, 5)
  if (items.length === 0) return null

  const [hero, ...rest] = items

  return (
    <section className="vq-lattice bg-ivory px-4 py-20 md:py-28 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <SectionHead />

        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
          <CategoryTile
            c={hero}
            fallback={FALLBACK_IMAGES[0]}
            featured
            className="col-span-2 row-span-2 lg:col-span-6 lg:row-span-2"
          />

          {rest.map((c, i) => (
            <CategoryTile
              key={c.id || c.slug || c.name || i}
              c={c}
              fallback={FALLBACK_IMAGES[(i + 1) % FALLBACK_IMAGES.length]}
              className="lg:col-span-3"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
