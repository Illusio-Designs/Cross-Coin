import Link from 'next/link';
import { getPublicCategories } from '@/lib/api/categories';
import { absUrl, seoMeta } from '@/lib/site';
import { ik, ikSrcSet } from '@/lib/imagekit';
import SkImg from '../_components/SkImg';

export const revalidate = 300;

// Dashboard SEO ('categories') over the page's own copy.
export async function generateMetadata() {
  return seoMeta('categories', {
    title: 'Collections — Velmique Maison de Parfum',
    description: 'Discover VELMIQUE’s fragrance collections — each a world of rare ingredients, crafted in India.',
    path: '/collections',
  });
}

export default async function CollectionsIndex() {
  const collections = await getPublicCategories().catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Velmique Collections',
    url: absUrl('/collections'),
    hasPart: collections.slice(0, 24).map((c) => ({ '@type': 'Collection', name: c.name, url: absUrl(`/collections/${c.slug}`) })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Curated worlds</span>
        <h1>Our Collections.</h1>
        <p>Each collection tells a story — discover the world of VELMIQUE through its distinct fragrance universes.</p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {collections.length ? (
          <div className="m-colgrid">
            {collections.map((c, i) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className={`m-colcard ${i === 0 && collections.length > 2 ? 'wide' : ''}`}>
                <span className="m-colcard__img">
                  {c.image ? (
                    <SkImg
                      src={ik(c.image, i === 0 ? 1600 : 800)}
                      srcSet={ikSrcSet(c.image, i === 0 ? [800, 1200, 1600] : [600, 800, 1200])}
                      sizes={i === 0 ? '(max-width: 1180px) 100vw, 1140px' : '(max-width: 860px) 100vw, 570px'}
                      alt=""
                      loading={i < 2 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                    />
                  ) : null}
                </span>
                <span className="m-colcard__shade" />
                <span className="m-colcard__b">
                  {c.tagline ? <span className="m-eyebrow">{c.tagline}</span> : null}
                  <span className="m-colcard__t">{c.name}</span>
                  {c.description ? <span className="m-colcard__d">{c.description}</span> : null}
                  <span className="m-colcard__go">
                    {c.productCount > 0 ? `${c.productCount} fragrance${c.productCount === 1 ? '' : 's'} · ` : ''}Explore <span className="m-arrow">→</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="m-empty">
            <h3>Collections are on their way</h3>
            <p style={{ marginBottom: 20 }}>Meanwhile, every fragrance is waiting in the shop.</p>
            <Link className="m-btn m-btn--fill" href="/shop">Shop all fragrances</Link>
          </div>
        )}
      </div>
    </>
  );
}
