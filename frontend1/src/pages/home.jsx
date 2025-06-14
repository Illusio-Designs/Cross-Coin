"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Testimonials from "../components/Testimonials";
import ProductCard, { products } from "../components/ProductCard";
import Image from "next/image";
import card1_left from "../assets/card1-left.webp";
import { FiHeart } from 'react-icons/fi';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useCart } from '../context/CartContext';

const slides = [
  {
    title: "Get up to 30% off",
    highlight: "New Arrivals test",
    description: "Introducing our latest collection of woollen Socks",
    button: "ORDER NOW →",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Winter Sale",
    highlight: "Hot Deals",
    description: "Stay warm with our exclusive offers on winter wear!",
    button: "SHOP NOW →",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Get up to 30% off",
    highlight: "New Arrivals",
    description: "Introducing our latest collection of woollen Socks",
    button: "ORDER NOW →",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Winter Sale",
    highlight: "Hot Deals",
    description: "Stay warm with our exclusive offers on winter wear!",
    button: "SHOP NOW →",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
  }
];

const formatTwoDigits = (num) => num.toString().padStart(2, '0');

const Home = () => {
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { addToCart } = useCart();
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  // This would come from backend in real implementation
  const currentCategory = {
    name: 'Winter Collection',
    image: card1_left,
    products: products.slice(0, 6) // Display first 6 products for now
  };

  // Featured products for the details section
  const featuredProducts = products.slice(0, 3).map(product => ({
    ...product,
    images: [card1_left, card1_left, card1_left, card1_left, card1_left],
    colors: ["brown", "navy", "black"],
    sizes: ["S", "M", "L", "XL"]
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set your target date here (e.g., 7 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    document.title = 'Cross Coin';
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/crosscoin icon.png';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const { days, hours, minutes, seconds } = timeLeft;

  const scrollSlider = (direction) => {
    const slider = document.querySelector('.products-slider');
    const scrollAmount = 300; // Adjust this value based on your needs
    if (slider) {
      if (direction === 'left') {
        slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const scrollFeaturedSlider = (direction) => {
    const slider = document.querySelector('.featured-products-slider');
    const scrollAmount = 1167; // Adjusted for featured product card width
    if (slider) {
      if (direction === 'left') {
        slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  const handleAddToCart = (product) => {
    if (!selectedColor || !selectedSize) {
      alert('Please select both color and size');
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
  };

  const handleBuyNow = () => {
    if (!selectedColor || !selectedSize) {
      alert('Please select both color and size');
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
    router.push('/checkout');
  };

  return (
    <>
      <Header />
      <div className="home-page">
        <div className="hero-slider">
          <div className="hero-slide" key={current}>
            <div className="hero-slide__image">
              <img src={slides[current].image} alt="slide visual" />
            </div>
            <div className="hero-slide__content">
              <div className="hero-slide__content-text">
                <h1>{slides[current].title} <span className="highlight">{slides[current].highlight}</span></h1>
                <p>{slides[current].description}</p>
                <button className="hero-btn">{slides[current].button}</button>
              </div>
            </div>
          </div>
          <div className="hero-slider__nav">
            {slides.map((_, idx) => (
              <span key={idx} className={`dot${idx === current ? ' active' : ''}`} onClick={() => setCurrent(idx)}></span>
            ))}
          </div>
        </div>
        <div className="trust-badges">
          <div className="trust-badges__container">
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#CE1E36' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Premium Quality</h3>
              <p>Handcrafted with finest materials</p>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#180D3E' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Secure Shopping</h3>
              <p>100% safe & encrypted checkout</p>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#CE1E36' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Fast Delivery</h3>
              <p>Worldwide shipping available</p>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon" style={{ color: '#180D3E' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM13 16h-2v2h2v-2zm0-6h-2v4h2v-4z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Authentic Products</h3>
              <p>Genuine Cross Coin merchandise</p>
            </div>
          </div>
        </div>
        <div className="shop-by-category">
          <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', marginBottom: '3rem' , gap: '16rem' }}>
            <h2 className="section-title">Curate Your Collection</h2>
            <button className="hero-btn" onClick={() => window.location.href = '/Products'}>
              View All Products
            </button>
          </div>
          <div className="category-section">
            <div className="category-sidebar">
              <div className="category-item">
                <Image src={currentCategory.image} alt={currentCategory.name} />
                <h3>{currentCategory.name}</h3>
              </div>
            </div>
            <div className="category-products">
              <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('left')}>
                <IoIosArrowBack />
              </button>
              <div className="products-slider">
                {currentCategory.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductClick={(product) => console.log('Product clicked:', product)}
                    onAddToCart={(e, product) => {
                      e.stopPropagation();
                      console.log('Add to cart:', product);
                    }}
                  />
                ))}
              </div>
              <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('right')}>
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>
        <div className="featured-products-section">
          <h2 className="section-title">Unlocked Exclusives</h2>
          <div className="featured-products-container">
            <button className="slider-arrow slider-arrow-left" onClick={() => scrollFeaturedSlider('left')}>
              <IoIosArrowBack />
            </button>
            <div className="featured-products-slider">
              {featuredProducts.map((product, index) => (
                <div key={product.id} className="featured-product-card">
                  <div className="product-images">
                    <Image
                      className="main-image"
                      src={product.images[selectedThumbnail]}
                      alt={product.name}
                      width={400}
                      height={400}
                      style={{ objectFit: 'cover' }}
                    />
                    <div className="thumbnail-images">
                      {product.images.map((src, idx) => (
                        <Image
                          key={idx}
                          src={src}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          className={selectedThumbnail === idx ? "active" : ""}
                          onClick={() => setSelectedThumbnail(idx)}
                          width={60}
                          height={60}
                          style={{ objectFit: 'cover' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <div className="product-rating-row">
                      <span className="stars">★ ★ ★ ★ ☆</span>
                      <span className="rating-value">{product.rating}</span>
                      <span className="review-count">({product.reviews} reviews)</span>
                    </div>
                    <div className="product-price-row">
                      <span className="current-price">${product.price}</span>
                      <span className="original-price">${product.originalPrice}</span>
                    </div>
                    <div className="product-options">
                      <div className="colors">
                        <span className="option-label">Colors</span>
                        <div className="color-options">
                          {product.colors.map((color) => (
                            <button
                              key={color}
                              className={`color-option${selectedColor === color ? " selected" : ""}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setSelectedColor(color)}
                            >
                              {selectedColor === color && (
                                <span className="color-check">✔</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sizes">
                        <span className="option-label">Size</span>
                        <div className="size-options">
                          {product.sizes.map((size) => (
                            <button
                              key={size}
                              className={`size-option${selectedSize === size ? " selected" : ""}`}
                              onClick={() => setSelectedSize(size)}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="product-action-box">
                      <div className="quantity-and-buttons">
                        <div className="quantity-box">
                          <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="quantity-btn">-</button>
                          <span className="quantity-value">{quantity}</span>
                          <button onClick={() => setQuantity(q => q + 1)} className="quantity-btn">+</button>
                        </div>
                        <button className="add-to-cart" onClick={() => handleAddToCart(product)}>
                          Add to cart
                        </button>
                        <button className="buy-now" onClick={handleBuyNow}>
                Buy Now
              </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="slider-arrow slider-arrow-right" onClick={() => scrollFeaturedSlider('right')}>
              <IoIosArrowForward />
            </button>
          </div>
        </div>
        <Testimonials />
        <div className="summer-collections-section">
        <div className="summer-collections-content">
          <h2><span className="summer-highlight">SUMMER</span> COLLECTIONS</h2>
          <button className="summer-shop-btn">SHOP NOW &rarr;</button>
        </div>
        <div className="summer-countdown">
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(days)}</div>
              <div className="summer-countdown-label">Days</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(hours)}</div>
              <div className="summer-countdown-label">Hours</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(minutes)}</div>
              <div className="summer-countdown-label">Minutes</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(seconds)}</div>
              <div className="summer-countdown-label">Seconds</div>
            </div>
          </div>
        </div>
        </div>
        <Footer />
    </>
  );
};

export default Home;
