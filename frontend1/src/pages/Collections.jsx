import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicCategories } from '../services/publicindex';
import Header from '../components/Header';
import Footer from '../components/Footer';
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
    <>
      <Header />
      <div className="collections-container">
        <h1 className="section-title">Collections</h1>
        <div className="collections-grid">
          {categories.map((cat) => {
            let img = cat.image;
            let imageUrl = null;
            if (img) {
              if (img.startsWith('http')) {
                imageUrl = img;
              } else {
                const cleanedPath = img.replace(/(\/uploads\/categories\/)+/g, '/uploads/categories/');
                let baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
                if (cleanedPath.startsWith('/')) {
                  imageUrl = `${baseUrl}${cleanedPath}`;
                } else {
                  imageUrl = `${baseUrl}/${cleanedPath}`;
                }
              }
            }
            const [imageLoaded, setImageLoaded] = React.useState(false);
            return (
              <Link
                key={cat.id || cat._id}
                href={`/Products?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
              >
                <div style={{ position: 'relative', width: 200, height: 200 }}>
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={cat.name}
                        className="category-card-image"
                        style={{
                          width: 200,
                          height: 200,
                          background: '#eee',
                          display: 'block'
                        }}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                      />
                      {!imageLoaded && (
                        <div className="shimmer-placeholder" style={{ width: 200, height: 200, position: 'absolute', top: 0, left: 0 }} />
                      )}
                    </>
                  ) : (
                    <div style={{ width: 200, height: 200, background: '#eee', borderRadius: 8 }} />
                  )}
                </div>
                <div className="category-card-name">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Collections; 