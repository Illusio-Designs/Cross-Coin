import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function SizeGuide() {
  return (
    <>
      <Head>
        <title>Size Guide - Gripzus</title>
        <meta name="description" content="Find your perfect fit" />
      </Head>

      <Header />

      <main className="main">
        {/* Premium Hero */}
        <section style={{ 
          padding: 'var(--spacing-4xl) 0',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
            borderRadius: '50%'
          }}></div>
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-block',
                padding: 'var(--spacing-xs) var(--spacing-lg)',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <span style={{ 
                  fontSize: 'var(--font-size-sm)', 
                  fontWeight: 'var(--font-weight-bold)',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-accent)'
                }}>Perfect Fit</span>
              </div>
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'var(--font-size-5xl)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--spacing-lg)',
                lineHeight: 'var(--line-height-tight)',
                color: 'var(--text-inverse)',
                letterSpacing: '-0.02em'
              }}>
                Size Guide
              </h1>
              <p style={{ 
                fontSize: 'var(--font-size-xl)', 
                color: 'rgba(255, 255, 255, 0.8)', 
                lineHeight: 'var(--line-height-relaxed)'
              }}>
                Find your perfect sock size with our comprehensive guide
              </p>
            </div>
          </div>
        </section>

        {/* Men's Size Chart */}
        <section style={{ padding: 'var(--spacing-4xl) 0' }}>
          <div className="container">
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3)'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                  </div>
                  <h2 style={{ 
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--font-size-3xl)', 
                    fontWeight: 'var(--font-weight-bold)'
                  }}>Men's Sizes</h2>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: 'var(--bg-primary)'
                  }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' }}>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>Size</th>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>US Shoe Size</th>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>EU Shoe Size</th>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>UK Shoe Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: 'var(--spacing-lg)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>Small</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>6-8</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>39-41</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>5.5-7.5</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: 'var(--spacing-lg)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>Medium</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>8.5-10.5</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>42-44</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>8-10</td>
                      </tr>
                      <tr>
                        <td style={{ padding: 'var(--spacing-lg)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>Large</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>11-13</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>45-47</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>10.5-12.5</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Women's Size Chart */}
        <section style={{ padding: 'var(--spacing-4xl) 0', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="container">
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3)'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                  </div>
                  <h2 style={{ 
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--font-size-3xl)', 
                    fontWeight: 'var(--font-weight-bold)'
                  }}>Women's Sizes</h2>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: 'var(--bg-primary)'
                  }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' }}>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>Size</th>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>US Shoe Size</th>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>EU Shoe Size</th>
                        <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', color: 'var(--text-inverse)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>UK Shoe Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: 'var(--spacing-lg)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>Small</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>5-7</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>35-37</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>3-5</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: 'var(--spacing-lg)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>Medium</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>7.5-9.5</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>38-40</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>5.5-7.5</td>
                      </tr>
                      <tr>
                        <td style={{ padding: 'var(--spacing-lg)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>Large</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>10-12</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>41-43</td>
                        <td style={{ padding: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>8-10</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sizing Tips */}
        <section style={{ padding: 'var(--spacing-4xl) 0' }}>
          <div className="container">
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ 
                padding: 'var(--spacing-3xl)',
                background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 20px 60px rgba(212, 175, 55, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-xl)' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px',
                    flexShrink: 0,
                    backgroundColor: 'rgba(26, 26, 26, 0.2)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-2xl)', 
                      fontWeight: 'var(--font-weight-bold)',
                      marginBottom: 'var(--spacing-lg)',
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-heading)'
                    }}>
                      Sizing Tips
                    </h3>
                    <ul style={{ 
                      paddingLeft: 'var(--spacing-lg)', 
                      color: 'var(--color-primary)', 
                      lineHeight: 'var(--line-height-relaxed)',
                      fontSize: 'var(--font-size-base)'
                    }}>
                      <li style={{ marginBottom: 'var(--spacing-sm)' }}>If you're between sizes, we recommend sizing up for a more comfortable fit</li>
                      <li style={{ marginBottom: 'var(--spacing-sm)' }}>Our socks have slight stretch for added comfort</li>
                      <li style={{ marginBottom: 'var(--spacing-sm)' }}>All measurements are approximate and may vary slightly</li>
                      <li>Still unsure? Contact our customer service team for personalized sizing advice</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium CTA */}
        <section style={{ 
          padding: 'var(--spacing-4xl) 0',
          background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-light) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }}></div>
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'var(--font-size-4xl)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--spacing-lg)',
                color: 'var(--text-inverse)'
              }}>Ready to Find Your Perfect Fit?</h2>
              <p style={{ 
                fontSize: 'var(--font-size-lg)', 
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: 'var(--spacing-2xl)',
                lineHeight: 'var(--line-height-relaxed)'
              }}>
                Explore our collection and experience premium comfort designed just for you.
              </p>
              <a href="/collections/new-arrivals" className="btn btn-accent" style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--spacing-md) var(--spacing-3xl)' }}>
                Shop Now
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
