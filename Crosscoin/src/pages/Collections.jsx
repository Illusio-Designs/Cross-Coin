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
  const [retryCount, setRetryCount] = useState(0);
  
  // Safety guard: Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  useEffect(() => {
    setIsMounted(true);
    
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getPublicCategories();
        console.log('Categories response received:', response, 'Type:', typeof response, 'IsArray:', Array.isArray(response));
        
        // More flexible response handling
        let categoriesData = [];
        
        if (Array.isArray(response)) {
          // Direct array response (expected format)
          categoriesData = response;
        } else if (response && Array.isArray(response.data)) {
          // Response with data property
          categoriesData = response.data;
        } else if (response && response.categories && Array.isArray(response.categories)) {
          // Response with categories property
          categoriesData = response.categories;
        } else if (response && typeof response === 'object' && Object.keys(response).length > 0) {
          // Try to extract array from response object
          const possibleArrays = Object.values(response).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            categoriesData = possibleArrays[0];
          } else {
            // If response is an object but not an array, it might be an error response
            console.error('Unexpected response format:', response);
            // Don't set error immediately, wait for retry
            categoriesData = [];
          }
        }
        
        // Always set categories, even if empty
        setCategories(categoriesData);
        
        // Only set error if we explicitly got an error response
        if (categoriesData.length === 0 && response && response.message) {
          setError(response.message);
        }
        
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message || 'Failed to fetch categories');
        setCategories([]); // Ensure categories is set to empty array on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [retryCount]);
  
  // Safety timeout: If still loading after 8 seconds, show error
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (loading && categories.length === 0) {
          console.log('Loading timeout reached');
          setLoading(false);
          if (!error) {
            setError('Request timed out. Please try again.');
          }
        }
      }, 8000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading, categories.length, error]);

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
                setRetryCount(prev => prev + 1);
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
          {safeCategories.length > 0 ? (
            safeCategories.map((cat) => {
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