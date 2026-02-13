import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';

const products = [
  {
    id: 1,
    name: 'Silk Scarf',
    brand: 'Gripzus',
    price: 79,
    images: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&h=800&fit=crop'],
    slug: 'silk-scarf'
  },
  {
    id: 2,
    name: 'Leather Bag',
    brand: 'Gripzus',
    price: 249,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop'],
    slug: 'leather-bag'
  },
  {
    id: 3,
    name: 'Cashmere Sweater',
    brand: 'Gripzus',
    price: 189,
    images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=800&fit=crop'],
    slug: 'cashmere-sweater'
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

export default function Women() {
  return (
    <>
      <Head>
        <title>Women's Collection - Gripzus</title>
        <meta name="description" content="Shop women's fashion at Gripzus" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">For Her</span>
                <h1 className="sectionTitle">Women's Collection</h1>
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
