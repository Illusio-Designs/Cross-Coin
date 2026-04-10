'use client'

import { useEffect, useState } from 'react'
import { HeroBanner } from '@/components/home/HeroBanner'
import { CollectionGrid } from '@/components/home/CollectionGrid'
import { SustainabilityStrip } from '@/components/home/SustainabilityStrip'
import { BestsellerRow } from '@/components/home/BestsellerRow'
import { ExclusivePair } from '@/components/home/ExclusivePair'
import { BlogStrip } from '@/components/home/BlogStrip'
import { ReviewBand } from '@/components/home/ReviewBand'
import { InstagramStrip } from '@/components/home/InstagramStrip'
import { getBestsellers } from '@/lib/api/products'
import { getPublicSliders } from '@/lib/api/sliders'
import { getPublicCategories } from '@/lib/api/categories'

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
    <>
      <HeroBanner slides={slides} />
      <CollectionGrid categories={categories} />
      <SustainabilityStrip />
      <BestsellerRow products={bestsellers} />
      <ExclusivePair />
      <BlogStrip />
      <ReviewBand />
      <InstagramStrip />
    </>
  )
}
