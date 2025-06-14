import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FaSocks, FaTshirt, FaHeart, FaUsers } from 'react-icons/fa';
import '../styles/pages/About.css';

const About = () => {
  return (
    <>
      <Header />
      <div className="about-page">
        <div className="about-hero">
          <div className="container">
            <h1>Our Story</h1>
            <p className="subtitle">Crafting Comfort Since 2025</p>
          </div>
        </div>

        <div className="mission-section">
          <div className="container">
            <div className="mission-content">
              <h2>Our Mission</h2>
              <p>At Cross-Coin, we believe that comfort should never be compromised for style. Our journey began with a simple idea: to create socks that not only look great but feel amazing. Today, we're proud to offer a wide range of premium socks that combine innovative materials, thoughtful design, and exceptional comfort.</p>
            </div>
          </div>
        </div>

        <div className="features-section">
          <div className="container">
            <h2>Why Choose Us</h2>
            <div className="features-grid">
              <div className="feature-card">
                <FaSocks className="feature-icon" />
                <h3>Premium Materials</h3>
                <p>From luxurious wool to breathable cotton, we use only the finest materials to ensure maximum comfort and durability.</p>
              </div>
              <div className="feature-card">
                <FaHeart className="feature-icon" />
                <h3>Customer First</h3>
                <p>We're committed to providing exceptional customer service and ensuring complete satisfaction with every purchase.</p>
              </div>
              <div className="feature-card">
                <FaUsers className="feature-icon" />
                <h3>Community Driven</h3>
                <p>We actively engage with our community to understand their needs and continuously improve our products.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="team-section">
          <div className="container">
            <h2>Our Team</h2>
            <div className="team-intro">
              <p>Behind every pair of Cross-Coin socks is a dedicated team of passionate individuals who work tirelessly to bring you the best in comfort and style. From our skilled designers to our customer service representatives, we're united by our commitment to quality and innovation.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default About; 