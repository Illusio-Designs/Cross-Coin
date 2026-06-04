'use client'

import { useEffect, useState } from 'react'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CategoryCards } from '@/components/home/CategoryCards'
import { TrustStrip } from '@/components/home/TrustStrip'
import { ExclusiveSection } from '@/components/home/ExclusiveSection'
import { BestsellerRow } from '@/components/home/BestsellerRow'
import { ReviewBand } from '@/components/home/ReviewBand'
import { BlogStrip } from '@/components/home/BlogStrip'
import { getBestsellers } from '@/lib/api/products'
import { getPublicSliders } from '@/lib/api/sliders'
import { getPublicCategories } from '@/lib/api/categories'
import SeoWrapper from '@/components/SeoWrapper'

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
      {/* Visually-hidden h1 — every page needs exactly one h1 for axe-core
          and screen readers. The hero design has no visible heading, so
          we use the sr-only utility from globals.css. */}
      <h1 className="sr-only">Knitwink — natural-fibre knitwear, made to last</h1>
      <HeroBanner slides={slides} />
      <CategoryCards categories={categories} />
      <ExclusiveSection products={bestsellers.slice(0, 3)} />
      <BestsellerRow products={bestsellers} />
      <ReviewBand />
      <BlogStrip />
      <TrustStrip />
    </SeoWrapper>
  )
}
