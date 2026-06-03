'use client'

import { useEffect, useState } from 'react'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CategoryCards } from '@/components/home/CategoryCards'
import { ExclusiveSection } from '@/components/home/ExclusiveSection'
import { BestsellerRow } from '@/components/home/BestsellerRow'
import { ReviewBand } from '@/components/home/ReviewBand'
import { BlogStrip } from '@/components/home/BlogStrip'
import { Reveal } from '@/components/ui/Reveal'
import { getBestsellers } from '@/lib/api/products'
import { getPublicSliders } from '@/lib/api/sliders'
import { getPublicCategories } from '@/lib/api/categories'
import SeoWrapper from '@/components/SeoWrapper'

/* ─────────────────────────────────────────────────────────────────────────
   Velquira — homepage.
   Photography and whitespace do the work. Restraint, not ornament.
   ──────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [slides, setSlides] = useState([])
  const [categories, setCategories] = useState([])
  const [bestsellers, setBestsellers] = useState([])

  useEffect(() => {
    getPublicSliders().then(setSlides).catch(() => {})
    getPublicCategories().then(setCategories).catch(() => {})
    getBestsellers().then(setBestsellers).catch(() => {})
  }, [])

  return (
    <SeoWrapper pageName="home">
      <HeroBanner slides={slides} />

      <Reveal>
        <CategoryCards categories={categories} />
      </Reveal>

      <Reveal>
        <ExclusiveSection products={bestsellers.slice(0, 3)} />
      </Reveal>

      <Reveal>
        <BestsellerRow products={bestsellers} />
      </Reveal>

      <Reveal>
        <ReviewBand />
      </Reveal>

      <Reveal>
        <BlogStrip />
      </Reveal>
    </SeoWrapper>
  )
}