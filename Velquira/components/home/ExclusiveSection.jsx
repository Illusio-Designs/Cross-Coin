'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

/**
 * ExclusiveSection — dark editorial spotlight.
 * Deep obsidian background, floating gold frame, luxury typography.
 */
export function ExclusiveSection({ products = [] }) {
  if (!products.length) {
    return (
      <section className="bg-paper vq-section">
        <div className="vq-container">
          <div className="mx-auto mb-12 h-3 w-40 animate-pulse rounded bg-line md:mb-16" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="aspect-[4/5] animate-pulse bg-line" />
            </div>
            <div className="flex flex-col justify-center gap-5 lg:col-span-5">
              <div className="h-3 w-28 animate-pulse rounded bg-line" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-line" />
              <div className="h-3 w-full animate-pulse rounded bg-line" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  const feature = products[0]
  const featureImage = feature.images?.[0]?.url || ''
  const featureSlug = feature.handle ?? feature.slug ?? String(feature.id)
  const featureDescription =
    feature.description ||
    'Simple and elegant — light caught in 18k gold, set by hand in our studio. The kind of piece you keep for decades.'

  return (
    <section className="relative overflow-hidden bg-paper vq-section">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(160,125,62,0.10) 0%, transparent 70%)' }}
      />

      {/* Faint watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-8 top-1/4 select-none font-display text-[10rem] font-light italic leading-none"
        style={{ color: 'rgba(160,125,62,0.03)' }}
      >
        Featured
      </div>

      <div className="relative vq-container">
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Featured</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            Handcrafted <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Link
            href={`/products/${featureSlug}`}
            className="group relative mx-auto block w-full max-w-[520px]"
            aria-label={feature.name || 'Featured product'}
          >
            {/* Outer offset gold frame */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-4 border border-gold/30 transition-all duration-700 ease-out group-hover:-inset-2 group-hover:border-gold/50"
            />
            {/* Image container */}
            <div className="relative aspect-[4/5] overflow-hidden bg-paper-2 border border-line group-hover:border-gold/30 transition-colors duration-500">
              {featureImage ? (
                <Image
                  src={featureImage}
                  alt={feature.name || 'Featured product'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <div className="h-full w-full bg-paper-2" />
              )}
              {/* Shine sweep */}
              <span
                aria-hidden
                className="vq-shine opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            </div>
          </Link>

          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-gold/70">
              Featured Product
            </p>

            <h3 className="mt-5 font-display text-3xl font-medium leading-[1.08] text-ink md:text-4xl lg:text-[2.75rem]">
              {feature.name || 'Featured'}
            </h3>

            <p className="mt-6 max-w-md text-[15px] leading-[1.85] text-text-muted">
              {featureDescription}
            </p>

            <div className="mt-8 flex items-baseline gap-4 border-t border-line pt-8">
              <p className="font-display text-3xl font-medium text-ink">
                {formatPrice(feature.price)}
              </p>
              {feature.compareAtPrice && (
                <p className="text-[14px] text-text-faint line-through">
                  {formatPrice(feature.compareAtPrice)}
                </p>
              )}
            </div>

            <Link
              href={`/products/${featureSlug}`}
              className="vq-grad-btn group/cta mt-10 inline-flex items-center gap-3 self-start rounded-full px-9 py-4 text-[10px] font-semibold uppercase tracking-[0.3em]"
            >
              Buy Now
              <ArrowRight
                size={13}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover/cta:translate-x-1.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
