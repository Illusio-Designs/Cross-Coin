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
        {/* Hero Section */}
        <section className="contactHero">
          <div className="container">
            <h1>Get In Touch</h1>
            <p>We&apos;d love to hear from you. Send us a message and we&apos;ll respond within 24 hours.</p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="contactSection">
          <div className="container">
            <div className="contactGrid">
              {/* Contact Info */}
              <div className="contactInfo">
                <h2>Contact Information</h2>
                <p>
                  Have a question or feedback? We&apos;re here to help. Reach out to us through 
                  any of the channels below.
                </p>
                
                <div className="infoItem">
                  <h3>Email</h3>
                  <p><a href="mailto:support@knitwink.com">support@knitwink.com</a></p>
                </div>
                
                <div className="infoItem">
                  <h3>Phone</h3>
                  <p><a href="tel:+15551234567">+1 (555) 123-4567</a></p>
                </div>
                
                <div className="infoItem">
                  <h3>Address</h3>
                  <p>123 Fashion Street<br />New York, NY 10001<br />United States</p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="contactFormWrapper">
                <h2>Send Us A Message</h2>
                <form className="contactForm">
                  <div className="formRow">
                    <div className="formGroup">
                      <label htmlFor="firstName">First Name</label>
                      <input type="text" id="firstName" required />
                    </div>
                    
                    <div className="formGroup">
                      <label htmlFor="lastName">Last Name</label>
                      <input type="text" id="lastName" required />
                    </div>
                  </div>
                  
                  <div className="formRow">
                    <div className="formGroup">
                      <label htmlFor="email">Email Address</label>
                      <input type="email" id="email" required />
                    </div>
                    
                    <div className="formGroup">
                      <label htmlFor="phone">Phone Number</label>
                      <input type="tel" id="phone" />
                    </div>
                  </div>
                  
                  <div className="formGroup">
                    <label htmlFor="subject">Subject</label>
                    <select id="subject" required>
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="order">Order Support</option>
                      <option value="product">Product Question</option>
                      <option value="wholesale">Wholesale Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="formGroup">
                    <label htmlFor="message">Message</label>
                    <textarea id="message" required></textarea>
                  </div>
                  
                  <div className="formSubmit">
                    <button type="submit">
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
