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
    <div className="mb-12 md:mb-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Collections</p>
      <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
        Our Collections <span className="text-gold">✦</span>
      </h2>
      <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
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
      className={`group relative overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-all duration-500 ${className}`}
    >
      <div className={`relative w-full overflow-hidden ${featured ? 'h-full min-h-[380px]' : 'aspect-[4/5]'}`}>
        <Image
          src={img}
          alt={name}
          fill
          sizes={featured ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
          className="object-cover transition-transform duration-[2200ms] ease-out group-hover:scale-105"
        />

        {/* Dark cinematic overlay */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#211b12]/80 via-[#211b12]/30 to-transparent transition-opacity duration-700"
        />

        {/* Gold shine sweep on hover */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(135deg, transparent 30%, rgba(160,125,62,0.12) 50%, transparent 70%)',
          }}
        />

        {/* Text content */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-8">
          <p
            className={`font-editorial font-light tracking-wide text-white/90 leading-tight ${
              featured ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'
            }`}
            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
          >
            {name}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-px w-6 bg-gold/60 transition-all duration-500 group-hover:w-10 group-hover:bg-gold" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.38em] text-gold/70 transition-colors duration-300 group-hover:text-gold">
              Explore
            </p>
          </div>
        </div>

        {/* Contracting gold border on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-3 border border-transparent transition-all duration-500 ease-out group-hover:border-gold/30"
        />
      </div>
    </Link>
  )
}

/**
 * CategoryCards — asymmetric bento mosaic.
 * Dark obsidian background, cinematic tile transitions.
 */
export function CategoryCards({ categories = [] }) {
  const items = categories.slice(0, 5)
  if (items.length === 0) return null

  const [hero, ...rest] = items

  return (
    <section className="bg-cream vq-section relative overflow-hidden">
      {/* Subtle lattice pattern */}
      <div aria-hidden className="absolute inset-0 vq-lattice opacity-60 pointer-events-none" />

      <div className="relative vq-container">
        <SectionHead />

        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-12 lg:gap-4">
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
