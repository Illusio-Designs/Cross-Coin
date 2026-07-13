import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Bestsellers from '@/components/home/Bestsellers';
import CategoryBanners from '@/components/home/CategoryBanners';
import Technologies from '@/components/home/Technologies';
import ReviewsSection from '@/components/home/ReviewsSection';
import BlogSection from '@/components/home/BlogSection';
import Reveal from '@/components/Reveal';
import { getBestsellers, getHeroFeatures, getCategoryBanners, getTechnologies, getProductReviews, getBlogPosts } from '@/lib/api';

// Static/ISR — regenerate every 5 min once the live catalog is wired in.
export const revalidate = 300;

export default async function HomePage() {
  const [products, reviews, posts] = await Promise.all([
    getBestsellers(),
    getProductReviews(),
    getBlogPosts(),
  ]);

  return (
    <>
      <Hero features={getHeroFeatures()} />
      <Marquee />
      <Reveal as="section"><Bestsellers products={products} /></Reveal>
      <Reveal as="section"><CategoryBanners banners={getCategoryBanners()} /></Reveal>
      <Reveal as="section"><Technologies items={getTechnologies()} /></Reveal>
      <Reveal as="section"><ReviewsSection reviews={reviews} /></Reveal>
      <Reveal as="section"><BlogSection posts={posts} /></Reveal>
    </>
  );
}
