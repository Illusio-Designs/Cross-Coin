'use client'

import Image from 'next/image'
import Link from 'next/link'
import SeoWrapper from '@/components/SeoWrapper'
import { PageHero } from '@/components/layout/PageHero'

/* Standard section header — identical pattern site-wide. */
function SectionTitle({ eyebrow, title, className = '' }) {
  return (
    <div className={`mb-12 md:mb-16 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">{eyebrow}</p>
      <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
        {title} <span className="text-gold">✦</span>
      </h2>
      <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
    </div>
  )
}

const STEPS = [
  {
    label: 'Step One',
    title: 'Design',
    body: 'Every design starts as a drawing on paper in our studio. We keep working on the proportions until they feel right, and only then do we cut any gold.',
  },
  {
    label: 'Step Two',
    title: 'Setting',
    body: 'One jeweller stays with your order from start to finish. The gold is cast, then every stone is set by hand under a loupe until it sits perfectly flush.',
  },
  {
    label: 'Step Three',
    title: 'Finishing',
    body: 'The finished jewellery is polished, hallmarked and checked twice. It ships in a soft pouch with its diamond certificate and a simple care card.',
  },
]

const VALUES = [
  {
    label: 'Shipping',
    phrase: 'Free Insured Shipping',
    sub: 'Fully insured, tracked delivery across India — from our studio to your door.',
  },
  {
    label: 'Metal',
    phrase: 'Hallmarked 18k Gold',
    sub: 'Solid 18k yellow, rose and white gold. Hallmarked, never plated.',
  },
  {
    label: 'Stones',
    phrase: 'Certified Diamonds',
    sub: 'Every diamond comes with a lab certificate you can check yourself.',
  },
  {
    label: 'Care',
    phrase: 'Lifetime Care',
    sub: 'Free cleaning and polishing for life, plus free resizing in the first year.',
  },
]

export default function AboutPage() {
  return (
    <SeoWrapper pageName="about">
      <PageHero
        variant="obsidian"
        eyebrow="About Us"
        title="Light, set"
        titleAccent="by hand."
        description="A small studio in Bandra, working in solid 18k gold and certified stones — making jewellery slowly, the way it should be made."
      />

      {/* 1 — Our Story: editorial split */}
      <section className="vq-section bg-cream">
        <div className="vq-container">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-6">
              <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-paper">
                <Image
                  src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1400"
                  alt="A jeweller setting a stone at the Velquira bench"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                />
              </div>
            </div>

            <div className="lg:col-span-6">
              <SectionTitle eyebrow="Who We Are" title="Our Story" className="mb-8 md:mb-10" />

              <div className="flex flex-col gap-6 text-[15px] leading-[1.9] text-text-muted">
                <p>
                  Velquira is a small jewellery studio in Mumbai. Everything we sell is made
                  here by hand, in solid 18k gold that carries a hallmark, with diamonds that
                  come with their own certificate. Nothing is mass produced, and nothing is
                  plated.
                </p>
                <p>
                  We started because good jewellery had become hard to buy honestly. So we
                  kept it simple — clear pricing, real materials, and jewellery you can wear
                  every day and pass on later. If you want something made just for you, we do
                  custom orders too.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — How It's Made: three steps, hairline dividers, no boxes */}
      <section className="vq-section bg-beige">
        <div className="vq-container">
          <SectionTitle eyebrow="The Process" title="How It's Made" />

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-line">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={`lg:px-12 ${i === 0 ? 'lg:pl-0' : ''} ${i === STEPS.length - 1 ? 'lg:pr-0' : ''}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                  {s.label}
                </p>
                <h3 className="vq-display mt-4 text-[1.75rem] leading-tight text-ink md:text-[2rem]">
                  {s.title}
                </h3>
                <p className="mt-5 max-w-sm text-[15px] leading-[1.9] text-text-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Dark band pull-quote */}
      <section className="vq-night">
        <div className="vq-container py-24 text-center md:py-32">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
            What We Believe
          </p>
          <blockquote className="vq-display mx-auto mt-8 max-w-4xl text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.25] tracking-[-0.01em] text-cream">
            “Jewellery should be made slowly, by people who sign their work — and it should
            still be worth wearing thirty years from now.”
          </blockquote>
          <span
            className="mx-auto mt-10 block h-px w-16 bg-gradient-to-r from-transparent via-gold to-transparent"
            aria-hidden
          />
        </div>
      </section>

      {/* 4 — Why Velquira: values row, hairline dividers, no boxes */}
      <section className="vq-section bg-cream">
        <div className="vq-container">
          <SectionTitle eyebrow="Why Velquira" title="What You Get" />

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
            {VALUES.map((v, i) => (
              <div
                key={v.phrase}
                className={`lg:px-10 ${i === 0 ? 'lg:pl-0' : ''} ${i === VALUES.length - 1 ? 'lg:pr-0' : ''}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                  {v.label}
                </p>
                <p className="vq-display mt-4 text-[1.4rem] leading-snug text-ink">
                  {v.phrase}
                </p>
                <p className="mt-3 text-[14px] leading-[1.8] text-text-muted">{v.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Closing CTA */}
      <section className="vq-section bg-beige">
        <div className="vq-container text-center">
          <p className="vq-display mx-auto max-w-2xl text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.25] text-ink">
            Made by hand in Mumbai, and ready to be worn.
          </p>
          <p className="mx-auto mt-6 max-w-lg text-[15px] leading-[1.9] text-text-muted">
            Have a look at everything we make, or write to us if you would like something
            custom.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              href="/products"
              className="rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
            >
              Shop All Products
            </Link>
            <Link
              href="/contact"
              className="text-[10px] font-semibold uppercase tracking-[0.26em] text-text-muted underline-offset-8 transition-colors hover:text-ink hover:underline"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </SeoWrapper>
  )
}
