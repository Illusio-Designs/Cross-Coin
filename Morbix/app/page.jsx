import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Bestsellers from '@/components/home/Bestsellers';
import CategoryBanners from '@/components/home/CategoryBanners';
import Technologies from '@/components/home/Technologies';
import ReviewsSection from '@/components/home/ReviewsSection';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategories, getTechnologies, getProductReviews, getBlogPosts } from '@/lib/api';

// Static/ISR — regenerate every 5 min.
export const revalidate = 300;

export default async function HomePage() {
  const [products, categories, reviews, posts] = await Promise.all([
    getBestsellers(),
    getCategories(),
    getProductReviews(),
    getBlogPosts(),
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
      <Hero features={getHeroFeatures()} />
      <Marquee />
      <Reveal as="section"><Bestsellers products={products} /></Reveal>
      {collections.length > 0 && <Reveal as="section"><CategoryBanners items={collections} /></Reveal>}
      <Reveal as="section"><Technologies items={getTechnologies()} /></Reveal>
      {reviews.length > 0 && <Reveal as="section"><ReviewsSection reviews={reviews} /></Reveal>}
      {posts.length > 0 && <Reveal as="section"><BlogSection posts={posts} /></Reveal>}
    </>
  );
}
