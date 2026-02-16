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
        {/* Hero Section */}
        <section className="aboutHero">
          <div className="aboutHeroBackground"></div>
          <div className="container">
            <div className="aboutHeroContent">
              <span className="aboutLabel">Our Story</span>
              <h1>Crafting Comfort Since 2020</h1>
              <p>
                We believe that everyone deserves to experience luxury in their everyday essentials. 
                Each pair is handcrafted with passion and precision.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="storySection">
          <div className="container">
            <div className="storyGrid">
              <div className="storyImage">
                <img src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&h=1000&fit=crop" alt="Knitwink Story" />
              </div>
              <div className="storyContent">
                <h2>Premium Quality, Timeless Design</h2>
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
                <p>
                  From the initial design concept to the final product, every step of our process 
                  is carefully monitored to ensure perfection. We work with skilled artisans who 
                  share our passion for excellence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="valuesSection">
          <div className="container">
            <div className="valuesSectionHeader">
              <h2>Our Core Values</h2>
              <p>The principles that guide everything we do</p>
            </div>
            <div className="valuesGrid">
              <div className="valueCard">
                <div className="valueIcon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Quality First</h3>
                <p>We never compromise on materials or craftsmanship. Every product meets our highest standards.</p>
              </div>
              <div className="valueCard">
                <div className="valueIcon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Sustainable</h3>
                <p>Eco-friendly practices in every step of production. We care about our planet's future.</p>
              </div>
              <div className="valueCard">
                <div className="valueIcon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <h3>Customer Focus</h3>
                <p>Your comfort and satisfaction drive everything we do. We&apos;re here for you 24/7.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Stats Section */}
        <section className="teamSection">
          <div className="container">
            <div className="teamSectionHeader">
              <h2>By The Numbers</h2>
              <p>Our journey in numbers</p>
            </div>
            <div className="teamStats">
              <div className="statCard">
                <div className="statNumber">50K+</div>
                <div className="statLabel">Happy Customers</div>
              </div>
              <div className="statCard">
                <div className="statNumber">200+</div>
                <div className="statLabel">Products</div>
              </div>
              <div className="statCard">
                <div className="statNumber">15+</div>
                <div className="statLabel">Countries</div>
              </div>
              <div className="statCard">
                <div className="statNumber">4.9</div>
                <div className="statLabel">Average Rating</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
