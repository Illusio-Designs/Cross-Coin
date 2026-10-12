import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Bestsellers from '@/components/home/Bestsellers';
import ExclusiveSection from '@/components/home/ExclusiveSection';
import CategoryBanners from '@/components/home/CategoryBanners';
import Technologies from '@/components/home/Technologies';
import ReviewsSection from '@/components/home/ReviewsSection';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategories, getTechnologies, getStoreReviews, getBlogPosts, getSliders } from '@/lib/api';

// Static/ISR — regenerate every 5 min.
export const revalidate = 300;

// Exact mirror of heroSrc() in components/home/Hero.jsx. It MUST stay byte-for-byte
// identical so the preloaded hero URL below matches what the hero <img>/<source>
// actually requests — otherwise the browser double-downloads the LCP image.
function heroSrc(src, w = 1600) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
}

export default async function HomePage() {
  const [products, categories, storeReviews, posts, slides] = await Promise.all([
    getBestsellers(),
    getCategories(),
    getStoreReviews(60),
    getBlogPosts(),
    getSliders(),
  ]);
  const reviews = storeReviews.reviews;

  // Real store-wide rating for the trust marquee — average from the fetched
  // reviews, exact total from the API. Null when there are no real reviews.
  const ratedReviews = (reviews || []).filter((r) => Number(r.rating) > 0);
  const reviewAvg = ratedReviews.length
    ? ratedReviews.reduce((a, r) => a + Number(r.rating), 0) / ratedReviews.length
    : 0;
  const marqueeRating = reviewAvg > 0 && Number(storeReviews.total) > 0
    ? { avg: reviewAvg, total: storeReviews.total }
    : null;

  // Collection cards from live categories — same card as the /collections page.
  // Use the category image, or fall back to a product photo from that category.
  const collections = categories.slice(0, 4).map((c) => ({
    label: c.label,
    slug: c.slug,
    image: c.image || products.find((p) => p.categorySlug === c.slug && p.image)?.image || '',
  }));

  // Preload the first slide's hero image (the LCP) so the browser discovers it
  // immediately instead of waiting for the client Hero component to hydrate —
  // fixes Lighthouse "LCP request discovery". The Hero uses art-directed sources
  // (<source media="(max-width:767px)"> on mobile, plain <img> on desktop), each
  // a single 1x candidate, so we gate the preloads with `media` to request the
  // exact same URL per breakpoint — no double download. Next hoists these <link>s
  // into <head>. Guarded against an empty sliders response.
  const heroSlide = Array.isArray(slides) && slides.length > 0 ? slides[0] : null;
  const heroDesktopSrc = heroSlide ? heroSrc(heroSlide.image, 1600) : null;
  const heroMobileSrc = heroSlide && heroSlide.mobileImage ? heroSrc(heroSlide.mobileImage, 820) : null;

  return (
    <>
      {heroDesktopSrc && (
        heroMobileSrc ? (
          <>
            <link rel="preload" as="image" fetchPriority="high" media="(max-width: 767px)" href={heroMobileSrc} />
            <link rel="preload" as="image" fetchPriority="high" media="(min-width: 768px)" href={heroDesktopSrc} />
          </>
        ) : (
          <link rel="preload" as="image" fetchPriority="high" href={heroDesktopSrc} />
        )
      )}
      <Hero features={getHeroFeatures()} slides={slides} />
      <Marquee rating={marqueeRating} />
      {collections.length > 0 && <Reveal as="section"><CategoryBanners items={collections} /></Reveal>}
      <Reveal as="section"><Bestsellers products={products} /></Reveal>
      {products.length > 0 && <Reveal as="section"><ExclusiveSection products={products} /></Reveal>}
      <Reveal as="section"><Technologies items={getTechnologies()} /></Reveal>
      <Reveal as="section"><ReviewsSection reviews={reviews} total={storeReviews.total} /></Reveal>
      {posts.length > 0 && <Reveal as="section"><BlogSection posts={posts} /></Reveal>}
    </>
  );
}
