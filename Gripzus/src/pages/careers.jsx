import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Careers() {
  const positions = [
    {
      title: "Senior Product Designer",
      department: "Design",
      location: "New York, NY",
      type: "Full-time"
    },
    {
      title: "E-commerce Manager",
      department: "Marketing",
      location: "Remote",
      type: "Full-time"
    },
    {
      title: "Customer Service Representative",
      department: "Support",
      location: "New York, NY",
      type: "Part-time"
    },
    {
      title: "Supply Chain Coordinator",
      department: "Operations",
      location: "New York, NY",
      type: "Full-time"
    }
  ];

  return (
    <>
      <Head>
        <title>Careers - Gripzus</title>
        <meta name="description" content="Join our team" />
      </Head>

      <Header />

      <main className="main">
        <section style={{ padding: 'var(--spacing-3xl) 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-3xl)' }}>
              <span className="sectionSubtitle">Join Our Team</span>
              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'var(--font-size-4xl)', 
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--spacing-sm)'
              }}>Careers at Gripzus</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)', maxWidth: '600px', margin: '0 auto' }}>
                Be part of a team that's revolutionizing comfort, one sock at a time
              </p>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {/* Why Join Us */}
              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <h2 style={{ 
                  fontSize: 'var(--font-size-2xl)', 
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-lg)',
                  textAlign: 'center'
                }}>Why Join Gripzus?</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)' }}>
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      margin: '0 auto var(--spacing-md)',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                        <path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Great Team</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>Work with talented people</p>
                  </div>

                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      margin: '0 auto var(--spacing-md)',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Growth</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>Career development opportunities</p>
                  </div>

                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      margin: '0 auto var(--spacing-md)',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Flexibility</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>Work-life balance</p>
                  </div>
                </div>
              </div>

              {/* Open Positions */}
              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <h2 style={{ 
                  fontSize: 'var(--font-size-2xl)', 
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-lg)'
                }}>Open Positions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {positions.map((position, index) => (
                    <div 
                      key={index}
                      style={{ 
                        padding: 'var(--spacing-xl)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>
                          {position.title}
                        </h3>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          <span>{position.department}</span>
                          <span>•</span>
                          <span>{position.location}</span>
                          <span>•</span>
                          <span>{position.type}</span>
                        </div>
                      </div>
                      <button className="btn btn-outline">Apply Now</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div style={{ 
                textAlign: 'center',
                padding: 'var(--spacing-2xl)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)'
              }}>
                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>
                  Don't see the right role?
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                  We're always looking for talented people. Send us your resume at careers@gripzus.com
                </p>
                <a href="mailto:careers@gripzus.com" className="btn btn-primary">Get in Touch</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
