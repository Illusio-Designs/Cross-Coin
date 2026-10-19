import { getPublicProducts } from '@/lib/api/products';
import { getPackTiers } from '@/lib/api/bundles';
import PackBuilder from '../_components/PackBuilder';

export const metadata = {
  title: 'Build Your Pack — Velmique Maison de Parfum',
  description: 'Mix any fragrances into one pack and save more as it grows.',
};

export default async function PackPage() {
  const [res, tiers] = await Promise.all([
    getPublicProducts({ limit: 24 }),
    getPackTiers(),
  ]);
  const products = (res.products || []).filter((p) => p.inStock !== false);
  return <PackBuilder products={products} tiers={tiers} />;
}
