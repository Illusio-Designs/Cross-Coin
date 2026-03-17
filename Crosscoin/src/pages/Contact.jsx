import React, { useState } from "react";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaFacebook,
  FaInstagram,
  FaWhatsapp,
  FaCheckCircle,
} from "react-icons/fa";
import SeoWrapper from "../console/SeoWrapper";
import { showSuccess, showError } from "../utils/toastNotification";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      showError('fieldRequired');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      
      setSubmitSuccess(true);
      showSuccess('orderPlaced', 'Message sent successfully! We\'ll get back to you soon.');
      
      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      showError('saveFailed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: <FaPhone />,
      title: 'Phone',
      details: '+91 9712891700',
      subtext: 'Monday - Friday: 8:00 AM - 9:00 PM',
      link: 'tel:+919712891700'
    },
    {
      icon: <FaEnvelope />,
      title: 'Email',
      details: 'Crosscoinindia@gmail.com',
      subtext: 'We reply within 24 hours',
      link: 'mailto:Crosscoinindia@gmail.com'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Address',
      details: '403, 4th Floor, Dev App, Sanidhay Park Soc',
      subtext: 'Morbi, Gujarat, India, 363641',
      link: null
    }
  ];

  const socialLinks = [
    { icon: <FaFacebook />, url: 'https://www.facebook.com/people/Cross-Coin/61577195743730/', label: 'Facebook' },
    { icon: <FaInstagram />, url: 'https://www.instagram.com/crosscoin99/?igsh=d2FiY29iemhtb2Nl', label: 'Instagram' },
    { icon: <FaWhatsapp />, url: 'https://wa.me/919712891700', label: 'WhatsApp' }
  ];

  return (
    <SeoWrapper pageName="contact">
      <div className="contact-page">
        {/* Hero Section */}
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
            {/* Contact Info */}
            <div className="contact-info">
              <h2>Contact Information</h2>
              <p className="info-intro">
                Have questions about our products or need assistance? We're here to help!
              </p>
              
              <div className="info-items">
                {contactMethods.map((method, idx) => (
                  <div key={idx} className="info-item">
                    <div className="info-icon">{method.icon}</div>
                    <div className="info-content">
                      <h3>{method.title}</h3>
                      {method.link ? (
                        <a href={method.link} className="info-link">{method.details}</a>
                      ) : (
                        <p>{method.details}</p>
                      )}
                      <p className="info-sub">{method.subtext}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="social-links">
                <h3>Connect With Us</h3>
                <div className="social-icons">
                  {socialLinks.map((social, idx) => (
                    <a 
                      key={idx}
                      href={social.url} 
                      className="social-icon" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form">
              <h2>Send us a Message</h2>
              <p className="form-intro">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
              
              {submitSuccess && (
                <div className="success-message">
                  <FaCheckCircle className="success-icon" />
                  <p>Thank you! Your message has been sent successfully.</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
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
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your message here..."
                    required
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default Contact;


