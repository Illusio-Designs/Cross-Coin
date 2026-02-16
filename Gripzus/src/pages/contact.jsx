import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us - Gripzus</title>
        <meta name="description" content="Get in touch with Gripzus" />
      </Head>

      <Header />

      <main className="main">
        <section style={{ padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-3xl)' }}>
              <span className="sectionSubtitle">Get In Touch</span>
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'var(--font-size-4xl)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--spacing-sm)'
              }}>Contact Us</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>
                We&apos;re here to help and answer any question you might have
              </p>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 'var(--spacing-3xl)', maxWidth: '1100px', margin: '0 auto' }}>
              {/* Left - Contact Info */}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
                  {/* Email */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2"/>
                        <path d="M3 7l9 6 9-6"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Email</h3>
                      <a href="mailto:support@gripzus.com" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', transition: 'color var(--transition-base)' }} onMouseEnter={(e) => e.target.style.color = 'var(--color-accent)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>support@gripzus.com</a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Phone</h3>
                      <a href="tel:+15551234567" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: 'var(--spacing-xs)', transition: 'color var(--transition-base)' }} onMouseEnter={(e) => e.target.style.color = 'var(--color-accent)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>+1 (555) 123-4567</a>
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', margin: 0 }}>Mon-Fri, 9AM-6PM EST</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Location</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>123 Fashion Avenue<br/>New York, NY 10001</p>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div style={{ paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--border-light)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-md)' }}>Follow Us</h3>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <a href="#" style={{ 
                        width: '40px', 
                        height: '40px', 
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                        </svg>
                      </a>
                      <a href="#" style={{ 
                        width: '40px', 
                        height: '40px', 
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                      </a>
                      <a href="#" style={{ 
                        width: '40px', 
                        height: '40px', 
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Contact Form */}
              <div>
                <form style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  padding: 'var(--spacing-2xl)', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>First Name</label>
                      <input type="text" className="form-input" placeholder="John" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Last Name</label>
                      <input type="text" className="form-input" placeholder="Doe" required />
                    </div>
                  </div>
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Email</label>
                    <input type="email" className="form-input" placeholder="john@example.com" required />
                  </div>
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Message</label>
                    <textarea className="form-textarea" placeholder="How can we help you?" rows="8" required></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
