import Hero3DWrapper from '@/components/home/Hero3DWrapper';
import {
  Marquee,
  BestSellers,
  StoryBand,
  CollectionBanner,
  GenderSection,
  NotesBand,
  ShopTheLook,
  DiscoveryKits,
  WorldOfFragrances,
  Testimonials,
} from '@/components/home/HomeSections';

export default function HomePage() {
  return (
    <>
      <Hero3DWrapper />
      <Marquee />
      <BestSellers />
      <StoryBand />
      <CollectionBanner />
      <GenderSection gender="Women" />
      <NotesBand />
      <ShopTheLook />
      <GenderSection gender="Men" />
      <DiscoveryKits />
      <WorldOfFragrances />
      <Testimonials />
    </>
  );
}
