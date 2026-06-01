import React from 'react';
import Link from 'next/link';
import { useCategories } from '../hooks/queries/useProducts';
import SeoWrapper from '../console/SeoWrapper';
import Loader from '../components/common/Loader';
import SafeImage from '../components/common/SafeImage';
import { fetchPageSeo } from '../utils/fetchPageSeo';

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('categories', ctx) } };
}

const Collections = ({ seoData }) => {
  const { data: categories = [], isLoading, error, refetch } = useCategories();

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
                  href={`/Products?category=${encodeURIComponent(cat.name)}`}
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
      </div>
    </SeoWrapper>
  );
};

export default Collections;
