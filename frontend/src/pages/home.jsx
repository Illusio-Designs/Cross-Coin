"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Testimonials from "../components/Testimonials";

const slides = [
  {
    title: "Get up to 30% off",
    highlight: "New Arrivals",
    description: "Introducing our latest collection of woollen Socks",
    button: "ORDER NOW",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Winter Sale",
    highlight: "Hot Deals",
    description: "Stay warm with our exclusive offers on winter wear!",
    button: "SHOP NOW",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Get up to 30% off",
    highlight: "New Arrivals",
    description: "Introducing our latest collection of woollen Socks",
    button: "ORDER NOW",
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Winter Sale",
    highlight: "Hot Deals",
    description: "Stay warm with our exclusive offers on winter wear!",
    button: "SHOP NOW ",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
  }
];

const Home = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header />
      <div className="home-page">
        <div className="hero-slider">
          <div className="hero-slide">
            <div className="hero-slide__content">
              <div className="hero-slide__content-text">
                <h1>{slides[current].title} <span className="highlight">{slides[current].highlight}</span></h1>
                <p>{slides[current].description}</p>
                <button className="hero-btn">{slides[current].button}</button>
              </div>
            </div>
            <div className="hero-slide__image">
              <img src={slides[current].image} alt="slide visual" />
            </div>
          </div>
          <div className="hero-slider__nav">
            {slides.map((_, idx) => (
              <span key={idx} className={`dot${idx === current ? ' active' : ''}`} onClick={() => setCurrent(idx)}></span>
            ))}
          </div>
        </div>
        <div className="product-showcase">
          <h3 className="product-showcase__title">EXPLORE OUR PRODUCTS</h3>
          <div className="product-grid">
            <div className="product-card product-card--horizontal">
              <div className="product-card__image">
                <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80" alt="Exclusive Shocks" />
              </div>
              <div className="product-card__content">
                <div className="product-card__content-text">
                  <h4>Exclusive Shocks</h4>
                  <p>Look smart and keep it classy with the all-striking and prestigious collection. Latest launch that has become a trend among all fashion lovers and those who like to be stylish.</p>
                  <button className="product-btn">Shop Now</button>
                </div>
                <div className="product-card__content-image">
                  <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80" alt="Exquisite Styles" />
                </div>
              </div>
            </div>
            <div className="product-card product-card--split">
              <div className="product-card__content">
                <div className="product-card__content-text">
                  <h4>Exquisite Styles & Collections</h4>
                  <p>Latest launch that has become a trend among all fashion lovers and those who like to be stylish.</p>
                  <button className="product-btn">Shop Now</button>
                </div>
                <div className="product-card__content-image">
                  <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80" alt="Exquisite Styles" />
                </div>
              </div>
              <div className="product-card__image">
                <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80" alt="Exquisite Styles" />
              </div>
            </div>
            <div className="product-card product-card--split">
              <div className="product-card__image">
                <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80" alt="Exquisite Styles" />
              </div>
              <div className="product-card__content">
                <div className="product-card__content-text">
                  <h4>Exquisite Styles & Collections</h4>
                  <p>Latest launch that has become a trend among all fashion lovers and those who like to be stylish.</p>
                  <button className="product-btn">Shop Now</button>
                </div>
                <div className="product-card__content-image">
                  <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80" alt="Exquisite Styles" />
                </div>
              </div>
            </div>
          </div>
        </div>
      
      <Testimonials />
      </div>
      <Footer />
    </>
  );
};

export default Home;
