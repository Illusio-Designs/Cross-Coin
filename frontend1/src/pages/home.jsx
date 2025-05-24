"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Testimonials from "../components/Testimonials";
import Image from "next/image";
import card1_left from "../assets/card1-left.png";
import card1_right from "../assets/card1-right.png";
import card2_left from "../assets/card2-left.png";
import card2_right from "../assets/card2-right.png";
import card3_left from "../assets/card3-left.png";
import card3_right from "../assets/card3-right.png";
import "../styles/pages/home.css";

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
    button: "SHOP NOW",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
  }
];

const formatTwoDigits = (num) => num.toString().padStart(2, '0');

const Home = () => {
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  const { days, hours, minutes, seconds } = timeLeft;

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
                <Image src={card1_left} alt="Exclusive Shocks" />
              </div>
              <div className="product-card__content">
                <div className="product-card__content-text">
                  <h4>Exclusive Shocks</h4>
                  <p>Look smart and keep it classy with the all-striking and prestigious collection. Latest launch that has become a trend among all fashion lovers and those who like to be stylish.</p>
                  <button className="product-btn">Shop Now</button>
                </div>
                <div className="product-card__content-image">
                  <Image src={card1_right} alt="Exquisite Styles" />
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
                  <Image src={card2_left} alt="Exquisite Styles" />
                </div>
              </div>
              <div className="product-card__image">
                <Image src={card2_right} alt="Exquisite Styles" />
              </div>
            </div>
            <div className="product-card product-card--split">
              <div className="product-card__image">
                <Image src={card3_left} alt="Exquisite Styles" />
              </div>
              <div className="product-card__content">
                <div className="product-card__content-text">
                  <h4>Exquisite Styles & Collections</h4>
                  <p>Latest launch that has become a trend among all fashion lovers and those who like to be stylish.</p>
                  <button className="product-btn">Shop Now</button>
                </div>
                <div className="product-card__content-image">
                  <Image src={card3_right} alt="Exquisite Styles" />
                </div>
              </div>
            </div>
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
