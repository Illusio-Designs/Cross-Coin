import Link from 'next/link';
import { getCategoryBySlug } from '@/lib/api/categories';
import { absUrl, pageMeta } from '@/lib/site';
import ShopGrid from '../../_components/ShopGrid';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params?.slug || '');
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: 'Collection — Velmique', robots: { index: false, follow: true } };
  return pageMeta({
    title: `${cat.name} — Velmique Maison de Parfum`,
    description: cat.description?.slice(0, 160) || `Explore the ${cat.name} collection from the VELMIQUE maison.`,
    path: `/collections/${cat.slug}`,
    image: cat.image || undefined,
  });
}

export default async function MaisonCollection({ params }) {
  const slug = decodeURIComponent(params?.slug || '');
  const cat = await getCategoryBySlug(slug);

  if (!cat) {
    return (
      <section className="m-section"><div className="m-wrap" style={{ textAlign: 'center' }}>
        <span className="m-eyebrow">Not found</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '14px 0 18px' }}>This collection has moved on.</h1>
        <p style={{ color: 'var(--m-ink-soft)', marginBottom: 24 }}>Browse every collection instead.</p>
        <Link className="m-btn m-btn--fill" href="/collections" style={{ justifyContent: 'center' }}>All collections</Link>
      </div></section>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Collections', item: absUrl('/collections') },
      { '@type': 'ListItem', position: 2, name: cat.name, item: absUrl(`/collections/${cat.slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="m-wrap m-ph">
        <span className="m-eyebrow"><Link href="/collections">Collections</Link> · {cat.name}</span>
        <h1>{cat.name}</h1>
        <p>{cat.description || 'A curated selection from the VELMIQUE maison.'}</p>
      </section>
      <ShopGrid categoryId={cat.id} />
    </>
  );
}
