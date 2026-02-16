import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';

const products = [
  {
    id: 1,
    name: 'Premium Leather Jacket',
    brand: 'Gripzus',
    price: 299,
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&h=800&fit=crop'],
    slug: 'premium-leather-jacket'
  },
  {
    id: 2,
    name: 'Classic Denim Jeans',
    brand: 'Gripzus',
    price: 89,
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600&h=800&fit=crop'],
    slug: 'classic-denim-jeans'
  },
  {
    id: 3,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop'],
    slug: 'designer-sneakers'
  },
  {
    id: 4,
    name: 'Wool Coat',
    brand: 'Gripzus',
    price: 399,
    images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop'],
    slug: 'wool-coat'
  }
];

export default function Men() {
  return (
    <>
      <Head>
        <title>Men&apos;s Collection - Gripzus</title>
        <meta name="description" content="Shop men's fashion at Gripzus" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">For Him</span>
                <h1 className="sectionTitle">Men&apos;s Collection</h1>
              </div>
            </div>
            <div className="productsGrid">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
