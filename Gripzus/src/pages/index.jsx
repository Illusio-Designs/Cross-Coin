import Head from 'next/head';
import { useEffect, useState } from 'react';
import SeoWrapper from '../components/SeoWrapper';
import Reveal from '../components/common/Reveal';
import HeroBanner from '../components/home/HeroBanner';
import Marquee from '../components/home/Marquee';
import Manifesto from '../components/home/Manifesto';
import CategoryCards from '../components/home/CategoryCards';
import ExclusiveSection from '../components/home/ExclusiveSection';
import BestsellerRow from '../components/home/BestsellerRow';
import ReviewBand from '../components/home/ReviewBand';
import BlogStrip from '../components/home/BlogStrip';
import TrustStrip from '../components/home/TrustStrip';
import { getPublicSliders } from '../services/sliders';
import { getPublicCategories } from '../services/categories';
import { getBestsellers } from '../services/products';

/* Home — composes the section components, Knitwink-style.
   Each section is prop-driven; data is fetched here from the live API. */

export default function Home() {
  const [slides, setSlides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Hero slider — /api/sliders/listing
    getPublicSliders().then(setSlides).catch(() => setSlides([]));
    // Collections section — /api/categories/listing
    getPublicCategories().then(setCategories).catch(() => setCategories([]));
    // Bestseller section — /api/products/best-sellers
    getBestsellers(8).then(setProducts).catch(() => setProducts([]));
  }, []);

  return (
    <SeoWrapper pageName="home">
      <Head>
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
      </Head>

      <HeroBanner slides={slides} />
      <Marquee />
      <Reveal><CategoryCards categories={categories} /></Reveal>
      <Reveal><ExclusiveSection products={products} /></Reveal>
      <Reveal><BestsellerRow products={products} eyebrow="Most loved" title="Bestsellers" accent="this season." ctaHref="/products" /></Reveal>
      <Manifesto />
      <Reveal><ReviewBand /></Reveal>
      <Reveal><BlogStrip /></Reveal>
      <Reveal><TrustStrip /></Reveal>
    </SeoWrapper>
  );
}
