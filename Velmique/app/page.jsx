import Hero3DWrapper from '@/components/home/Hero3DWrapper';
import {
  Marquee,
  StoryBand,
  CollectionBanner,
  BestSellers,
  NotesBand,
  Testimonials,
} from '@/components/home/HomeSections';

export default function HomePage() {
  return (
    <>
      <Hero3DWrapper />
      <Marquee />
      <StoryBand />
      <CollectionBanner />
      <BestSellers />
      <NotesBand />
      <Testimonials />
    </>
  );
}
