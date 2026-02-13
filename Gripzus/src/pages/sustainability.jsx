import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Sustainability() {
  return (
    <>
      <Head>
        <title>Sustainability - Gripzus</title>
        <meta name="description" content="Our commitment to sustainability" />
      </Head>

      <Header />

      <main className="main">
        <section style={{ padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-3xl)' }}>
              <span className="sectionSubtitle">Our Commitment</span>
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'var(--font-size-4xl)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--spacing-sm)'
              }}>Sustainability</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)', maxWidth: '700px', margin: '0 auto' }}>
                We're committed to creating quality products while minimizing our environmental impact
              </p>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <p style={{ 
                  fontSize: 'var(--font-size-lg)', 
                  color: 'var(--text-secondary)', 
                  lineHeight: 'var(--line-height-relaxed)',
                  textAlign: 'center',
                  marginBottom: 'var(--spacing-2xl)'
                }}>
                  At Gripzus, sustainability isn't just a buzzword—it's woven into everything we do, from sourcing materials to packaging and shipping.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-xl)', marginBottom: 'var(--spacing-3xl)' }}>
                <div style={{ padding: 'var(--spacing-2xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    marginBottom: 'var(--spacing-lg)',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>
                    Sustainable Materials
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    We use organic cotton, recycled polyester, and bamboo fibers in our products. All materials are sourced from certified sustainable suppliers.
                  </p>
                </div>

                <div style={{ padding: 'var(--spacing-2xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    marginBottom: 'var(--spacing-lg)',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>
                    Ethical Manufacturing
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    Our products are made in facilities that meet strict labor and environmental standards. We ensure fair wages and safe working conditions.
                  </p>
                </div>

                <div style={{ padding: 'var(--spacing-2xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    marginBottom: 'var(--spacing-lg)',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16V8z"/>
                      <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                      <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                      <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>
                    Eco-Friendly Packaging
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    100% recyclable and biodegradable packaging materials. We've eliminated plastic from our shipping process entirely.
                  </p>
                </div>

                <div style={{ padding: 'var(--spacing-2xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    marginBottom: 'var(--spacing-lg)',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M23 6l-9.5 9.5-5-5L1 18"/>
                      <path d="M17 6h6v6"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>
                    Carbon Neutral Shipping
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                    We offset 100% of our shipping emissions through verified carbon offset programs and partner with eco-conscious carriers.
                  </p>
                </div>
              </div>

              <div style={{ 
                padding: 'var(--spacing-3xl)', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                border: '2px solid var(--color-accent)'
              }}>
                <h2 style={{ 
                  fontFamily: 'var(--font-heading)', 
                  fontSize: 'var(--font-size-2xl)', 
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-md)'
                }}>Our Goal</h2>
                <p style={{ 
                  fontSize: 'var(--font-size-base)', 
                  color: 'var(--text-secondary)', 
                  lineHeight: 'var(--line-height-relaxed)',
                  maxWidth: '700px',
                  margin: '0 auto'
                }}>
                  By 2025, we aim to be completely carbon neutral across our entire supply chain. We're investing in renewable energy, reducing waste, and continuously improving our sustainability practices. Together, we can make a difference—one sock at a time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
