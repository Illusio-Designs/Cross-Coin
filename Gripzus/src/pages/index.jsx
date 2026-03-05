import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { getPublicSliders } from '../services/publicindex';

// Sample product data
const featuredProducts = [
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
    name: 'Classic Denim Jeans',
    brand: 'Gripzus',
    price: 89,
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600&h=800&fit=crop'],
    badge: 'New',
    slug: 'classic-denim-jeans'
  },
  {
    id: 3,
    name: 'Luxury Watch',
    brand: 'Gripzus',
    price: 599,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=800&fit=crop'],
    badge: 'Bestseller',
    slug: 'luxury-watch'
  },
  {
    id: 4,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop'],
    slug: 'designer-sneakers'
  },
  {
    id: 5,
    name: 'Wool Coat',
    brand: 'Gripzus',
    price: 399,
    salePrice: 299,
    images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'wool-coat'
  },
  {
    id: 6,
    name: 'Silk Scarf',
    brand: 'Gripzus',
    price: 79,
    images: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&h=800&fit=crop'],
    slug: 'silk-scarf'
  },
  {
    id: 7,
    name: 'Leather Bag',
    brand: 'Gripzus',
    price: 249,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=800&fit=crop'],
    badge: 'New',
    slug: 'leather-bag'
  },
  {
    id: 8,
    name: 'Cashmere Sweater',
    brand: 'Gripzus',
    price: 189,
    images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=800&fit=crop'],
    slug: 'cashmere-sweater'
  }
];

const newArrivals = featuredProducts.slice(0, 4);
const bestSellers = featuredProducts.slice(2, 6);

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch sliders from API
  useEffect(() => {
    const fetchSliders = async () => {
      try {
        setLoading(true);
        const data = await getPublicSliders();
        console.log('Fetched sliders:', data);
        
        // Transform API data to match component structure
        const transformedSlides = data.map(slider => ({
          id: slider.id,
          title: slider.title,
          subtitle: slider.subtitle || '',
          description: slider.description || '',
          cta: slider.button_text || 'Shop Now',
          link: slider.button_link || '/products',
          image: slider.image_url ? `${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}${slider.image_url}` : '',
          theme: slider.theme || 'dark'
        }));
        
        setSlides(transformedSlides);
      } catch (error) {
        console.error('Error fetching sliders:', error);
        // Fallback to default slides if API fails
        setSlides([
          {
            id: 1,
            title: 'Autumn 2026',
            subtitle: 'New Collection',
            description: 'Discover the latest trends in luxury fashion',
            cta: 'Shop Now',
            link: '/products',
            image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&h=1080&fit=crop',
            theme: 'dark'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSliders();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

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
          {loading ? (
            <div className="sliderContainer">
              <div className="slide active dark" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="container">
                  <div className="slideContent">
                    <div style={{ textAlign: 'center' }}>Loading...</div>
                  </div>
                </div>
              </div>
            </div>
          ) : slides.length > 0 ? (
            <>
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
                        {slide.subtitle && <span className="subtitle">{slide.subtitle}</span>}
                        <h2 className="title">{slide.title}</h2>
                        {slide.description && <p className="description">{slide.description}</p>}
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
            </>
          ) : (
            <div className="sliderContainer">
              <div className="slide active dark" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="container">
                  <div className="slideContent">
                    <h2 className="title">Welcome to Gripzus</h2>
                    <p className="description">Discover premium fashion and accessories</p>
                    <Link href="/products" className="btn btn-primary btn-lg">
                      Shop Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Featured Categories */}
        <section className="section">
          <div className="container">
            <div className="categoriesGrid">
              <a href="/collections/men" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&h=1000&fit=crop" alt="Men's Collection" />
                </div>
                <div className="categoryOverlay">
                  <h3>Men&apos;s Collection</h3>
                  <span>Shop Now →</span>
                </div>
              </a>
              <a href="/collections/women" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop" alt="Women's Collection" />
                </div>
                <div className="categoryOverlay">
                  <h3>Women&apos;s Collection</h3>
                  <span>Shop Now →</span>
                </div>
              </a>
              <a href="/collections/accessories" className="categoryCard">
                <div className="categoryImage">
                  <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=1000&fit=crop" alt="Accessories" />
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
              <div className="newsletterTop">
                <div className="newsletterText">
                  <h2>Join Our Style Circle</h2>
                  <p>Get exclusive offers, early access, and style inspiration</p>
                </div>
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
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
