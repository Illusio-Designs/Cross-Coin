import { getAllProducts } from '@/lib/api';
import ShiprocketTestClient from './ShiprocketTestClient';

// Staff-only test page for the live Shiprocket Checkout. Not linked from the
// store, kept out of search (noindex + robots.txt) and out of the sitemap.
export const metadata = { title: 'Shiprocket checkout test', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ShiprocketTestPage() {
  const products = await getAllProducts();
  // One entry per product (the catalog splits products by colour), with the
  // variants a tester can pick.
  const seen = new Map();
  for (const p of products) {
    const key = p.id;
    const prev = seen.get(key);
    const variants = (p.variants || []).map((v) => ({
      id: v.id,
      label: [v.color, v.size].filter(Boolean).join(' / ') || v.sku || `Variant ${v.id}`,
      price: v.price,
      stock: v.stock,
    }));
    if (prev) {
      for (const v of variants) if (!prev.variants.some((x) => x.id === v.id)) prev.variants.push(v);
    } else {
      // The catalog names colour splits "Name — Colour"; the variant label has the colour.
      seen.set(key, { id: p.id, name: String(p.name || '').split(' — ')[0], variants });
    }
  }
  const list = [...seen.values()].filter((p) => p.variants.length);
  return <ShiprocketTestClient products={list} />;
}
