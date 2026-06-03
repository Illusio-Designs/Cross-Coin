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

// Editorial fallback imagery — rotates by index when a category has no image.
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200',
]

function SectionHead() {
  return (
    <div className="mb-12 flex flex-col items-center text-center md:mb-16">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
        Collections
      </p>
      <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
        The House
      </h2>
      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
        Five families of fine jewellery, composed in the atelier and finished by hand.
      </p>
      <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
    </div>
  )
}

/**
 * CategoryCard — premium card.
 * Same rounded bordered structure as ProductCard / BlogCard so the
 * homepage reads as a coherent system. Gold hairline border, warm-cream
 * image bed, serif name + small gold "Shop" eyebrow below the image,
 * soft amber-tinted hover shadow.
 */
function CategoryCard({ c, fallback }) {
  const img = cleanImg(c.image) || fallback
  const name = (c.name || '').trim()
  const href = `/products?category=${encodeURIComponent(name)}`

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-gold/20 bg-white p-3 transition-[border-color,box-shadow] duration-300 hover:border-gold/55 hover:shadow-[0_22px_45px_-26px_rgba(143,102,32,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-cream">
        <Image
          src={img}
          alt={name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>

      <div className="mt-3.5 px-1 pb-1 text-center">
        <p className="font-display text-[16px] leading-tight text-brand-black">
          {name}
        </p>
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
  )
}

/**
 * CategoryCards — homepage collections grid.
 * Clean equal grid of premium category cards: 2 cols on mobile,
 * 3 on tablet, 5 on desktop. Coheres with ProductCard / BlogCard.
 */
export function CategoryCards({ categories = [] }) {
  const items = categories.slice(0, 5)
  if (items.length === 0) return null

  return (
    <section className="bg-ivory px-4 py-20 md:py-28 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <SectionHead />

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-5">
          {items.map((c, i) => (
            <CategoryCard
              key={c.id || c.slug || c.name || i}
              c={c}
              fallback={FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]}
            />
          ))}
        </div>
      </div>
    </section>
  )
}