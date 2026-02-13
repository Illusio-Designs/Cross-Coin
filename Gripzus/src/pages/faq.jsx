import Head from 'next/head';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      category: "Orders & Payment",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
      questions: [
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, and Google Pay. All transactions are secured with SSL encryption for your safety."
        },
        {
          question: "Can I cancel or modify my order?",
          answer: "Orders can be cancelled or modified within 1 hour of placement. After that, the order is processed and cannot be changed. Please contact us immediately if you need assistance."
        },
        {
          question: "Do you offer gift cards?",
          answer: "Yes! Gift cards are available in denominations from $25 to $500. They never expire and can be used for any purchase on our website."
        },
        {
          question: "How do I apply a discount code?",
          answer: "Enter your discount code at checkout in the 'Promo Code' field before completing your purchase. The discount will be applied to your order total automatically."
        }
      ]
    },
    {
      category: "Shipping & Delivery",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      ),
      questions: [
        {
          question: "How long does shipping take?",
          answer: "Standard shipping takes 5-7 business days. Express shipping (2-3 days) and next-day delivery options are also available at checkout."
        },
        {
          question: "Do you ship internationally?",
          answer: "Yes! We ship to over 100 countries worldwide. International shipping typically takes 7-14 business days depending on your location."
        },
        {
          question: "How do I track my order?",
          answer: "Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account."
        },
        {
          question: "What if my package is lost or damaged?",
          answer: "If your package is lost or arrives damaged, please contact us within 48 hours. We'll work with the carrier to resolve the issue and send you a replacement or refund."
        }
      ]
    },
    {
      category: "Returns & Exchanges",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10"/>
          <polyline points="23 20 23 14 17 14"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
      ),
      questions: [
        {
          question: "What is your return policy?",
          answer: "We offer a 30-day return policy for all unworn items with original tags attached. Simply request a return authorization through your account."
        },
        {
          question: "How do I return an item?",
          answer: "Log into your account, go to Order History, select the order, and click 'Request Return'. We'll provide a prepaid shipping label."
        },
        {
          question: "When will I receive my refund?",
          answer: "Refunds are processed within 5-7 business days of receiving your returned item. The refund will be credited to your original payment method."
        },
        {
          question: "Can I exchange an item?",
          answer: "Yes! Follow the return process and place a new order for the item you want. This ensures you get your preferred item as quickly as possible."
        }
      ]
    },
    {
      category: "Products & Care",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      ),
      questions: [
        {
          question: "How do I know what size to order?",
          answer: "We provide detailed size information on each product page. If you're between sizes, we recommend sizing up. You can also contact our customer service team for personalized sizing advice."
        },
        {
          question: "How do I care for my products?",
          answer: "Machine wash cold with like colors. Tumble dry low or air dry. Do not bleach or iron. Following these instructions will help maintain the quality and longevity of your products."
        },
        {
          question: "What materials do you use?",
          answer: "We use premium materials including Egyptian cotton, merino wool, bamboo fiber, and performance blends. Each product page lists the specific material composition."
        },
        {
          question: "Are your products sustainable?",
          answer: "Yes! We're committed to sustainability through responsible sourcing, eco-friendly production methods, and recyclable packaging. We continuously work to reduce our environmental impact."
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <>
      <Head>
        <title>FAQ - Gripzus</title>
        <meta name="description" content="Frequently asked questions" />
      </Head>

      <Header />

      <main className="main">
        {/* Hero with Background Image */}
        <section style={{ 
          padding: 'clamp(6rem, 12vw, 10rem) 0 clamp(4rem, 8vw, 6rem)',
          background: 'linear-gradient(rgba(250,250,250,0.95), rgba(255,255,255,0.98)), url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=600&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className="container">
            <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '0 var(--spacing-lg)' }}>
              <span className="sectionSubtitle" style={{ color: 'var(--color-accent)' }}>Support</span>
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontWeight: '700',
                marginBottom: '1rem',
                lineHeight: '1.1',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)'
              }}>
                How can we help?
              </h1>
              <p style={{ 
                fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                fontWeight: '300',
                marginBottom: '2.5rem'
              }}>
                Find answers to common questions about orders, shipping, and returns
              </p>

              {/* Search Bar */}
              <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                position: 'relative'
              }}>
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1.25rem 3.5rem 1.25rem 1.5rem',
                    fontSize: '1.0625rem',
                    border: '2px solid var(--border-light)',
                    borderRadius: '50px',
                    backgroundColor: 'white',
                    transition: 'all 0.3s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-accent)';
                    e.target.style.boxShadow = '0 10px 40px rgba(212,175,55,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-light)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="var(--text-muted)" 
                  strokeWidth="2"
                  style={{
                    position: 'absolute',
                    right: '1.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section style={{ padding: '0 0 clamp(6rem, 12vw, 10rem)' }}>
          <div className="container">
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--spacing-lg)' }}>
              {filteredFaqs.map((category, catIndex) => (
                <div key={catIndex} style={{ marginBottom: 'clamp(4rem, 8vw, 6rem)' }}>
                  {/* Category Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '2rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid var(--color-accent)'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                      flexShrink: 0
                    }}>
                      {category.icon}
                    </div>
                    <h2 style={{ 
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.375rem, 2.5vw, 1.75rem)', 
                      fontWeight: '600', 
                      margin: 0,
                      letterSpacing: '-0.01em',
                      color: 'var(--text-primary)'
                    }}>{category.category}</h2>
                  </div>
                  
                  {/* Questions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {category.questions.map((faq, index) => {
                      const globalIndex = catIndex * 100 + index;
                      const isOpen = openIndex === globalIndex;
                      
                      return (
                        <div 
                          key={globalIndex}
                          style={{ 
                            backgroundColor: 'white',
                            border: '1px solid var(--border-light)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isOpen) {
                              e.currentTarget.style.borderColor = 'var(--border-medium)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isOpen) {
                              e.currentTarget.style.borderColor = 'var(--border-light)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <button
                            onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                            style={{
                              width: '100%',
                              padding: '1.25rem 1.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              gap: '1.5rem'
                            }}
                          >
                            <span>{faq.question}</span>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: isOpen ? 'var(--color-accent)' : 'var(--bg-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.3s ease'
                            }}>
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke={isOpen ? 'var(--color-primary)' : 'currentColor'}
                                strokeWidth="2.5"
                                style={{
                                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.3s ease'
                                }}
                              >
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </div>
                          </button>
                          
                          {isOpen && (
                            <div style={{ 
                              padding: '0 1.5rem 1.25rem',
                              color: 'var(--text-secondary)',
                              fontSize: 'clamp(0.875rem, 1.5vw, 0.9375rem)',
                              lineHeight: '1.7',
                              fontWeight: '300',
                              animation: 'fadeIn 0.3s ease'
                            }}>
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredFaqs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                  <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
                    No results found for "{searchQuery}". Try a different search term.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA with Background Image */}
        <section style={{ 
          padding: 'clamp(6rem, 12vw, 10rem) 0',
          background: 'linear-gradient(rgba(250,250,250,0.95), rgba(255,255,255,0.98)), url(https://images.unsplash.com/photo-1556742111-a301076d9d18?w=1920&h=600&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className="container">
            <div style={{ 
              maxWidth: '800px', 
              margin: '0 auto', 
              textAlign: 'center',
              padding: '0 var(--spacing-lg)'
            }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: '700',
                marginBottom: '1rem',
                lineHeight: '1.2',
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)'
              }}>
                Still have questions?
              </h2>
              <p style={{
                fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
                fontWeight: '300'
              }}>
                Our customer support team is here to help you with anything you need
              </p>
              <a href="/contact" className="btn btn-primary" style={{ 
                padding: '0.875rem 2.5rem',
                fontSize: '0.9375rem',
                fontWeight: '600'
              }}>
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
