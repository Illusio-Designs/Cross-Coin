import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Knitwink</title>
        <meta name="description" content="Knitwink privacy policy" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>Privacy Policy</h1>
            <p>Last updated: February 2026</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="content">
              <h2>Introduction</h2>
              <p>
                At Knitwink, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you visit our website.
              </p>

              <h2>Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul>
                <li>Name and contact information</li>
                <li>Billing and shipping addresses</li>
                <li>Payment information</li>
                <li>Order history</li>
                <li>Communication preferences</li>
              </ul>

              <h2>How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your orders</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Improve our products and services</li>
                <li>Prevent fraud and enhance security</li>
              </ul>

              <h2>Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>

              <h2>Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal information. You can also 
                opt out of marketing communications at any time.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at privacy@knitwink.com
              </p>
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
          margin-bottom: var(--spacing-md);
        }

        .pageHeader p {
          font-size: var(--font-size-base);
          color: var(--color-gray-600);
        }

        .content {
          max-width: 800px;
          margin: 0 auto;
        }

        .content h2 {
          font-size: var(--font-size-3xl);
          margin: var(--spacing-2xl) 0 var(--spacing-lg);
        }

        .content p {
          font-size: var(--font-size-lg);
          line-height: 1.8;
          color: var(--color-gray-700);
          margin-bottom: var(--spacing-lg);
        }

        .content ul {
          margin: var(--spacing-lg) 0;
          padding-left: var(--spacing-xl);
        }

        .content li {
          font-size: var(--font-size-lg);
          line-height: 1.8;
          color: var(--color-gray-700);
          margin-bottom: var(--spacing-sm);
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
