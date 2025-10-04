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
        const data = await getPublicCategories();
        setCategories(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <SeoWrapper pageName="categories">
      <Header />
      <div className="collections-container">
        <h1 className="section-title">Collections</h1>
        <div className="collections-grid">
          {categories.map((cat) => {
            // Home page logic for image URL
            let img = cat.image;
            let imageUrl = '/assets/card1-left.webp';
            if (img) {
              if (img.startsWith('http')) {
                imageUrl = img;
              } else {
                // Remove duplicate /uploads/categories/
                const cleanedPath = img.replace(/(\/uploads\/categories\/)+/g, '/uploads/categories/');
                let baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
                if (cleanedPath.startsWith('/')) {
                  imageUrl = `${baseUrl}${cleanedPath}`;
                } else {
                  imageUrl = `${baseUrl}/${cleanedPath}`;
                }
              }
            }
            return (
              <Link
                key={cat.id || cat._id}
                href={`/products?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
                onClick={() => console.log('Navigating to category:', cat.name)}
              >
                <img
                  src={imageUrl}
                  alt={cat.name}
                  className="category-card-image"
                />
                <div className="category-card-name">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </SeoWrapper>
  );
};

export default Collections; 