'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

/**
 * ExclusiveSection — single feature spread.
 *
 * One featured piece: a large image on the left, a refined caption
 * column on the right (eyebrow → serif name → description → ₹ price →
 * gold CTA). Nothing else. Clean magazine spread, restrained.
 */
export function ExclusiveSection({ products = [] }) {
  if (!products.length) {
    return (
      <section className="bg-ivory px-4 py-20 md:py-28 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mx-auto mb-12 h-3 w-40 animate-pulse rounded bg-cream md:mb-16" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <div className="aspect-[4/5] animate-pulse rounded bg-cream" />
            </div>
            <div className="flex flex-col justify-center gap-5 lg:col-span-5">
              <div className="h-3 w-28 animate-pulse rounded bg-cream" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-cream" />
              <div className="h-3 w-full animate-pulse rounded bg-cream" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-cream" />
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
    <section className="bg-ivory px-4 py-20 md:py-28 lg:px-8">
      <div className="mx-auto max-w-[1080px]">

        {/* Section heading */}
        <div className="mb-12 flex flex-col items-center text-center md:mb-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
            The Signature Edit
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
            Curated by Hand
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
            One piece this season, held back from the catalogue and chosen by the atelier.
          </p>
          <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
        </div>

        {/* Magazine spread — image left, caption right */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* IMAGE */}
          <Link
            href={`/products/${featureSlug}`}
            className="group relative block overflow-hidden lg:col-span-6"
            aria-label={feature.name || 'Featured piece'}
          >
            <div className="relative mx-auto aspect-square w-full max-w-[460px] overflow-hidden bg-cream">
              {featureImage ? (
                <Image
                  src={featureImage}
                  alt={feature.name || 'Featured piece'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 460px"
                  className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="h-full w-full bg-cream" />
              )}
            </div>
          </Link>

          {/* CAPTION */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              Featured
            </p>

            <h3 className="mt-4 font-display text-3xl font-normal leading-[1.1] tracking-tight text-brand-black md:text-4xl lg:text-5xl">
              {feature.name || 'The Signature Edit'}
            </h3>

            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-brand-black/65 md:text-[15px]">
              {featureDescription}
            </p>

            <div className="mt-7 flex items-baseline gap-3">
              <p className="font-display text-2xl font-medium text-brand-black">
                {formatPrice(feature.price)}
              </p>
              {feature.compareAtPrice && (
                <p className="text-[13px] text-brand-black/35 line-through">
                  {formatPrice(feature.compareAtPrice)}
                </p>
              )}
            </div>

            <Link
              href={`/products/${featureSlug}`}
              className="group/cta mt-9 inline-flex items-center gap-2 self-start text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors duration-200 hover:text-gold-deep"
            >
              <span className="relative pb-1.5">
                Acquire this piece
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-px w-full origin-left bg-gold transition-transform duration-500 ease-out group-hover/cta:scale-x-110"
                />
              </span>
              <ArrowRight
                size={13}
                strokeWidth={1.7}
                className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1.5"
              />
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}