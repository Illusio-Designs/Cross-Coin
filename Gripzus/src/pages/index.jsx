import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';

// Sample product data
const featuredProducts = [
  {
    id: 1,
    name: 'Premium Leather Jacket',
    brand: 'Gripzus',
    price: 299,
    salePrice: 249,
    images: ['https://placehold.co/600x800/1a1a1a/d4af37/png?text=Leather+Jacket', 'https://placehold.co/600x800/2d2d2d/d4af37/png?text=Leather+Jacket'],
    badge: 'Sale',
    slug: 'premium-leather-jacket'
  },
  {
    id: 2,
    name: 'Classic Denim Jeans',
    brand: 'Gripzus',
    price: 89,
    images: ['https://placehold.co/600x800/8b7355/ffffff/png?text=Denim+Jeans', 'https://placehold.co/600x800/a68968/ffffff/png?text=Denim+Jeans'],
    badge: 'New',
    slug: 'classic-denim-jeans'
  },
  {
    id: 3,
    name: 'Luxury Watch',
    brand: 'Gripzus',
    price: 599,
    images: ['https://placehold.co/600x800/1a1a1a/d4af37/png?text=Luxury+Watch', 'https://placehold.co/600x800/2d2d2d/d4af37/png?text=Luxury+Watch'],
    badge: 'Bestseller',
    slug: 'luxury-watch'
  },
  {
    id: 4,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    images: ['https://placehold.co/600x800/8b7355/ffffff/png?text=Sneakers', 'https://placehold.co/600x800/a68968/ffffff/png?text=Sneakers'],
    slug: 'designer-sneakers'
  },
  {
    id: 5,
    name: 'Wool Coat',
    brand: 'Gripzus',
    price: 399,
    salePrice: 299,
    images: ['https://placehold.co/600x800/1a1a1a/d4af37/png?text=Wool+Coat', 'https://placehold.co/600x800/2d2d2d/d4af37/png?text=Wool+Coat'],
    badge: 'Sale',
    slug: 'wool-coat'
  },
  {
    id: 6,
    name: 'Silk Scarf',
    brand: 'Gripzus',
    price: 79,
    images: ['https://placehold.co/600x800/8b7355/ffffff/png?text=Silk+Scarf', 'https://placehold.co/600x800/a68968/ffffff/png?text=Silk+Scarf'],
    slug: 'silk-scarf'
  },
  {
    id: 7,
    name: 'Leather Bag',
    brand: 'Gripzus',
    price: 249,
    images: ['https://placehold.co/600x800/1a1a1a/d4af37/png?text=Leather+Bag', 'https://placehold.co/600x800/2d2d2d/d4af37/png?text=Leather+Bag'],
    badge: 'New',
    slug: 'leather-bag'
  },
  {
    id: 8,
    name: 'Cashmere Sweater',
    brand: 'Gripzus',
    price: 189,
    images: ['https://placehold.co/600x800/8b7355/ffffff/png?text=Cashmere+Sweater', 'https://placehold.co/600x800/a68968/ffffff/png?text=Cashmere+Sweater'],
    slug: 'cashmere-sweater'
  }
];

const newArrivals = featuredProducts.slice(0, 4);
const bestSellers = featuredProducts.slice(2, 6);

