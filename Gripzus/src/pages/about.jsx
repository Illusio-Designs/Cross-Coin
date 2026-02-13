import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function About() {
  return (
    <>
      <Head>
        <title>About Us - Gripzus</title>
        <meta name="description" content="Learn about Gripzus" />
      </Head>

      <Header />

      <main className="main">
        {/* Hero Section - Full Height with Parallax */}
        <section style={{ 
          height: '100vh', 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#0a0a0a'
        }}>
          {/* Background Image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1558769132-cb1aea3c8565?w=1920&h=1080&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            opacity: 0.4
          }}></div>
          
          {/* Gradient Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)'
          }}></div>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '900px', padding: '0 var(--spacing-lg)' }}>
            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '50px',
              marginBottom: '2rem',
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(212, 175, 55, 0.05)'
            }}>
              <span style={{ 
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--color-accent)'
              }}>Est. 2020</span>
            </div>
            
            <h1 style={{ 
              fontFamily: 'var(--font-heading)', 
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: '700',
              marginBottom: '1.5rem',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              color: 'white',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              Crafting Excellence
            </h1>
            
            <p style={{ 
              fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
              lineHeight: '1.6',
              fontWeight: '300',
              letterSpacing: '0.01em',
              color: 'rgba(255,255,255,0.85)',
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              Where premium quality meets timeless design in every piece we create
            </p>


          </div>
        </section>

        {/* Story Section - Split Screen */}
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', backgroundColor: 'white' }}>
          <div className="container" style={{ padding: 'clamp(4rem, 10vw, 8rem) var(--spacing-lg)' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
              gap: 'clamp(3rem, 8vw, 8rem)',
              alignItems: 'center',
              maxWidth: '1400px',
              margin: '0 auto'
            }}>
              {/* Left - Image */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: '-2rem',
                  left: '-2rem',
                  width: '200px',
                  height: '200px',
                  border: '1px solid var(--color-accent)',
                  borderRadius: '50%',
                  opacity: 0.2
                }}></div>
                <img 
                  src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=800&fit=crop" 
                  alt="Our Story"
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                  }}
                />
              </div>

              {/* Right - Content */}
              <div>
                <span className="sectionSubtitle" style={{ color: 'var(--color-accent)' }}>Our Story</span>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: '700',
                  lineHeight: '1.2',
                  marginBottom: '1.5rem',
                  letterSpacing: '-0.01em',
                  color: 'var(--text-primary)'
                }}>
                  Born from passion, driven by excellence
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p style={{
                    fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                    lineHeight: '1.7',
                    color: 'var(--text-secondary)',
                    fontWeight: '300'
                  }}>
                    In 2020, we set out with a singular vision: to create products that transcend the ordinary. Not just functional items, but pieces that inspire, elevate, and endure.
                  </p>
                  
                  <p style={{
                    fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                    lineHeight: '1.7',
                    color: 'var(--text-secondary)',
                    fontWeight: '300'
                  }}>
                    From our atelier in New York, we've built a brand that stands for uncompromising craftsmanship, meticulous attention to detail, and the belief that true luxury lies in the perfect balance of form and function.
                  </p>

                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border-light)'
                  }}>
                    <p style={{
                      fontSize: '1rem',
                      fontStyle: 'italic',
                      color: 'var(--text-primary)',
                      fontWeight: '400'
                    }}>
                      "Excellence is not a destination, it's a journey we take with every stitch."
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-accent)',
                      marginTop: '0.5rem',
                      fontWeight: '600'
                    }}>
                      — Sarah Mitchell, Founder
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full Width Image Break */}
        <section style={{ 
          height: '80vh',
          backgroundImage: 'url(https://images.unsplash.com/photo-1445510861639-5651173bc5d5?w=1920&h=1080&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.6), transparent)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div className="container">
              <div style={{ maxWidth: '600px', color: 'white', padding: '0 var(--spacing-lg)' }}>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: '700',
                  lineHeight: '1.2',
                  marginBottom: '1rem',
                  letterSpacing: '-0.01em'
                }}>
                  Every detail matters
                </h2>
                <p style={{
                  fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                  lineHeight: '1.6',
                  fontWeight: '300',
                  opacity: 0.95
                }}>
                  From sourcing the finest materials to perfecting each stitch, we believe excellence is found in the details others overlook.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values - Modern Cards */}
        <section style={{ padding: 'clamp(6rem, 12vw, 10rem) 0', backgroundColor: 'white' }}>
          <div className="container">
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 var(--spacing-lg)' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 'clamp(4rem, 8vw, 6rem)', maxWidth: '800px', margin: '0 auto 4rem' }}>
                <span className="sectionSubtitle" style={{ color: 'var(--color-accent)' }}>What Defines Us</span>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: '700',
                  lineHeight: '1.2',
                  letterSpacing: '-0.01em',
                  color: 'var(--text-primary)'
                }}>
                  Our Core Values
                </h2>
              </div>

              {/* Values Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(2rem, 4vw, 3rem)' }}>
                {[
                  { 
                    num: '01',
                    title: 'Premium Quality', 
                    desc: 'We source only the finest materials from trusted mills worldwide. Each fiber is carefully selected for its unique properties—softness, durability, breathability, and performance that exceeds expectations.' 
                  },
                  { 
                    num: '02',
                    title: 'Timeless Design', 
                    desc: 'Our designs transcend fleeting trends. We create pieces with classic elegance that look as refined today as they will years from now, ensuring your investment stands the test of time.' 
                  },
                  { 
                    num: '03',
                    title: 'Sustainable Luxury', 
                    desc: 'True luxury respects the planet. We combine premium craftsmanship with eco-conscious practices, proving that exceptional quality and environmental responsibility go hand in hand.' 
                  }
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: 'clamp(2rem, 4vw, 3rem)',
                    backgroundColor: i === 1 ? '#fafafa' : 'white',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.12)';
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }}>
                    <div style={{
                      fontSize: '3rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: '800',
                      color: 'var(--color-accent)',
                      opacity: 0.2,
                      marginBottom: '1rem',
                      lineHeight: '1'
                    }}>{item.num}</div>
                    
                    <h3 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                      fontWeight: '700',
                      marginBottom: '1rem',
                      lineHeight: '1.2',
                      color: 'var(--text-primary)'
                    }}>{item.title}</h3>
                    
                    <p style={{
                      fontSize: 'clamp(0.9375rem, 1.8vw, 1.0625rem)',
                      lineHeight: '1.7',
                      color: 'var(--text-secondary)',
                      fontWeight: '300',
                      margin: 0
                    }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats - Elegant Minimal */}
        <section style={{ 
          padding: 'clamp(6rem, 12vw, 10rem) 0', 
          backgroundColor: '#0a0a0a',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Elements */}
          <div style={{
            position: 'absolute',
            top: '10%',
            right: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>

          <div className="container">
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--spacing-lg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(3rem, 6vw, 5rem)' }}>
                {[
                  { num: '2020', label: 'Founded' },
                  { num: '50K+', label: 'Happy Customers' },
                  { num: '100%', label: 'Sustainable' },
                  { num: '4.9★', label: 'Average Rating' }
                ].map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '0.75rem',
                      lineHeight: '1'
                    }}>{stat.num}</div>
                    <div style={{
                      fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: '500'
                    }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA - Premium */}
        <section style={{ padding: 'clamp(6rem, 12vw, 10rem) 0', backgroundColor: 'white' }}>
          <div className="container">
            <div style={{ 
              maxWidth: '900px', 
              margin: '0 auto', 
              textAlign: 'center',
              padding: 'clamp(3rem, 6vw, 5rem) clamp(2rem, 4vw, 3rem)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              backgroundColor: '#fafafa'
            }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: '700',
                marginBottom: '1rem',
                lineHeight: '1.3',
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)'
              }}>
                Experience the Gripzus difference
              </h2>
              <p style={{
                fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
                fontWeight: '300',
                maxWidth: '600px',
                margin: '0 auto 2rem'
              }}>
                Join thousands who've discovered what premium comfort truly feels like
              </p>
              <a href="/collections/new-arrivals" className="btn btn-primary" style={{ 
                padding: '0.875rem 2.5rem',
                fontSize: '0.9375rem',
                fontWeight: '600'
              }}>
                Explore Collection
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />


    </>
  );
}
