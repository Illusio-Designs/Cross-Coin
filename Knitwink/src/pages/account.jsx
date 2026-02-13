import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Account() {
  return (
    <>
      <Head>
        <title>My Account - Knitwink</title>
        <meta name="description" content="Manage your Knitwink account" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>My Account</h1>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="accountContent">
              <p className="message">Please sign in to view your account.</p>
              <div className="actions">
                <button className="btn btn-primary btn-lg">Sign In</button>
                <button className="btn btn-outline btn-lg">Create Account</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .main {
          min-height: 60vh;
        }

        .pageHeader {
          padding: var(--spacing-4xl) 0 var(--spacing-3xl);
          text-align: center;
          background: var(--color-gray-100);
        }

        .pageHeader h1 {
          font-size: var(--font-size-5xl);
          font-weight: var(--font-weight-black);
        }

        .accountContent {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }

        .message {
          font-size: var(--font-size-lg);
          color: var(--color-gray-600);
          margin-bottom: var(--spacing-2xl);
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        @media (max-width: 768px) {
          .pageHeader h1 {
            font-size: var(--font-size-4xl);
          }
        }
      `}</style>
    </>
  );
}