// Hero slides data
const slides = [
  {
    id: 1,
    title: 'Autumn 2026',
    subtitle: 'New Collection',
    description: 'Discover the latest trends in luxury fashion',
    cta: 'Shop Now',
    link: '/collections/new-arrivals',
    image: 'https://placehold.co/1920x1080/1a1a1a/d4af37/png?text=New+Collection',
    theme: 'dark'
  },
  {
    id: 2,
    title: 'Summer Sale',
    subtitle: 'Up to 70% Off',
    description: 'Limited time offer on selected items',
    cta: 'Shop Sale',
    link: '/collections/sale',
    image: 'https://placehold.co/1920x1080/8b7355/ffffff/png?text=Summer+Sale',
    theme: 'light'
  },
  {
    id: 3,
    title: 'Premium Quality',
    subtitle: 'Luxury Essentials',
    description: 'Timeless pieces for your wardrobe',
    cta: 'Explore',
    link: '/collections/all',
    image: 'https://placehold.co/1920x1080/2d2d2d/d4af37/png?text=Luxury+Essentials',
    theme: 'dark'
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };
  return (
    <>
      <Head>
        <title>Gripzus - Luxury Fashion & Accessories</title>
        <meta name="description" content="Discover premium fashion and accessories at Gripzus. Shop the latest trends in luxury clothing, shoes, and accessories." />
        <link rel="icon" href="/Gripzusfavicon.jpeg" />
      </Head>

      <Header />

      <main className="main">
        {/* Hero Section */}
        <section className="hero">
          <div className="sliderContainer">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`slide ${index === currentSlide ? 'active' : ''} ${slide.theme}`}
                style={{
                  backgroundImage: `url(${slide.image})`,
                }}
              >
                <div className="overlay"></div>
                <div className="container">
                  <div className="slideContent">
                    <span className="subtitle">{slide.subtitle}</span>
                    <h2 className="title">{slide.title}</h2>
                    <p className="description">{slide.description}</p>
                    <Link href={slide.link} className="btn btn-primary btn-lg">
                      {slide.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button 
            className="arrow arrowPrev"
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className="arrow arrowNext"
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Dots Navigation */}
          <div className="dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'dotActive' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Featured Categories */}
        <section className="section">
          <div className="container">
            <div className="categoriesGrid">
              <a href="/collections/men" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://placehold.co/800x1000/1a1a1a/d4af37/png?text=Men's+Collection" alt="Men's Collection" />
                </div>
                <div className="categoryOverlay">
                  <h3>Men's Collection</h3>
                  <span>Shop Now →</span>
                </div>
              </a>
              <a href="/collections/women" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://placehold.co/800x1000/8b7355/ffffff/png?text=Women's+Collection" alt="Women's Collection" />
                </div>
                <div className="categoryOverlay">
                  <h3>Women's Collection</h3>
                  <span>Shop Now →</span>
                </div>
              </a>
              <a href="/collections/accessories" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://placehold.co/800x1000/2d2d2d/d4af37/png?text=Accessories" alt="Accessories" />
                </div>
                <div className="categoryOverlay">
                  <h3>Accessories</h3>
                  <span>Shop Now →</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* New Arrivals */}
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">Fresh Picks</span>
                <h2 className="sectionTitle">New Arrivals</h2>
              </div>
              <a href="/collections/new-arrivals" className="viewAll">
                View All →
              </a>
            </div>
            <div className="productsGrid">
              {newArrivals.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Promo Banner */}
        <section className="promoBanner">
          <div className="container">
            <div className="promoContent">
              <h2>Get Up To 70% Off</h2>
              <p>Great Summer Clearance Sales</p>
              <a href="/collections/sale" className="btn btn-accent btn-lg">
                Shop Sale
              </a>
            </div>
          </div>
        </section>

        {/* Best Sellers */}
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">Most Popular</span>
                <h2 className="sectionTitle">Best Sellers</h2>
              </div>
              <a href="/collections/bestsellers" className="viewAll">
                View All →
              </a>
            </div>
            <div className="productsGrid">
              {bestSellers.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features">
          <div className="container">
            <div className="featuresGrid">
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z" fill="currentColor"/>
                  </svg>
                </div>
                <h3>Free Shipping</h3>
                <p>On orders over $50</p>
              </div>
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Easy Returns</h3>
                <p>30-day return policy</p>
              </div>
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M3 10h18M7 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Secure Payment</h3>
                <p>100% secure transactions</p>
              </div>
              <div className="featureCard">
                <div className="featureIcon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <h3>24/7 Support</h3>
                <p>Dedicated customer service</p>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="newsletter">
          <div className="container">
            <div className="newsletterContent">
              <h2>Join Our Style Circle</h2>
              <p>Get exclusive offers, early access, and style inspiration</p>
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
