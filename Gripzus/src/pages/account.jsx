import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Account() {
  return (
    <>
      <Head>
        <title>My Account - Gripzus</title>
        <meta name="description" content="Manage your Gripzus account" />
      </Head>

      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="sectionHeader">
              <div>
                <h1 className="sectionTitle">My Account</h1>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--spacing-4xl) 0' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>
                Account page coming soon...
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
