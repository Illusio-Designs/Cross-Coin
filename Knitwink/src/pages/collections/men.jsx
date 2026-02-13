import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';

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
    id: 3,
    name: 'Merino Wool Blend',
    category: 'Premium Collection',
    price: 35,
    images: [
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop'
    ],
    slug: 'merino-wool-blend'
  },
  {
    id: 4,
    name: 'Compression Sport',
    category: 'Sports Collection',
    price: 32,
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop'
    ],
    slug: 'compression-sport'
  }
];

export default function MenCollection() {
  return (
    <>
      <Head>
        <title>Men's Collection - Knitwink</title>
        <meta name="description" content="Premium socks for men" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>Men's Collection</h1>
            <p>Premium comfort for every occasion</p>
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
