import ClientPage from './ClientPage';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velmique';

export const revalidate = 600;

async function fetchCollections() {
  try {
    const r = await fetch(`${API}/api/categories`, {
      headers: { 'X-Brand-Name': BRAND },
      next: { revalidate: 600 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : (j.data || j.items || []);
  } catch { return []; }
}

export const metadata = {
  title: 'Collections — Velmique',
  description: 'Discover Velmique\'s curated fragrance collections — each a study in rare ingredients and editorial restraint.',
  alternates: { canonical: `${SITE}/collections` },
  openGraph: {
    title: 'Collections — Velmique',
    description: 'Discover Velmique\'s curated fragrance collections.',
    url: `${SITE}/collections`,
    type: 'website',
  },
};

export default async function Page() {
  const collections = await fetchCollections();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Velmique Collections',
    url: `${SITE}/collections`,
    hasPart: collections.slice(0, 24).map((c) => ({
      '@type': 'Collection',
      name: c.name || c.title,
      url: `${SITE}/collections/${c.slug || c.handle || c.id}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ClientPage initialCollections={collections} />
    </>
  );
}
