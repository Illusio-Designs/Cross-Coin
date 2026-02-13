import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Returns() {
  return (
    <>
      <Head>
        <title>Returns & Exchanges - Gripzus</title>
        <meta name="description" content="Learn about our return and exchange policy" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <span className="sectionSubtitle">Easy Returns</span>
                <h1 className="sectionTitle">Returns & Exchanges</h1>
              </div>
            </div>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ padding: 'var(--spacing-2xl)', backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--spacing-3xl)', textAlign: 'center' }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-sm)' }}>30-Day Return Policy</h2>
                <p style={{ fontSize: 'var(--font-size-lg)' }}>Not satisfied? Return it within 30 days for a full refund</p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-lg)' }}>How to Return</h2>
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--font-weight-bold)', flexShrink: 0 }}>1</div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Request a Return</h3>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>Log into your account and request a return authorization within 30 days of delivery.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--font-weight-bold)', flexShrink: 0 }}>2</div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Pack Your Item</h3>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>Pack the item securely in its original packaging with all tags attached.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--font-weight-bold)', flexShrink: 0 }}>3</div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Ship It Back</h3>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>Use the prepaid return label we'll email you. Drop it off at any carrier location.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-accent)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--font-weight-bold)', flexShrink: 0 }}>4</div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-xs)' }}>Get Your Refund</h3>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>Once we receive your return, we'll process your refund within 5-7 business days.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-3xl)' }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-lg)' }}>Exchanges</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)', marginBottom: 'var(--spacing-md)' }}>
                  Need a different size or color? We offer free exchanges! Simply request an exchange when initiating your return, and we'll ship your new item as soon as we receive the original.
                </p>
              </div>

              <div style={{ padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-md)' }}>Return Conditions</h3>
                <ul style={{ paddingLeft: 'var(--spacing-lg)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                  <li>Items must be unworn and unwashed</li>
                  <li>All original tags must be attached</li>
                  <li>Items must be in original packaging</li>
                  <li>Sale items are final sale and cannot be returned</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
