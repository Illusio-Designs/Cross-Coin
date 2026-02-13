import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us - Knitwink</title>
        <meta name="description" content="Get in touch with Knitwink" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>Contact Us</h1>
            <p>We'd love to hear from you</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="contactGrid">
              <div className="contactInfo">
                <h2>Get in Touch</h2>
                <p>Have a question or feedback? Fill out the form and we'll get back to you within 24 hours.</p>
                
                <div className="infoItem">
                  <h3>Email</h3>
                  <p>support@knitwink.com</p>
                </div>
                
                <div className="infoItem">
                  <h3>Phone</h3>
                  <p>+1 (555) 123-4567</p>
                </div>
                
                <div className="infoItem">
                  <h3>Hours</h3>
                  <p>Monday - Friday: 9am - 6pm EST</p>
                </div>
              </div>

              <form className="contactForm">
                <div className="formGroup">
                  <label htmlFor="name">Name</label>
                  <input type="text" id="name" required />
                </div>
                
                <div className="formGroup">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" required />
                </div>
                
                <div className="formGroup">
                  <label htmlFor="subject">Subject</label>
                  <input type="text" id="subject" required />
                </div>
                
                <div className="formGroup">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" rows="6" required></textarea>
                </div>
                
                <button type="submit" className="btn btn-primary btn-lg">
                  Send Message
                </button>
              </form>
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
          font-size: var(--font-size-lg);
          color: var(--color-gray-600);
        }

        .contactGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-4xl);
          max-width: 1200px;
          margin: 0 auto;
        }

        .contactInfo h2 {
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-lg);
        }

        .contactInfo p {
          font-size: var(--font-size-lg);
          color: var(--color-gray-600);
          line-height: 1.8;
          margin-bottom: var(--spacing-2xl);
        }

        .infoItem {
          margin-bottom: var(--spacing-xl);
        }

        .infoItem h3 {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--spacing-sm);
        }

        .infoItem p {
          margin: 0;
          color: var(--color-gray-700);
        }

        .contactForm {
          background: var(--color-gray-100);
          padding: var(--spacing-2xl);
          border-radius: var(--radius-xl);
        }

        .formGroup {
          margin-bottom: var(--spacing-lg);
        }

        .formGroup label {
          display: block;
          font-weight: var(--font-weight-semibold);
          margin-bottom: var(--spacing-sm);
        }

        .formGroup input,
        .formGroup textarea {
          width: 100%;
          padding: var(--spacing-md);
          border: 2px solid var(--color-gray-300);
          border-radius: var(--radius-md);
          font-size: var(--font-size-base);
          font-family: var(--font-body);
          transition: border-color var(--transition-base);
        }

        .formGroup input:focus,
        .formGroup textarea:focus {
          outline: none;
          border-color: var(--color-dark);
        }

        .contactForm button {
          width: 100%;
        }

        @media (max-width: 768px) {
          .contactGrid {
            grid-template-columns: 1fr;
            gap: var(--spacing-2xl);
          }

          .pageHeader h1 {
            font-size: var(--font-size-4xl);
          }
        }
      `}</style>
    </>
  );
}
