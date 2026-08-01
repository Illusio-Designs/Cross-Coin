import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import SeoWrapper from '../components/SeoWrapper';
import { getPublicCategories } from '../services/categories';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getPublicCategories()
      .then((list) => setCollections(Array.isArray(list) ? list : []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  const current = collections[active];

  return (
    <SeoWrapper pageName="categories">
      <PageHero
        eyebrow="Curated worlds"
        title="The"
        accent="collections."
        intro="Every Gripzus chapter. Hover an index entry to preview — pick one to enter."
      />

      <section className="section-y">
        <div className="wrap">

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded bg-paper-deep animate-pulse" />
                ))}
              </div>
              <div className="hidden lg:block h-[60vh] rounded-xl bg-paper-deep animate-pulse" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20">
              <p className="h-display text-3xl text-ink mb-3">No collections yet</p>
              <Link href="/products" className="btn-outline inline-flex">Browse all pairs</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-start">

              {/* Index list */}
              <ol className="border-t border-line">
                {collections.map((c, i) => (
                  <li key={c.id ?? c.slug ?? i}>
                    <Link
                      href={`/products?collection=${encodeURIComponent(c.slug || c.name)}`}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      className={`group flex items-center gap-5 md:gap-8 py-6 md:py-8 border-b border-line transition-colors ${
                        active === i ? 'opacity-100' : 'lg:opacity-45 hover:opacity-100'
                      }`}
                    >
                      <span className="font-display text-ink-muted text-sm w-8 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h2 className="h-display text-ink leading-[1.05]" style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.5rem)' }}>
                          {c.name}
                        </h2>
                        {c.tagline && (
                          <div className="hidden sm:block mt-2 max-w-xl">
                            <p className="prose-body text-sm line-clamp-2">{c.tagline}</p>
                          </div>
                        )}
                      </div>
                      {c.image && (
                        <div className="lg:hidden w-20 h-24 shrink-0 overflow-hidden rounded bg-paper-deep">
                          <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="shrink-0 text-ink transition-transform group-hover:translate-x-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 17L17 7M10 7h7v7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              {/* Preview pane — sticky, screen-height */}
              <div className="hidden lg:block sticky top-[88px]">
                <div className="relative h-[calc(100vh-120px)] overflow-hidden rounded-xl bg-paper-deep">
                  {collections.map((c, i) => (
                    c.image ? (
                      <img
                        key={c.id ?? c.slug ?? i}
                        src={c.image}
                        alt={c.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                          active === i ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ) : null
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <p className="eyebrow text-paper/75 mb-1.5">Collection</p>
                    <p className="h-display text-paper text-3xl">{current?.name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </SeoWrapper>
  );
}
