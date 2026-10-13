import Hero from '@/components/home/Hero';
import Bestsellers from '@/components/home/Bestsellers';
import ExclusiveSection from '@/components/home/ExclusiveSection';
import CategoryBanners from '@/components/home/CategoryBanners';
import ConditionsSection from '@/components/product/ConditionsSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import FaqSection from '@/components/home/FaqSection';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategories, getStoreReviews, getBlogPosts, getSliders, getFaqs } from '@/lib/api';

// Static/ISR — regenerate every 5 min.
export const revalidate = 300;

// Mirror of Hero.jsx's heroSrc() so the preloaded URL EXACTLY matches what the
// hero <img>/<source> will request (same ImageKit tr= params), avoiding a
// double download.
function heroSrc(src, w = 1200) {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
}

export default async function HomePage() {
  const [products, categories, storeReviews, posts, slides, faqs] = await Promise.all([
    getBestsellers(),
    getCategories(),
    getStoreReviews(60),
    getBlogPosts(),
    getSliders(),
    getFaqs('global'),
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

  // Preload the first slide's hero image (the LCP element). Hero renders a
  // <picture> whose desktop <img> requests heroSrc(image, 1200) and whose
  // mobile <source media="(max-width:767px)"> requests heroSrc(mobileImage,
  // 820). imageSrcSet + imageSizes make the browser preload the matching
  // variant per viewport. Rendering <link rel="preload"> here lets Next hoist
  // it into <head> so the LCP URL is in the initial HTML.
  const heroSlide = slides[0];

  return (
    <>
      {heroSlide?.image && (
        <link
          rel="preload"
          as="image"
          href={heroSrc(heroSlide.image, 1200)}
          fetchPriority="high"
          {...(heroSlide.mobileImage
            ? {
                imageSrcSet: `${heroSrc(heroSlide.mobileImage, 820)} 820w, ${heroSrc(heroSlide.image, 1200)} 1200w`,
                imageSizes: '(max-width: 767px) 820px, 1200px',
              }
            : {})}
        />
      )}
      <Hero features={getHeroFeatures()} slides={slides} />
      {collections.length > 0 && <Reveal as="section"><CategoryBanners items={collections} /></Reveal>}
      <Reveal as="section"><Bestsellers products={products} /></Reveal>
      {products.length > 0 && <Reveal as="section"><ExclusiveSection products={products} /></Reveal>}
      <Reveal as="section"><ConditionsSection /></Reveal>
      <Reveal as="section"><ReviewsSection reviews={reviews} total={storeReviews.total} /></Reveal>
      {posts.length > 0 && <Reveal as="section"><BlogSection posts={posts} /></Reveal>}
      {faqs.length > 0 && <Reveal as="section"><FaqSection faqs={faqs} /></Reveal>}
    </>
  );
}
