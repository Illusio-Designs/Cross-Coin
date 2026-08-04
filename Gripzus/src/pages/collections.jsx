import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import CollectionCard from '../components/products/CollectionCard';
import SeoWrapper from '../components/SeoWrapper';
import { getPublicCategories } from '../services/categories';

/* Collections — editorial edition.
   A large featured collection leads the page, then the rest fall into big
   two-up gallery tiles. Generous whitespace, oversized display type, hairline
   framing — the same magazine language as the home page. */

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicCategories()
      .then((list) => setCollections(Array.isArray(list) ? list : []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = collections;
  const hrefFor = (c) =>
    `/products?collection=${encodeURIComponent(c?.slug || (c?.name || '').trim())}`;

  return (
    <SeoWrapper pageName="categories">
      <PageHero
        eyebrow="Curated worlds"
        title="The"
        accent="collections."
        intro="Every Gripzus chapter — shop the pairs made for each kind of movement."
      />

      <section className="section-y">
        <div className="wrap">
          {loading ? (
            <div className="space-y-5">
              <div className="aspect-[16/10] md:aspect-[21/9] rounded-2xl bg-paper-deep animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[4/3] rounded-2xl bg-paper-deep animate-pulse" />
                ))}
              </div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border border-line">
              <p className="h-display text-3xl md:text-4xl text-ink mb-3">No collections yet</p>
              <p className="prose-body mb-7">The first chapters are being knit. In the meantime —</p>
              <Link href="/products" className="btn-outline inline-flex">Browse all pairs</Link>
            </div>
          ) : (
            <div className="space-y-12 md:space-y-16">
              {/* Featured — full-width lead */}
              {featured && (
                <Link href={hrefFor(featured)} className="group block">
                  <div className="media-zoom relative aspect-[16/11] sm:aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl border border-line bg-paper-warm">
                    {featured.image
                      ? <img src={featured.image} alt={featured.name} className="absolute inset-0 w-full h-full object-cover" />
                      : <div className="absolute inset-0 bg-paper-deep" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="absolute top-5 left-6 text-paper/70 text-[11px] tracking-[0.22em] tabular-nums z-10">
                      FEATURED · 01
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 z-10">
                      <h2 className="h-display text-paper leading-[1.02] text-3xl sm:text-4xl md:text-6xl max-w-3xl">
                        {featured.name}
                      </h2>
                      <div className="mt-4 flex items-center gap-4">
                        <span className="inline-flex items-center gap-2 text-paper text-[11px] font-medium tracking-[0.14em] uppercase">
                          Explore the edit
                          <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                        </span>
                        {typeof featured.count === 'number' && featured.count > 0 && (
                          <span className="text-paper/60 text-[11px] tabular-nums">{featured.count} pairs</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* The rest — big two-up gallery tiles */}
              {rest.length > 0 && (
                <div>
                  <div className="flex items-baseline justify-between mb-6 md:mb-8">
                    <p className="eyebrow text-ink-muted">All collections</p>
                    <span className="spec">{collections.length} in total</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
                    {rest.map((c, i) => (
                      <CollectionCard
                        key={c.id ?? c.slug ?? i}
                        collection={c}
                        index={i + 1}
                        ratio="aspect-[4/3] sm:aspect-[4/3.2]"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </SeoWrapper>
  );
}
