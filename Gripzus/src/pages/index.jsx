import Head from 'next/head';
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
   Each section is prop-driven. The above-the-fold data (hero slides,
   collections, bestsellers) is fetched on the server in getServerSideProps so
   the first paint is already populated — better LCP and crawlable content. */

export async function getServerSideProps({ res }) {
  // Fetch the three above-the-fold datasets in parallel. Each service already
  // swallows its own errors and returns [], so first paint degrades gracefully.
  const [slides, categories, products] = await Promise.all([
    getPublicSliders(),   // Hero slider — /api/sliders/listing
    getPublicCategories(), // Collections section — /api/categories/listing
    getBestsellers(8),    // Bestseller / exclusive sections — /api/products/best-sellers
  ]);

  res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=86400'
  );

  return {
    props: {
      initialSlides: slides || [],
      initialCategories: categories || [],
      initialProducts: products || [],
    },
  };
}

export default function Home({
  initialSlides = [],
  initialCategories = [],
  initialProducts = [],
}) {
  // Data arrives from the server as props — no post-hydration useEffect fetch.
  const slides = initialSlides;
  const categories = initialCategories;
  const products = initialProducts;

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
