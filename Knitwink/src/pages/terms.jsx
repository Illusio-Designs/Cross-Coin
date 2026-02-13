import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms & Conditions - Knitwink</title>
        <meta name="description" content="Knitwink terms and conditions" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>Terms & Conditions</h1>
            <p>Last updated: February 2026</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="content">
              <h2>Agreement to Terms</h2>
              <p>
                By accessing and using the Knitwink website, you agree to be bound by these Terms and 
                Conditions. If you disagree with any part of these terms, you may not access our website.
              </p>

              <h2>Products and Services</h2>
              <p>
                All products and services are subject to availability. We reserve the right to discontinue 
                any product at any time. Prices are subject to change without notice.
              </p>

              <h2>Orders and Payment</h2>
              <p>
                By placing an order, you warrant that you are legally capable of entering into binding 
                contracts. All payments must be received before we dispatch your order.
              </p>

              <h2>Shipping and Delivery</h2>
              <p>
                We aim to process and ship orders within 1-2 business days. Delivery times vary by location. 
                We are not responsible for delays caused by shipping carriers.
              </p>

              <h2>Returns and Refunds</h2>
              <p>
                We accept returns within 30 days of purchase for unworn items in original condition. 
                Refunds will be processed within 5-7 business days of receiving the returned item.
              </p>

              <h2>Intellectual Property</h2>
              <p>
                All content on this website, including text, graphics, logos, and images, is the property 
                of Knitwink and protected by copyright laws.
              </p>

              <h2>Limitation of Liability</h2>
              <p>
                Knitwink shall not be liable for any indirect, incidental, special, or consequential damages 
                arising out of or in connection with your use of our website or products.
              </p>

              <h2>Contact Information</h2>
              <p>
                For questions about these Terms & Conditions, please contact us at legal@knitwink.com
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

        @media (max-width: 768px) {
          .pageHeader h1 {
            font-size: var(--font-size-4xl);
          }
        }
      `}</style>
    </>
  );
}
