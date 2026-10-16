import Head from 'next/head';
import SeoWrapper from '../components/SeoWrapper';
import Reveal from '../components/common/Reveal';
import HeroBanner, { heroSrc } from '../components/home/HeroBanner';
import Manifesto from '../components/home/Manifesto';
import CategoryCards from '../components/home/CategoryCards';
import ExclusiveSection from '../components/home/ExclusiveSection';
import BestsellerRow from '../components/home/BestsellerRow';
import BlogStrip from '../components/home/BlogStrip';
import TrustStrip from '../components/home/TrustStrip';
import ConditionsSection from '../components/sections/ConditionsSection';
import ReviewsSection from '../components/sections/ReviewsSection';
import FaqSection from '../components/sections/FaqSection';
import { getPublicSliders } from '../services/sliders';
import { getPublicCategories } from '../services/categories';
import { getBestsellers } from '../services/products';
import { getAllReviewsWithTotal } from '../services/reviews';
import { getFaqs } from '../services/faqs';
import { getPosts } from '../services/blog';
import { getSeoOrg } from '../services/seo';

/* Home — composes the section components, Knitwink-style.
   Each section is prop-driven. The above-the-fold data (hero slides,
   collections, bestsellers) is fetched on the server in getServerSideProps so
   the first paint is already populated — better LCP and crawlable content. */

export async function getServerSideProps({ res }) {
  // Fetch every above-the-fold dataset in parallel. Each service already
  // swallows its own errors and returns [], so first paint degrades gracefully.
  // Reviews are fetched once here and shared by the Morbix ReviewsSection and
  // TrustStrip so the store-wide reviews request no longer fires twice.
  const [slides, categories, products, reviewData, posts, faqs, seoOrg] = await Promise.all([
    getPublicSliders(),   // Hero slider — /api/sliders/listing
    getPublicCategories(), // Collections section — /api/categories/listing
    getBestsellers(8),    // Bestseller / exclusive sections — /api/products/best-sellers
    getAllReviewsWithTotal(), // Reviews — /api/reviews/all (Morbix reviews wall)
    getPosts(),           // Journal strip — /api/blogs/listing
    getFaqs('global'),    // FAQ accordion — /api/public/faqs?type=global
    getSeoOrg(),          // Brand Organization JSON-LD — /api/public/seo-org
  ]);

  // Brand-scoped Organization structured data (schema.org/Organization) or null.
  const organization = seoOrg?.organization ?? null;

  // Store-wide rating derived from the shared review payload — same calc the
  // TrustStrip used to do on the client, now done once on the server.
  const reviews = reviewData?.reviews || [];
  const total = reviewData?.total || 0;
  const rated = reviews.filter((r) => Number(r.rating) > 0);
  const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0;
  const rating = avg > 0 && total > 0 ? { avg, total } : null;

  res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=86400'
  );

  return {
    props: {
      initialSlides: slides || [],
      initialCategories: categories || [],
      initialProducts: products || [],
      initialReviews: reviews,
      initialReviewTotal: total,
      initialRating: rating,
      initialPosts: posts || [],
      initialFaqs: faqs || [],
      organization,
    },
  };
}

export default function Home({
  initialSlides = [],
  initialCategories = [],
  initialProducts = [],
  initialReviews = [],
  initialReviewTotal = 0,
  initialRating = null,
  initialPosts = [],
  initialFaqs = [],
  organization = null,
}) {
  // Data arrives from the server as props — no post-hydration useEffect fetch.
  const slides = initialSlides;
  const categories = initialCategories;
  const products = initialProducts;
  const reviews = initialReviews;
  const reviewTotal = initialReviewTotal;
  const rating = initialRating;
  const posts = initialPosts;
  const faqs = initialFaqs;

  // Preload the LCP hero image server-side. HeroBanner renders the first slide
  // in the initial HTML, but as a client component its <img>/<picture> URL isn't
  // discoverable until hydration — this <link rel=preload> lets the browser start
  // the hero download from the raw HTML. href uses the SAME heroSrc() sizing as
  // HeroBanner's <img> so the browser downloads it once. When the slide has a
  // mobile variant we emit a matching media-gated preload for its <source> too.
  const heroSlide = slides && slides.length > 0 ? slides[0] : null;

  return (
    <SeoWrapper pageName="home">
      <Head>
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
        {/* Brand Organization JSON-LD from the backend — only when present. */}
        {organization && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
          />
        )}
        {heroSlide && heroSlide.mobileImage && (
          <link
            rel="preload"
            as="image"
            href={heroSlide.mobileImage}
            media="(max-width: 767px)"
            fetchpriority="high"
          />
        )}
        {heroSlide && (
          <link
            rel="preload"
            as="image"
            href={heroSrc(heroSlide.image)}
            {...(heroSlide.mobileImage ? { media: '(min-width: 768px)' } : {})}
            fetchpriority="high"
          />
        )}
      </Head>

      <HeroBanner slides={slides} />
      <Reveal><CategoryCards categories={categories} /></Reveal>
      <Reveal><ExclusiveSection products={products} /></Reveal>
      <Reveal><BestsellerRow products={products} eyebrow="Most loved" title="Bestsellers" accent="this season." ctaHref="/products" /></Reveal>
      <Manifesto />
      {/* Ported Morbix sections — conditions band + moving reviews wall. */}
      <Reveal><ConditionsSection /></Reveal>
      <Reveal><ReviewsSection reviews={reviews} total={reviewTotal} /></Reveal>
      {/* posts/rating come from the server once. Pass undefined/null when the
          server fetch returned empty so each component's client fetch still
          runs as a fallback. */}
      <Reveal><BlogStrip posts={posts.length ? posts : undefined} /></Reveal>
      <Reveal><TrustStrip rating={rating} /></Reveal>
      {/* Ported Morbix FAQ accordion — renders nothing when there are no FAQs. */}
      <Reveal><FaqSection faqs={faqs} /></Reveal>
    </SeoWrapper>
  );
}
