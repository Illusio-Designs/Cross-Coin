import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import CollectionCard from '../components/products/CollectionCard';
import SeoWrapper from '../components/SeoWrapper';
import { getPublicCategories } from '../services/categories';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicCategories()
      .then((list) => setCollections(Array.isArray(list) ? list : []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-paper-deep animate-pulse" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-line">
              <p className="h-display text-3xl text-ink mb-3">No collections yet</p>
              <Link href="/products" className="btn-outline inline-flex">Browse all pairs</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {collections.map((c, i) => (
                <CollectionCard
                  key={c.id ?? c.slug ?? i}
                  collection={c}
                  index={i}
                  ratio="aspect-[4/5]"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </SeoWrapper>
  );
}
