import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';

const products = [
  {
    id: 1,
    name: 'Classic Crew Socks',
    category: 'Everyday Comfort',
    price: 24,
    images: [
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop'
    ],
    badge: 'Bestseller',
    slug: 'classic-crew-socks'
  },
  {
    id: 2,
    name: 'Merino Wool Blend',
    category: 'Premium Collection',
    price: 35,
    salePrice: 28,
    images: [
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop'
    ],
    badge: 'Sale',
    slug: 'merino-wool-blend'
  },
  {
    id: 3,
    name: 'Athletic Performance',
    category: 'Sports Collection',
    price: 28,
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop'
    ],
    badge: 'New',
    slug: 'athletic-performance'
  },
  {
    id: 4,
    name: 'Luxury Cashmere',
    category: 'Premium Collection',
    price: 45,
    images: [
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=800&fit=crop'
    ],
    slug: 'luxury-cashmere'
  },
  {
    id: 5,
    name: 'Cotton Blend Ankle',
    category: 'Everyday Comfort',
    price: 18,
    images: [
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop'
    ],
    slug: 'cotton-blend-ankle'
  },
  {
    id: 6,
    name: 'Bamboo Comfort',
    category: 'Eco Collection',
    price: 26,
    images: [
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop'
    ],
    badge: 'New',
    slug: 'bamboo-comfort'
  },
  {
    id: 7,
    name: 'Compression Sport',
    category: 'Sports Collection',
    price: 32,
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop'
    ],
    slug: 'compression-sport'
  },
  {
    id: 8,
    name: 'Silk Luxury',
    category: 'Premium Collection',
    price: 55,
    images: [
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=800&fit=crop'
    ],
    badge: 'Bestseller',
    slug: 'silk-luxury'
  }
];

export default function Shop() {
  return (
    <>
      <Head>
        <title>Shop All - Knitwink</title>
        <meta name="description" content="Shop our complete collection of premium socks" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>All Products</h1>
            <p>Discover our complete collection of premium socks</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="productsGrid">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .main {
          min-height: 60vh;
        }

        .pageHeader {
          padding: var(--spacing-4xl) 0 var(--spacing-3xl);
          text-align: center;
          background: var(--color-gray-100);
        }

        .pageHeader h1 {
          font-size: var(--font-size-5xl);
          font-weight: var(--font-weight-black);
          margin-bottom: var(--spacing-md);
        }

        .pageHeader p {
          font-size: var(--font-size-lg);
          color: var(--color-gray-600);
        }

        .productsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-2xl);
        }

        @media (max-width: 1024px) {
          .productsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .pageHeader h1 {
            font-size: var(--font-size-4xl);
          }

          .productsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
