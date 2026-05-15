import Head from 'next/head';
import { useEffect, useState } from 'react';
import HeroBanner from '../components/home/HeroBanner';
import CategoryCards from '../components/home/CategoryCards';
import ExclusiveSection from '../components/home/ExclusiveSection';
import BestsellerRow from '../components/home/BestsellerRow';
import ReviewBand from '../components/home/ReviewBand';
import BlogStrip from '../components/home/BlogStrip';
import TrustStrip from '../components/home/TrustStrip';
import { PRODUCTS } from '../data/products';

/* Home — composes the section components, Knitwink-style.
   Each section is prop-driven; data is fetched here and passed down.
   APIs get wired in one by one — for now we hydrate with seed data
   so the page is fully designed and the components render real layouts. */

const SEED_SLIDES = [
  {
    id: 's1',
    eyebrow: 'Vol. 01 · Autumn',
    title: 'Socks that hold the foot.',
    description: 'Performance pairs knit from long-staple cotton, fine merino and recycled nylon — cushion-zoned for the arch, hand-linked at the toe.',
    buttonText: 'Shop the collection',
    buttonLink: '/products',
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1800&q=85&auto=format&fit=crop',
  },
  {
    id: 's2',
    eyebrow: 'Vol. 02 · The Merino edit',
    title: 'Warm dry, cool damp.',
    description: 'A 75/25 merino-tencel blend with natural temperature regulation — tested through Himalayan trails and Mumbai monsoons.',
    buttonText: 'See the Merino edit',
    buttonLink: '/products?category=wool',
    image: 'https://images.unsplash.com/photo-1577538928305-3807c3993047?w=1800&q=85&auto=format&fit=crop',
  },
  {
    id: 's3',
    eyebrow: 'Vol. 03 · Small batch',
    title: 'Knit in five hundred.',
    description: 'Each pair circular-knit in our Ahmedabad atelier. Inspected pair-by-pair. When a run sells out, the run is over.',
    buttonText: 'Shop the season',
    buttonLink: '/products?sort=bestsellers',
    image: 'https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=1800&q=85&auto=format&fit=crop',
  },
];

const SEED_CATEGORIES = [
  { id: 'c1', name: 'Athletic', image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80&auto=format&fit=crop' },
  { id: 'c2', name: 'Dress',    image: 'https://images.unsplash.com/photo-1589810635657-232948472d98?w=900&q=80&auto=format&fit=crop' },
  { id: 'c3', name: 'Casual',   image: 'https://images.unsplash.com/photo-1542219550-37153d387c27?w=900&q=80&auto=format&fit=crop' },
  { id: 'c4', name: 'Wool',     image: 'https://images.unsplash.com/photo-1577538928305-3807c3993047?w=900&q=80&auto=format&fit=crop' },
];

export default function Home() {
  const [slides, setSlides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // API-ready: swap the seed setters for real fetches one by one.
  useEffect(() => {
    setSlides(SEED_SLIDES);
    setCategories(SEED_CATEGORIES);
    setProducts(PRODUCTS);
  }, []);

  return (
    <>
      <Head>
        <title>Gripzus — Premium Socks, Knit With Intention</title>
        <meta name="description" content="Gripzus is a small atelier in Ahmedabad knitting premium socks from combed cotton, merino and recycled fibres. Made in small batches." />
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
      </Head>

      <HeroBanner slides={slides} />
      <CategoryCards categories={categories} />
      <ExclusiveSection />
      <BestsellerRow products={products} eyebrow="Most loved" title="Bestsellers" accent="this season." ctaHref="/products?sort=bestsellers" />
      <ReviewBand />
      <BlogStrip />
      <TrustStrip />
    </>
  );
}
