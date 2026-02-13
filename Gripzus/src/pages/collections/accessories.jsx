import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';

const products = [
  {
    id: 1,
    name: 'Luxury Watch',
    brand: 'Gripzus',
    price: 599,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=800&fit=crop'],
    badge: 'Bestseller',
    slug: 'luxury-watch'
  },
  {
    id: 2,
    name: 'Silk Scarf',
    brand: 'Gripzus',
    price: 79,
    images: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&h=800&fit=crop'],
    slug: 'silk-scarf'
  },
  {
    id: 3,
    name: 'Leather Bag',
    brand: 'Gripzus',
    price: 249,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop'],
    slug: 'leather-bag'
  },
  {
    id: 4,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop'],
    slug: 'designer-sneakers'
  }
];

export default function Accessories() {
  return (
    <>
      <Head>
        <title>Accessories - Gripzus</title>
        <meta name="description" content="Shop accessories at Gripzus" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">Complete Your Look</span>
                <h1 className="sectionTitle">Accessories</h1>
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
