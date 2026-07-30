import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Bestsellers from '@/components/home/Bestsellers';
import ExclusiveSection from '@/components/home/ExclusiveSection';
import CategoryBanners from '@/components/home/CategoryBanners';
import Technologies from '@/components/home/Technologies';
import Reviews from '@/components/reviews/Reviews';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategories, getTechnologies, getProductReviews, getBlogPosts, getSliders } from '@/lib/api';

// Static/ISR — regenerate every 5 min.
export const revalidate = 300;

export default async function HomePage() {
  const [products, categories, reviews, posts, slides] = await Promise.all([
    getBestsellers(),
    getCategories(),
    getProductReviews(null, 60),
    getBlogPosts(),
    getSliders(),
  ]);

  // Collection cards from live categories — same card as the /collections page.
  // Use the category image, or fall back to a product photo from that category.
  const collections = categories.slice(0, 4).map((c) => ({
    label: c.label,
    slug: c.slug,
    image: c.image || products.find((p) => p.categorySlug === c.slug && p.image)?.image || '',
  }));

  return (
    <>
      <Hero features={getHeroFeatures()} slides={slides} />
      <Marquee />
      {collections.length > 0 && <Reveal as="section"><CategoryBanners items={collections} /></Reveal>}
      <Reveal as="section"><Bestsellers products={products} /></Reveal>
      {products.length > 0 && <Reveal as="section"><ExclusiveSection products={products} /></Reveal>}
      <Reveal as="section"><Technologies items={getTechnologies()} /></Reveal>
      <Reveal as="section"><Reviews reviews={reviews} title="What our customers say" limit={6} /></Reveal>
      {posts.length > 0 && <Reveal as="section"><BlogSection posts={posts} /></Reveal>}
    </>
  );
}
