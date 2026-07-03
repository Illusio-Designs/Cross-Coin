'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

/**
 * ExclusiveSection — gold-framed editorial spread.
 * Large product image in a vq-gold-frame, caption column with serif display.
 */
export function ExclusiveSection({ products = [] }) {
  if (!products.length) {
    return (
      <section className="bg-white px-4 py-20 md:py-28 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mx-auto mb-12 h-3 w-40 animate-pulse rounded bg-cream md:mb-16" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="aspect-[4/5] animate-pulse bg-cream" />
            </div>
            <div className="flex flex-col justify-center gap-5 lg:col-span-5">
              <div className="h-3 w-28 animate-pulse rounded bg-cream" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-cream" />
              <div className="h-3 w-full animate-pulse rounded bg-cream" />
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
    'A study in restraint — light caught in 18k gold, set by hand in our atelier. The kind of piece that whispers across decades.'

  return (
    <section className="relative overflow-hidden bg-white px-4 py-20 md:py-28 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-gold/[0.04] blur-3xl"
      />

      <div className="relative mx-auto max-w-[1180px]">
        <div className="mb-12 flex flex-col items-start md:mb-16 lg:max-w-lg">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-gold">
            The Signature Edit
          </p>
          <h2 className="vq-display mt-4 text-4xl text-brand-black md:text-5xl">
            Curated by Hand
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-brand-black/60">
            One piece this season — held back from the catalogue and chosen by the atelier.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Link
            href={`/products/${featureSlug}`}
            className="vq-gold-frame group relative mx-auto block w-full max-w-[520px]"
            aria-label={feature.name || 'Featured piece'}
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-cream">
              {featureImage ? (
                <Image
                  src={featureImage}
                  alt={feature.name || 'Featured piece'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <div className="h-full w-full bg-cream" />
              )}
              <span
                aria-hidden
                className="vq-shine opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            </div>
          </Link>

          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
              Featured Piece
            </p>

            <h3 className="mt-4 font-display text-3xl font-normal leading-[1.08] text-brand-black md:text-4xl lg:text-[2.75rem]">
              {feature.name || 'The Signature Edit'}
            </h3>

            <p className="mt-6 max-w-md text-[15px] leading-[1.85] text-brand-black/65">
              {featureDescription}
            </p>

            <div className="mt-8 flex items-baseline gap-4 border-t border-gold/20 pt-8">
              <p className="font-display text-3xl font-medium text-brand-black">
                {formatPrice(feature.price)}
              </p>
              {feature.compareAtPrice && (
                <p className="text-[14px] text-brand-black/35 line-through">
                  {formatPrice(feature.compareAtPrice)}
                </p>
              )}
            </div>

            <Link
              href={`/products/${featureSlug}`}
              className="group/cta mt-10 inline-flex items-center gap-2 self-start rounded-full bg-brand-black px-8 py-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-gold hover:text-brand-black"
            >
              Acquire this piece
              <ArrowRight
                size={13}
                strokeWidth={1.7}
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
