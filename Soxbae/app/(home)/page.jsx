import Hero from '@/components/home/Hero';
import { ikSrc, ikSrcSet, HERO_W, HERO_MOBILE_W, HERO_WIDTHS, HERO_SIZES } from '@/lib/image';
import Bestsellers from '@/components/home/Bestsellers';
import ExclusiveSection from '@/components/home/ExclusiveSection';
import CategoryBanners from '@/components/home/CategoryBanners';
import ProductBenefits from '@/components/product/ProductBenefits';
import ProductFaq from '@/components/product/ProductFaq';
import Reviews from '@/components/reviews/Reviews';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategories, getStoreReviews, getBlogPosts, getSliders, getGlobalFaqs, getSeoOrg } from '@/lib/api';
import { buildMetadata } from '@/lib/api/seo';

// Static/ISR — regenerate every 60s so dashboard edits (hero slider, featured
// products, etc.) reflect on the homepage within about a minute.
export const revalidate = 60;

// Self-referencing canonical for the homepage. Next App Router does NOT emit a
// canonical automatically, so without this the home page had no <link rel=
// "canonical">. Resolved against metadataBase (https://www.soxbae.com).
// Dashboard-controlled page SEO is merged OVER this fallback; canonical '/'
// is preserved unless the backend supplies a non-empty canonical_url.
export async function generateMetadata() {
  return buildMetadata('home', { alternates: { canonical: '/' } });
}


export default async function HomePage() {
  const [products, categories, storeReviews, posts, slides, faqs, seoOrg] = await Promise.all([
    getBestsellers(),
    getCategories(),
    getStoreReviews(60),
    getBlogPosts(),
    getSliders(),
    getGlobalFaqs(),
    getSeoOrg(),
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
  // <picture> whose desktop <img> requests ikSrc(image, HERO_W) (or a srcSet
  // when there's no mobile art) and whose mobile <source> requests
  // ikSrc(mobileImage, HERO_MOBILE_W). imageSrcSet + imageSizes preload the matching
  // variant per viewport. Rendering <link rel="preload"> here lets Next hoist
  // it into <head> so the LCP URL is in the initial HTML.
  const heroSlide = slides[0];

  const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.soxbae.com').replace(/\/+$/, '');
  // Prefer the dashboard-managed Organization schema when the brand has filled
  // its SEO settings; otherwise fall back to the hardcoded one. The WebSite
  // entry below is always kept as-is.
  const organizationJsonLd = seoOrg?.organization || {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Soxbae',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };
  const homeJsonLd = [
    organizationJsonLd,
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Soxbae',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <>
      {homeJsonLd.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      {heroSlide?.image && (
        <link
          rel="preload"
          as="image"
          href={ikSrc(heroSlide.image, HERO_W)}
          fetchPriority="high"
          {...(heroSlide.mobileImage
            ? {
                imageSrcSet: `${ikSrc(heroSlide.mobileImage, HERO_MOBILE_W)} ${HERO_MOBILE_W}w, ${ikSrc(heroSlide.image, HERO_W)} ${HERO_W}w`,
                imageSizes: `(max-width: 767px) ${HERO_MOBILE_W}px, ${HERO_W}px`,
              }
            : (ikSrcSet(heroSlide.image, HERO_WIDTHS)
              ? { imageSrcSet: ikSrcSet(heroSlide.image, HERO_WIDTHS), imageSizes: HERO_SIZES }
              : {}))}
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
