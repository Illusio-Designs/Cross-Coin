import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicCategories } from '../services/publicindex';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SeoWrapper from '../console/SeoWrapper';
import Loader from '../components/Loader';
import '../styles/pages/Collections.css';

const Collections = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getPublicCategories();
        console.log('Categories response received:', response);
        
        // The API service already returns response.data, so response should be an array
        if (Array.isArray(response)) {
          setCategories(response);
        } else if (response && response.data && Array.isArray(response.data)) {
          // Fallback: if response has a data property
          setCategories(response.data);
        } else if (response && typeof response === 'object') {
          // If response is an object but not an array, log it and show error
          console.error('Unexpected response format:', response);
          setError('Invalid data format received from server');
        } else {
          console.error('Categories data is not in expected format:', response);
          setError('Invalid data format received from server');
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message || 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  if (loading || !isMounted) {
    return (
      <SeoWrapper pageName="categories">
        <Header />
        <div className="collections-container">
          <h1 className="section-title">Collections</h1>
          <div className="loading-state">
            <Loader />
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
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
            >
              Retry
            </button>
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
            // Safety check for category object
            if (!cat || !cat.name) {
              console.warn('Invalid category object:', cat);
              return null;
            }
            
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
                key={cat.id || cat._id || cat.name}
                href={`/Products?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
                onClick={() => console.log('Navigating to category:', cat.name)}
              >
                <div className="category-card-image-wrapper">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={cat.name}
                      className="category-card-image"
                      onError={(e) => {
                        console.error('Failed to load image:', imageUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="category-card-info">
                  <div className="category-card-name">{cat.name}</div>
                </div>
              </Link>
            );
          }).filter(Boolean) // Remove null entries
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