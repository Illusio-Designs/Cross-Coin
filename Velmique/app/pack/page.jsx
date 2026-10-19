import { getPublicProducts } from '@/lib/api/products';
import { getPackTiers } from '@/lib/api/bundles';
import { pageMeta } from '@/lib/site';
import PackBuilder from '../_components/PackBuilder';

export const revalidate = 300;

export const metadata = pageMeta({
  title: 'Build Your Pack — Velmique Maison de Parfum',
  description: 'Mix any VELMIQUE fragrances into one pack and save more as it grows.',
  path: '/pack',
});

export default async function PackPage() {
  const [res, tiers] = await Promise.all([
    getPublicProducts({ limit: 24 }),
    getPackTiers().catch(() => []),
  ]);
  const products = (res.products || []).filter((p) => p.inStock !== false);
  return <PackBuilder products={products} tiers={tiers} />;
}
