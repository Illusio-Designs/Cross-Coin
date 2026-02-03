import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicCategories } from '../services/publicindex';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SeoWrapper from '../console/SeoWrapper';
import '../styles/pages/Collections.css';

const Collections = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getPublicCategories();
        console.log('Categories response received:', response);
        
        // Handle both direct data and response object formats
        let data;
        if (response && response.data && Array.isArray(response.data)) {
          // Response object format: {data: [...], status: 200, ...}
          data = response.data;
        } else if (Array.isArray(response)) {
          // Direct array format
          data = response;
        } else {
          console.error('Categories data is not in expected format:', response);
          setError('Invalid data format received from server');
          return;
        }
        
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message || 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <SeoWrapper pageName="categories">
        <Header />
        <div className="collections-container">
          <h1 className="section-title">Collections</h1>
          <div className="loading-state">
            <p>Loading collections...</p>
          </div>
        </div>
        <Footer />
      </SeoWrapper>
    );
  }

  if (error) {
    return (
      <SeoWrapper pageName="categories">
        <Header />
        <div className="collections-container">
          <h1 className="section-title">Collections</h1>
          <div className="error-state">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
        <Footer />
      </SeoWrapper>
    );
  }

  return (
    <SeoWrapper pageName="categories">
      <Header />
      <div className="collections-container">
        <h1 className="section-title">Collections</h1>
        <div className="collections-grid">
          {categories && Array.isArray(categories) && categories.length > 0 ? (
            categories.map((cat) => {
            // Simple image URL construction
            let imageUrl = null; // No fallback image
            
            if (cat.image) {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
              
              if (cat.image.startsWith('http')) {
                // Already a full URL
                imageUrl = cat.image;
              } else if (cat.image.startsWith('/uploads/')) {
                // Already has /uploads/ prefix, just add base URL
                imageUrl = `${baseUrl}${cat.image}`;
              } else {
                // Just a filename, add full path
                imageUrl = `${baseUrl}/uploads/categories/${cat.image}`;
              }
            }
            
            return (
              <Link
                key={cat.id || cat._id}
                href={`/Products?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
                onClick={() => console.log('Navigating to category:', cat.name)}
              >
                <div className="category-card-image-wrapper">
                  <img
                    src={imageUrl}
                    alt={cat.name}
                    className="category-card-image"
                    onError={(e) => {
                      console.error('Failed to load image:', imageUrl);
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="category-card-wishlist"></div>
                </div>
                <div className="category-card-info">
                  <div className="category-card-name">{cat.name}</div>
                  <div className="category-card-footer">
                    <div className="category-card-view"></div>
                  </div>
                </div>
              </Link>
            );
          })
          ) : (
            <div className="no-categories-state">
              <p>No collections available at the moment.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </SeoWrapper>
  );
};

export default Collections; 