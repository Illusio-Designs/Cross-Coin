import { getPublicProducts } from '@/lib/api/products';
import { getPackTiers } from '@/lib/api/bundles';
import PackBuilder from '../_components/PackBuilder';

export const metadata = {
  title: 'Build Your Pack — Velmique Maison de Parfum',
  description: 'Mix any fragrances into one pack and save more as it grows.',
};

export default async function PackPage({ searchParams }) {
  const [res, tiers] = await Promise.all([
    getPublicProducts({ limit: 24 }),
    getPackTiers(),
  ]);
  const products = (res.products || []).filter((p) => p.inStock !== false);
  const requestedCount = Number(searchParams?.items);
  const targetCount = tiers.find(tier => tier.pairs === requestedCount)?.pairs || tiers[0]?.pairs || 2;
  return <PackBuilder products={products} tiers={tiers} targetCount={targetCount} />;
}
