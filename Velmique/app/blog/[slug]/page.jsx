import ClientPage from './ClientPage';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://velmique.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'velmique';

async function fetchPost(slug) {
  try {
    const r = await fetch(`${API}/api/blogs/${encodeURIComponent(slug)}`, {
      headers: { 'X-Brand-Name': BRAND },
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data || j?.post || j;
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await fetchPost(slug);
  if (!p) return { title: 'Journal — Velmique' };
  const title = `${p.title} — Velmique Journal`;
  const description = (p.excerpt || p.body || '').replace(/<[^>]*>/g, '').slice(0, 160);
  const image = p.coverImage || p.image || `${SITE}/og.jpg`;
  const url = `${SITE}/blog/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [{ url: image }], type: 'article', publishedTime: p.publishedAt, authors: [p.author].filter(Boolean) },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: (post.excerpt || '').slice(0, 200),
    image: post.coverImage || post.image,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Person', name: post.author || 'Velmique Editorial' },
    publisher: { '@type': 'Organization', name: 'Velmique', logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    mainEntityOfPage: `${SITE}/blog/${slug}`,
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ClientPage initialPost={post} />
    </>
  );
}
