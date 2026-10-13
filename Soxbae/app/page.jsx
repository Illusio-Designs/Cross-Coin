import Hero from '@/components/home/Hero';
import Bestsellers from '@/components/home/Bestsellers';
import ExclusiveSection from '@/components/home/ExclusiveSection';
import CategoryBanners from '@/components/home/CategoryBanners';
import ProductBenefits from '@/components/product/ProductBenefits';
import ProductFaq from '@/components/product/ProductFaq';
import Reviews from '@/components/reviews/Reviews';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategories, getStoreReviews, getBlogPosts, getSliders, getGlobalFaqs } from '@/lib/api';

// Static/ISR — regenerate every 5 min.
export const revalidate = 300;

// Mirror of Hero.jsx's heroSrc() so the preloaded URL EXACTLY matches what the
// hero <img>/<source> will request (same ImageKit tr= params), avoiding a
// double download.
function heroSrc(src, w = 1600) {
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
    getGlobalFaqs(),
  ]);
  const reviews = storeReviews.reviews;

  // Collection cards from live categories — same card as the /collections page.
  // Use the category image, or fall back to a product photo from that category.
  const collections = categories.slice(0, 4).map((c) => ({
    label: c.label,
    slug: c.slug,
    image: c.image || products.find((p) => p.categorySlug === c.slug && p.image)?.image || '',
  }));

  // Preload the first slide's hero image (the LCP element). Hero renders a
  // <picture> whose desktop <img> requests heroSrc(image, 1600) and whose
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
          href={heroSrc(heroSlide.image, 1600)}
          fetchPriority="high"
          {...(heroSlide.mobileImage
            ? {
                imageSrcSet: `${heroSrc(heroSlide.mobileImage, 820)} 820w, ${heroSrc(heroSlide.image, 1600)} 1600w`,
                imageSizes: '(max-width: 767px) 820px, 1600px',
              }
            : {})}
        />
      )}
      <Hero features={getHeroFeatures()} slides={slides} />
      {collections.length > 0 && <Reveal as="section"><CategoryBanners items={collections} /></Reveal>}
      <Reveal as="section"><Bestsellers products={products} /></Reveal>
      {products.length > 0 && <Reveal as="section"><ExclusiveSection products={products} /></Reveal>}
      <Reveal as="section"><ProductBenefits /></Reveal>
      <Reveal as="section"><Reviews reviews={reviews} total={storeReviews.total} title="In their words" /></Reveal>
      {posts.length > 0 && <Reveal as="section"><BlogSection posts={posts} /></Reveal>}
      {faqs.length > 0 && <Reveal as="section"><ProductFaq faqs={faqs} /></Reveal>}
    </>
  );
}
