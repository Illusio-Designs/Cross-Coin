import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebook, FaTwitter, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import '../styles/pages/Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };

  return (
    <>
      <Header />
      <div className="contact-page">
        <div className="contact-hero">
          <div className="container">
            <h1>Get in Touch</h1>
            <p className="subtitle">We'd love to hear from you</p>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Customer Support</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">1hr</span>
                <span className="stat-label">Response Time</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Satisfaction</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="contact-grid">
            <div className="contact-info">
              <h2>Contact Information</h2>
              <p className="info-intro">Have questions about our products or need assistance? We're here to help!</p>
              <div className="info-items">
                <div className="info-item">
                  <FaPhone className="info-icon call" />
                  <div>
                    <h3>Phone</h3>
                    <p>+91 9712891700</p>
                    <p className="info-sub">Monday - Friday: 8:00 AM - 9:00 PM</p>
                  </div>
                </div>
                <div className="info-item">
                  <FaEnvelope className="info-icon" />
                  <div>
                    <h3>Email</h3>
                    <p>Crosscoinindia@gmail.com</p>
                  </div>
                </div>
                <div className="info-item">
                  <FaMapMarkerAlt className="info-icon" />
                  <div>
                    <h3>Address</h3>
                    <p>123 Sock Street, Fashion District<br />New York, NY 10001</p>
                  </div>
                </div>
              </div>

              <div className="social-links">
                <h3>Connect With Us</h3>
                <div className="social-icons">
                  <a href="#" className="social-icon"><FaFacebook /></a>
                  <a href="#" className="social-icon"><FaTwitter /></a>
                  <a href="#" className="social-icon"><FaInstagram /></a>
                  <a href="#" className="social-icon"><FaWhatsapp /></a>
                </div>
              </div>
            </div>

            <div className="contact-form">
              <h2>Send us a Message</h2>
              <p className="form-intro">Fill out the form below and we'll get back to you as soon as possible.</p>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your email address"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="What's this about?"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your message"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="submit-btn hero-btn">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Contact; 