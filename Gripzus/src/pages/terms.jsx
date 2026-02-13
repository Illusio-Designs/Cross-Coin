import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Terms() {
  const sections = [
    {
      title: "Agreement to Terms",
      content: "By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use this website. Your continued use of the site constitutes acceptance of any modifications to these terms."
    },
    {
      title: "Use License",
      content: "Permission is granted to temporarily download one copy of the materials on Gripzus's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title. You may not modify or copy the materials, use them for commercial purposes, attempt to decompile or reverse engineer any software, or remove any copyright or proprietary notations."
    },
    {
      title: "Product Information",
      content: "We strive to provide accurate product descriptions and pricing. However, we do not warrant that product descriptions, pricing, or other content is accurate, complete, reliable, current, or error-free. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update information at any time without prior notice."
    },
    {
      title: "Pricing and Payment",
      content: "All prices are in USD and are subject to change without notice. We accept various payment methods as indicated at checkout. You agree to provide current, complete, and accurate purchase and account information for all purchases made via our website. Payment must be received by us before your order is dispatched."
    },
    {
      title: "Order Acceptance",
      content: "We reserve the right to refuse or cancel any order for any reason, including limitations on quantities available for purchase, inaccuracies in product or pricing information, or problems identified by our fraud detection systems. If your order is cancelled after your credit card has been charged, we will issue a refund."
    },
    {
      title: "Returns and Refunds",
      content: "We offer a 30-day return policy for unworn items with original tags attached. Please contact our customer service team to initiate a return. Refunds will be processed within 5-7 business days of receiving the returned item. Original shipping costs are non-refundable unless the return is due to our error."
    },
    {
      title: "Limitation of Liability",
      content: "In no event shall Gripzus or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Gripzus's website, even if Gripzus or an authorized representative has been notified of the possibility of such damage."
    },
    {
      title: "Intellectual Property",
      content: "All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Gripzus and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission."
    },
    {
      title: "Governing Law",
      content: "These terms and conditions are governed by and construed in accordance with the laws of New York, USA, and you irrevocably submit to the exclusive jurisdiction of the courts in that location. Any disputes arising from these terms will be resolved through binding arbitration."
    },
    {
      title: "Changes to Terms",
      content: "We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the website following the posting of changes constitutes your acceptance of such changes. We recommend reviewing these terms periodically."
    }
  ];

  return (
    <>
      <Head>
        <title>Terms & Conditions - Gripzus</title>
        <meta name="description" content="Terms and conditions" />
      </Head>

      <Header />

      <main className="main">
        {/* Hero with Background Image */}
        <section style={{ 
          padding: 'clamp(6rem, 12vw, 10rem) 0 clamp(4rem, 8vw, 6rem)',
          background: 'linear-gradient(rgba(250,250,250,0.95), rgba(255,255,255,0.98)), url(https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1920&h=600&fit=crop)',
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
                Terms & Conditions
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
                  Please read these terms and conditions carefully before using our website. These terms govern your use of our website and services. By accessing or using our website, you agree to be bound by these terms.
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
                    Questions about terms?
                  </h3>
                  <p style={{ 
                    fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)', 
                    lineHeight: '1.6',
                    marginBottom: '1.25rem',
                    fontWeight: '300',
                    opacity: 0.95
                  }}>
                    If you have any questions about these Terms & Conditions or need clarification on any point, please contact us.
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
                      <a href="mailto:legal@gripzus.com" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>
                        legal@gripzus.com
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
