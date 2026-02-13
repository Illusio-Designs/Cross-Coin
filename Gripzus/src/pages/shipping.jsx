import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Shipping() {
  return (
    <>
      <Head>
        <title>Shipping Information - Gripzus</title>
        <meta name="description" content="Learn about our shipping policies" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">Delivery Info</span>
                <h1 className="sectionTitle">Shipping Information</h1>
              </div>
            </div>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-lg)' }}>Shipping Options</h2>
                
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                  <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-accent)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>Standard Shipping</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>Delivery in 5-7 business days</p>
                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)' }}>FREE on orders over $50</p>
                  </div>

                  <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>Express Shipping</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>Delivery in 2-3 business days</p>
                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>$15.00</p>
                  </div>

                  <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-error)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>Next Day Delivery</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>Order before 2PM for next day delivery</p>
                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>$25.00</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-lg)' }}>International Shipping</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)', marginBottom: 'var(--spacing-md)' }}>
                  We ship to over 100 countries worldwide. International shipping rates are calculated at checkout based on your location and order weight.
                </p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                  Delivery time: 7-14 business days depending on destination.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-lg)' }}>Order Tracking</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                  Once your order ships, you'll receive a tracking number via email. You can track your package anytime through our website or the carrier's tracking portal.
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
