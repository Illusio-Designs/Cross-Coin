import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';

const products = [
  {
    id: 1,
    name: 'Fun Pattern Crew',
    category: 'Kids Collection',
    price: 16,
    images: [
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop'
    ],
    badge: 'New',
    slug: 'fun-pattern-crew'
  },
  {
    id: 2,
    name: 'Colorful Ankle',
    category: 'Kids Collection',
    price: 14,
    images: [
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop'
    ],
    slug: 'colorful-ankle'
  },
  {
    id: 3,
    name: 'Sport Active',
    category: 'Kids Collection',
    price: 18,
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop'
    ],
    badge: 'Bestseller',
    slug: 'sport-active'
  },
  {
    id: 4,
    name: 'Cozy Cotton',
    category: 'Kids Collection',
    price: 15,
    images: [
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=800&fit=crop'
    ],
    slug: 'cozy-cotton'
  }
];

export default function KidsCollection() {
  return (
    <>
      <Head>
        <title>Kids Collection - Knitwink</title>
        <meta name="description" content="Fun designs, ultimate comfort for kids" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>Kids Collection</h1>
            <p>Fun designs, ultimate comfort</p>
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
