import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicCategories } from '../services/publicindex';

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

  if (loading) return <div style={{ textAlign: 'center', marginTop: 40 }}>Loading categories...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</div>;

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 30 }}>Collections</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
        {categories.map((cat) => (
          <Link key={cat.id || cat._id} href={`/category/${cat.slug || cat.name}`}
            style={{
              display: 'block',
              border: '1px solid #eee',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
              textDecoration: 'none',
              color: '#222',
              background: '#fafbfc',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            {cat.image && (
              <img src={cat.image.startsWith('http') ? cat.image : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${cat.image}`}
                alt={cat.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', marginBottom: 12 }} />
            )}
            <div style={{ fontWeight: 600, fontSize: 18 }}>{cat.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Collections; 