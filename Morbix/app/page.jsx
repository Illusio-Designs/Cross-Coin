import Hero from '@/components/home/Hero';
import SearchCategories from '@/components/home/SearchCategories';
import Bestsellers from '@/components/home/Bestsellers';
import CategoryBanners from '@/components/home/CategoryBanners';
import Technologies from '@/components/home/Technologies';
import ClubBand from '@/components/home/ClubBand';
import TrustStrip from '@/components/layout/TrustStrip';
import {
  getBestsellers, getCategories, getHeroFeatures,
  getCategoryBanners, getTechnologies, getClubPerks,
} from '@/lib/api';

// Static/ISR — regenerate every 5 min once the live catalog is wired in.
export const revalidate = 300;

export default async function HomePage() {
  // Mock now (lib/api USE_MOCK); flips to the live shared API by env flag.
  const [products, chips] = await Promise.all([getBestsellers(), getCategories()]);

  return (
    <>
      <Hero features={getHeroFeatures()} />
      <SearchCategories chips={chips} />
      <Bestsellers products={products} />
      <CategoryBanners banners={getCategoryBanners()} />
      <Technologies items={getTechnologies()} />
      <ClubBand perks={getClubPerks()} />
      <TrustStrip />
    </>
  );
}
