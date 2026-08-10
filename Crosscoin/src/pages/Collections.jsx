import React from 'react';
import Link from 'next/link';
import { useCategories } from '../hooks/queries/useProducts';
import SeoWrapper from '../console/SeoWrapper';
import Loader from '../components/common/Loader';
import SafeImage from '../components/common/SafeImage';
import ProductFaqSection from '../components/common/ProductFaqSection';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import { fetchPageFaqs } from '../utils/fetchPageFaqs';
import { collectionUrl } from '../utils/collectionUrl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Fetch the category list on the server so the grid is in the first HTML
// (edge-cached), instead of every visitor waiting on a client-side request to
// the slow origin API before anything appears.
async function fetchCategories() {
  try {
    const r = await fetch(`${API_URL}/api/categories/listing`, {
      headers: { 'X-Brand-Name': 'crosscoin' },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
  } catch {
    return [];
  }
}

export async function getServerSideProps(ctx) {
  const [seoData, faqs, initialCategories] = await Promise.all([
    fetchPageSeo('categories', ctx),
    fetchPageFaqs('categories', ctx),
    fetchCategories(),
  ]);
  // CDN-cache the rendered page for 5 min so most visitors get it from the edge.
  ctx.res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=86400'
  );
  return { props: { seoData, pageFaqs: faqs.pageFaqs, globalFaqs: faqs.globalFaqs, initialCategories } };
}

const Collections = ({ seoData, pageFaqs = [], globalFaqs = [], initialCategories = [] }) => {
  // Seed React Query with the server-fetched list so the grid renders instantly
  // (no loading spinner) and doesn't refetch on the client.
  const { data: categories = [], isLoading, error, refetch } = useCategories({
    initialData: initialCategories.length ? initialCategories : undefined,
  });

  // Safety guard: Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  if (isLoading) {
    return (
      <SeoWrapper pageName="categories" seoData={seoData}>
        <div className="collections-container">
          <div className="collections-header">
            <div className="section-header-inline">
              <h1 className="section-header-h2">Our <strong>Collections</strong></h1>
              <p className="section-header-sub">Explore our curated selection</p>
            </div>
          </div>
          <div className="loading-state">
            <Loader />
          </div>
        </div>
      </SeoWrapper>
    );
  }

  if (error) {
    return (
      <SeoWrapper pageName="categories" seoData={seoData}>
        <div className="collections-container">
          <div className="collections-header">
            <div className="section-header-inline">
              <h1 className="section-header-h2">Our <strong>Collections</strong></h1>
              <p className="section-header-sub">Explore our curated selection</p>
            </div>
          </div>
          <div className="error-state">
            <p>Error: {error.message || 'Failed to fetch categories'}</p>
            <button onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  return (
    <SeoWrapper pageName="categories" seoData={seoData}>
      <div className="collections-container">
        <div className="collections-header">
          <div className="section-header-inline">
            <h1 className="section-header-h2">Our <strong>Collections</strong></h1>
            <p className="section-header-sub">Explore our curated selection</p>
          </div>
        </div>
        <div className="collections-grid">
          {safeCategories.length > 0 ? (
            safeCategories.map((cat) => {
              if (!cat || !cat.name) return null;
              return (
                <Link
                  key={cat.id || cat._id || cat.name}
                  href={collectionUrl(cat)}
                  className="category-card"
                >
                  <div className="category-card-image-wrapper">
                    {cat.image && (
                      <SafeImage
                        imageData={cat.image}
                        alt={cat.name}
                        className="category-card-image"
                        width="100%"
                        height="300"
                        style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
                      />
                    )}
                    {!cat.image && (
                      <div className="category-card-placeholder">
                        <span>{cat.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="category-card-info">
                    <div className="category-card-name">{cat.name}</div>
                  </div>
                </Link>
              );
            }).filter(Boolean)
          ) : (
            <div className="no-categories-state">
              <p>No collections available at the moment.</p>
            </div>
          )}
        </div>
        {(pageFaqs.length > 0 || globalFaqs.length > 0) && (
          <div className="collections-container" style={{ paddingTop: 0 }}>
            <ProductFaqSection productFaqs={pageFaqs} globalFaqs={globalFaqs} />
          </div>
        )}
      </div>
    </SeoWrapper>
  );
};

export default Collections;
