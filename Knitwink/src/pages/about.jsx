import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function About() {
  return (
    <>
      <Head>
        <title>About Us - Knitwink</title>
        <meta name="description" content="Learn about Knitwink's story and commitment to quality" />
      </Head>

      <Header />

      <main className="main">
        <section className="hero">
          <div className="container">
            <h1>About Knitwink</h1>
            <p className="lead">Premium comfort in every step since 2020</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="content">
              <h2>Our Story</h2>
              <p>
                Knitwink was founded with a simple mission: to create the most comfortable, 
                high-quality socks that combine style with functionality. We believe that 
                everyone deserves to experience luxury in their everyday essentials.
              </p>
              <p>
                Each pair of Knitwink socks is handcrafted using the finest materials sourced 
                from around the world. Our commitment to quality and attention to detail ensures 
                that every sock we produce meets our exacting standards.
              </p>

              <h2>Our Values</h2>
              <div className="values">
                <div className="valueCard">
                  <h3>Quality First</h3>
                  <p>We never compromise on materials or craftsmanship</p>
                </div>
                <div className="valueCard">
                  <h3>Sustainable</h3>
                  <p>Eco-friendly practices in every step of production</p>
                </div>
                <div className="valueCard">
                  <h3>Customer Focus</h3>
                  <p>Your comfort and satisfaction drive everything we do</p>
                </div>
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

        .hero {
          padding: var(--spacing-5xl) 0;
          text-align: center;
          background: var(--color-dark);
          color: var(--color-white);
        }

        .hero h1 {
          font-size: var(--font-size-6xl);
          font-weight: var(--font-weight-black);
          margin-bottom: var(--spacing-lg);
        }

        .lead {
          font-size: var(--font-size-xl);
          opacity: 0.9;
        }

        .content {
          max-width: 800px;
          margin: 0 auto;
        }

        .content h2 {
          font-size: var(--font-size-4xl);
          margin: var(--spacing-3xl) 0 var(--spacing-xl);
        }

        .content p {
          font-size: var(--font-size-lg);
          line-height: 1.8;
          color: var(--color-gray-700);
          margin-bottom: var(--spacing-lg);
        }

        .values {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-xl);
          margin-top: var(--spacing-2xl);
        }

        .valueCard {
          padding: var(--spacing-xl);
          border: 2px solid var(--color-dark);
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .valueCard h3 {
          font-size: var(--font-size-xl);
          margin-bottom: var(--spacing-md);
        }

        .valueCard p {
          font-size: var(--font-size-base);
          margin: 0;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: var(--font-size-4xl);
          }

          .values {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
