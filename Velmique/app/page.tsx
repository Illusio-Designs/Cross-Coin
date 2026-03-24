import HeroBanner from '@/components/home/HeroBanner';
import {
  BrandValues,
  MarqueeStrip,
  FeaturedCollections,
  BestSellers,
  NewArrivals,
  PromoBanner,
  Testimonials,
  InstagramFeed,
} from '@/components/home/HomeSections';

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <BrandValues />
      <MarqueeStrip />
      <FeaturedCollections />
      <BestSellers />
      <PromoBanner />
      <NewArrivals />
      <Testimonials />
      <InstagramFeed />
    </>
  );
}
