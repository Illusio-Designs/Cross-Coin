import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Wishlist() {
  return (
    <>
      <Head>
        <title>My Wishlist - Gripzus</title>
        <meta name="description" content="View your saved items" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <h1 className="sectionTitle">My Wishlist</h1>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-4xl) 0' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto var(--spacing-lg)' }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="var(--color-primary)" strokeWidth="2" fill="none"/>
              </svg>
              <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>
                Your wishlist is empty
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
