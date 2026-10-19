import Link from 'next/link';
import { getCategoryBySlug } from '@/lib/api/categories';
import ShopGrid from '../../_components/ShopGrid';

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params?.slug || '');
  const cat = await getCategoryBySlug(slug);
  return {
    title: cat ? `${cat.name} — Velmique Maison de Parfum` : 'Collection — Velmique',
    description: cat?.description?.slice(0, 160) || 'Explore this VELMIQUE fragrance collection.',
  };
}

export default async function MaisonCollection({ params }) {
  const slug = decodeURIComponent(params?.slug || '');
  const cat = await getCategoryBySlug(slug);

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow"><Link href="/test/shop">Collections</Link> · {cat?.name || slug}</span>
        <h1>{cat?.name || 'Collection'}</h1>
        {cat?.description ? <p>{cat.description}</p> : <p>A curated selection from the VELMIQUE maison.</p>}
      </section>
      <ShopGrid initialCategory={cat?.name || ''} />
    </>
  );
}
