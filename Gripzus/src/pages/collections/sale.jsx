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
    salePrice: 249,
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'premium-leather-jacket'
  },
  {
    id: 2,
    name: 'Wool Coat',
    brand: 'Gripzus',
    price: 399,
    salePrice: 299,
    images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'wool-coat'
  },
  {
    id: 3,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    salePrice: 119,
    images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'designer-sneakers'
  },
  {
    id: 4,
    name: 'Leather Bag',
    brand: 'Gripzus',
    price: 249,
    salePrice: 199,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'leather-bag'
  }
];

export default function Sale() {
  return (
    <>
      <Head>
        <title>Sale - Up to 70% Off - Gripzus</title>
        <meta name="description" content="Shop sale items at Gripzus - Up to 70% off" />
      </Head>

      <Header />

      <main className="main">
        <section className="promoBanner" style={{ padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            <div className="promoContent">
              <h1 style={{ fontSize: 'var(--font-size-4xl)', margin: 0 }}>Summer Sale</h1>
              <p style={{ margin: 'var(--spacing-md) 0' }}>Get Up To 70% Off</p>
            </div>
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
    </>
  );
}
