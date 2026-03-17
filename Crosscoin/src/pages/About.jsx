import React from 'react';
import { FaSocks, FaTshirt, FaHeart, FaUsers, FaAward, FaGlobeAmericas, FaLeaf, FaShieldAlt } from 'react-icons/fa';
import SeoWrapper from '../console/SeoWrapper';

const About = () => {
  const values = [
    {
      icon: <FaAward />,
      title: 'Quality First',
      description: 'We never compromise on quality. Every pair of socks is crafted with precision and care.'
    },
    {
      icon: <FaLeaf />,
      title: 'Sustainability',
      description: 'Eco-friendly materials and ethical manufacturing practices for a better future.'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Trust & Integrity',
      description: 'Transparent business practices and honest communication with our customers.'
    }
  ];

  const stats = [
    { number: '50K+', label: 'Happy Customers' },
    { number: '100+', label: 'Product Designs' },
    { number: '5+', label: 'Years Experience' },
    { number: '24/7', label: 'Customer Support' }
  ];

  return (
    <SeoWrapper pageName="about">
      <div className="about-page">
        {/* Hero Section */}
        <div className="about-hero">
          <div className="container">
            <h1>Our Story</h1>
            <p className="subtitle">Crafting Comfort Since 2025</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="about-stats-section">
          <div className="container">
            <div className="stats-grid">
              {stats.map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="mission-section">
          <div className="container">
            <div className="mission-content">
              <h2 className='section-title'>Our Mission</h2>
              <p>At Cross-Coin, we believe that comfort should never be compromised for style. Our journey began with a simple idea: to create socks that not only look great but feel amazing. Today, we're proud to offer a wide range of premium socks that combine innovative materials, thoughtful design, and exceptional comfort.</p>
              <p>We're committed to delivering products that exceed expectations and building lasting relationships with our customers.</p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="values-section">
          <div className="container">
            <h2 className='section-title'>Our Core Values</h2>
            <div className="values-grid">
              {values.map((value, idx) => (
                <div key={idx} className="value-card">
                  <div className="value-icon">{value.icon}</div>
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <div className="container">
            <h2 className='section-title'>Why Choose Us</h2>
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
              <div className="feature-card">
                <FaGlobeAmericas className="feature-icon" />
                <h3>Global Reach</h3>
                <p>Serving customers worldwide with fast shipping and reliable delivery to your doorstep.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="team-section">
          <div className="container">
            <h2 className='section-title'>Our Team</h2>
            <div className="team-intro">
              <p>Behind every pair of Cross-Coin socks is a dedicated team of passionate individuals who work tirelessly to bring you the best in comfort and style. From our skilled designers to our customer service representatives, we're united by our commitment to quality and innovation.</p>
            </div>
            <div className="team-highlights">
              <div className="highlight-card">
                <h3>Design Excellence</h3>
                <p>Our creative team constantly innovates to bring you unique and stylish designs that stand out.</p>
              </div>
              <div className="highlight-card">
                <h3>Quality Assurance</h3>
                <p>Every product undergoes rigorous testing to ensure it meets our high standards of quality.</p>
              </div>
              <div className="highlight-card">
                <h3>Customer Care</h3>
                <p>Our support team is always ready to help and ensure your complete satisfaction.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="about-cta-section">
          <div className="container">
            <h2>Ready to Experience Comfort?</h2>
            <p>Discover our collection of premium socks and find your perfect pair today.</p>
            <a href="/Products" className="cta-button">Shop Now</a>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default About; 
