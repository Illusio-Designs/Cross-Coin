import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Privacy() {
  const sections = [
    {
      title: "Introduction",
      content: "At Gripzus, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from us. We are committed to protecting your personal data and ensuring transparency in how we handle it."
    },
    {
      title: "Information We Collect",
      content: "We collect information that you provide directly to us, including your name and contact information, billing and shipping addresses, payment information, order history and preferences, and communication preferences. We also automatically collect certain information about your device when you visit our website, including your IP address, browser type, and browsing behavior."
    },
    {
      title: "How We Use Your Information",
      content: "We use the information we collect to process and fulfill your orders, communicate with you about your orders and account, send you marketing communications (with your consent), improve our website and services, prevent fraud and enhance security, and comply with legal obligations. Your data helps us provide you with a personalized and secure shopping experience."
    },
    {
      title: "Information Sharing",
      content: "We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website, conducting our business, or servicing you, as long as those parties agree to keep this information confidential. These include payment processors, shipping carriers, and email service providers."
    },
    {
      title: "Data Security",
      content: "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security. We regularly review and update our security practices."
    },
    {
      title: "Your Rights",
      content: "You have the right to access your personal information, correct inaccurate information, request deletion of your information, opt-out of marketing communications, object to processing of your information, and request data portability. To exercise these rights, please contact us using the information provided at the end of this policy."
    },
    {
      title: "Cookies & Tracking",
      content: "We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies help us improve your browsing experience, analyze site traffic, and personalize content. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent."
    },
    {
      title: "Changes to This Policy",
      content: "We may update our Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the 'Last updated' date. We encourage you to review this Privacy Policy periodically."
    }
  ];

  return (
    <>
      <Head>
        <title>Privacy Policy - Gripzus</title>
        <meta name="description" content="Our privacy policy" />
      </Head>

      <Header />

      <main className="main">
        {/* Hero with Background Image */}
        <section style={{ 
          padding: 'clamp(6rem, 12vw, 10rem) 0 clamp(4rem, 8vw, 6rem)',
          background: 'linear-gradient(rgba(250,250,250,0.95), rgba(255,255,255,0.98)), url(https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1920&h=600&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div className="container">
            <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '0 var(--spacing-lg)' }}>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1.5rem',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '50px',
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(212, 175, 55, 0.05)'
              }}>
                <span style={{ 
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--color-accent)'
                }}>Legal</span>
              </div>
              
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontWeight: '700',
                marginBottom: '0.75rem',
                lineHeight: '1.1',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)'
              }}>
                Privacy Policy
              </h1>
              
              <p style={{ 
                fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)',
                color: 'var(--text-secondary)',
                fontWeight: '400'
              }}>
                Last updated: January 1, 2024
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section style={{ padding: 'clamp(4rem, 10vw, 8rem) 0' }}>
          <div className="container">
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 var(--spacing-lg)' }}>
              {/* Introduction Box */}
              <div style={{
                padding: 'clamp(2rem, 4vw, 3rem)',
                backgroundColor: '#fafafa',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                marginBottom: 'clamp(3rem, 6vw, 5rem)'
              }}>
                <p style={{
                  fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                  lineHeight: '1.7',
                  color: 'var(--text-secondary)',
                  fontWeight: '300',
                  margin: 0
                }}>
                  Your privacy is important to us. This policy outlines how we collect, use, and protect your personal information. By using our website, you agree to the terms described in this policy.
                </p>
              </div>

              {/* Sections */}
              {sections.map((section, i) => (
                <div key={i} style={{ marginBottom: 'clamp(3rem, 6vw, 4.5rem)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '2px',
                      backgroundColor: 'var(--color-accent)'
                    }}></div>
                    <h2 style={{ 
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.375rem, 2.5vw, 1.75rem)', 
                      fontWeight: '600', 
                      margin: 0,
                      letterSpacing: '-0.01em',
                      color: 'var(--text-primary)'
                    }}>
                      {section.title}
                    </h2>
                  </div>
                  
                  <p style={{ 
                    fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.7',
                    fontWeight: '300',
                    margin: 0
                  }}>
                    {section.content}
                  </p>
                </div>
              ))}

              {/* Contact Box */}
              <div style={{ 
                padding: 'clamp(2.5rem, 5vw, 3.5rem)', 
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                borderRadius: '16px',
                marginTop: 'clamp(4rem, 8vw, 6rem)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative Element */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-10%',
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{ 
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', 
                    fontWeight: '600', 
                    marginBottom: '0.75rem',
                    letterSpacing: '-0.01em'
                  }}>
                    Questions about privacy?
                  </h3>
                  <p style={{ 
                    fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)', 
                    lineHeight: '1.6',
                    marginBottom: '1.25rem',
                    fontWeight: '300',
                    opacity: 0.95
                  }}>
                    If you have any questions about this Privacy Policy or how we handle your data, please don't hesitate to reach out.
                  </p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: 'clamp(0.875rem, 1.2vw, 0.9375rem)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2"/>
                        <path d="M3 7l9 6 9-6"/>
                      </svg>
                      <a href="mailto:privacy@gripzus.com" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>
                        privacy@gripzus.com
                      </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                      <span style={{ fontWeight: '500' }}>+1 (555) 123-4567</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
