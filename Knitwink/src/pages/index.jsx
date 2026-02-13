import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';

const featuredProducts = [
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
  }
];

export default function Home() {
  return (
    <>
      <Head>
        <title>KNITWINK - Luxury in Every Step</title>
        <meta name="description" content="Experience unparalleled comfort and style with KNITWINK premium socks collection" />
        <link rel="icon" href="/Knitwinkfavicon.jpeg" />
      </Head>

      <Header />

      <main className="main">
        {/* Hero Section */}
        <section className="hero">
          <div className="heroBackground"></div>
          <div className="container">
            <div className="heroContent">
              <span className="heroLabel">Premium Comfort</span>
              <h1 className="heroTitle">
                Luxury in <span className="gradientText">Every Step</span>
              </h1>
              <p className="heroDescription">
                Experience unparalleled comfort with our handcrafted premium socks collection
              </p>
              <div className="heroButtons">
                <Link href="/shop" className="btn btn-primary btn-lg">
                  Shop Collection
                </Link>
                <Link href="/about" className="btn btn-outline btn-lg">
                  Our Story
                </Link>
              </div>
            </div>
          </div>
          <div className="scrollIndicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <div className="container">
            <div className="featuresGrid">
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="featureTitle">Free Shipping</h3>
                <p className="featureDescription">On all orders over $50</p>
              </div>
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="featureTitle">Premium Quality</h3>
                <p className="featureDescription">Handcrafted with finest materials</p>
              </div>
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <h3 className="featureTitle">24/7 Support</h3>
                <p className="featureDescription">Always here to help you</p>
              </div>
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="featureTitle">Easy Returns</h3>
                <p className="featureDescription">30-day hassle-free returns</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="categories">
          <div className="container">
            <div className="sectionHeader">
              <span className="sectionLabel">Shop by Category</span>
              <h2 className="sectionTitle">Find Your Perfect Fit</h2>
            </div>
            <div className="categoriesGrid">
              <Link href="/collections/men" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop" alt="Men's Collection" />
                  <div className="categoryOverlay"></div>
                </div>
                <div className="categoryContent">
                  <h3 className="categoryName">Men's Collection</h3>
                  <p className="categoryDescription">Premium comfort for every occasion</p>
                  <span className="categoryLink">
                    Shop Now
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </Link>
              <Link href="/collections/women" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&h=1000&fit=crop" alt="Women's Collection" />
                  <div className="categoryOverlay"></div>
                </div>
                <div className="categoryContent">
                  <h3 className="categoryName">Women's Collection</h3>
                  <p className="categoryDescription">Elegant styles, exceptional quality</p>
                  <span className="categoryLink">
                    Shop Now
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </Link>
              <Link href="/collections/kids" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&h=1000&fit=crop" alt="Kids Collection" />
                  <div className="categoryOverlay"></div>
                </div>
                <div className="categoryContent">
                  <h3 className="categoryName">Kids Collection</h3>
                  <p className="categoryDescription">Fun designs, ultimate comfort</p>
                  <span className="categoryLink">
                    Shop Now
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Products Section */}
        <section className="featuredProducts">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionLabel">Handpicked for You</span>
                <h2 className="sectionTitle">Featured Collection</h2>
              </div>
              <Link href="/shop" className="viewAll">
                View All →
              </Link>
            </div>
            <div className="productsGrid">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="newsletter">
          <div className="container">
            <div className="newsletterContent">
              <h2>Join Our Community</h2>
              <p>Get exclusive offers, new arrivals, and style inspiration</p>
              <form className="newsletterForm">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="newsletterInput"
                  required
                />
                <button type="submit" className="btn btn-primary">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
