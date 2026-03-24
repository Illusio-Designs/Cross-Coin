import HeroBanner from '@/components/home/HeroBanner';
import {
  ServicesBar,
  BestSellers,
  GenderSection,
  CollectionBanner,
  ShopTheLook,
  DiscoveryKits,
  WorldOfFragrances,
  Testimonials,
} from '@/components/home/HomeSections';

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <ServicesBar />
      <BestSellers />
      <GenderSection gender="Men" />
      <CollectionBanner />
      <GenderSection gender="Women" />
      <ShopTheLook />
      <DiscoveryKits />
      <WorldOfFragrances />
      <Testimonials />
    </>
  );
}
