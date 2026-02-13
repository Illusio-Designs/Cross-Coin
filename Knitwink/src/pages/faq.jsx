import Head from 'next/head';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const faqs = [
  {
    question: 'What materials are your socks made from?',
    answer: 'Our socks are crafted from premium materials including merino wool, cashmere, bamboo, and high-quality cotton blends. Each product page lists the specific material composition.'
  },
  {
    question: 'How do I care for my Knitwink socks?',
    answer: 'We recommend washing in cold water and air drying for best results. Avoid bleach and high heat to maintain the quality and longevity of your socks.'
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day hassle-free return policy. If you\'re not completely satisfied, you can return unworn items for a full refund.'
  },
  {
    question: 'Do you offer international shipping?',
    answer: 'Yes! We ship worldwide. Shipping costs and delivery times vary by location and are calculated at checkout.'
  },
  {
    question: 'How do I know what size to order?',
    answer: 'Our socks come in standard sizes: Small (US 5-7), Medium (US 8-10), and Large (US 11-13). Most of our styles have some stretch for a comfortable fit.'
  },
  {
    question: 'Are your products sustainable?',
    answer: 'Yes, sustainability is important to us. We use eco-friendly materials and packaging, and work with manufacturers who share our commitment to ethical practices.'
  }
];

function FAQItem({ faq, isOpen, onClick }) {
  return (
    <div className="faqItem">
      <button className="faqQuestion" onClick={onClick}>
        <span>{faq.question}</span>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <div className="faqAnswer">
          <p>{faq.answer}</p>
        </div>
      )}
      <style jsx>{`
        .faqItem {
          border-bottom: 1px solid var(--color-gray-300);
        }

        .faqQuestion {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg) 0;
          background: none;
          border: none;
          font-family: var(--font-heading);
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          text-align: left;
          cursor: pointer;
          color: var(--color-dark);
        }

        .faqAnswer {
          padding-bottom: var(--spacing-lg);
          animation: fadeIn 0.3s ease-out;
        }

        .faqAnswer p {
          font-size: var(--font-size-base);
          line-height: 1.8;
          color: var(--color-gray-700);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <>
      <Head>
        <title>FAQ - Knitwink</title>
        <meta name="description" content="Frequently asked questions about Knitwink" />
      </Head>

      <Header />

      <main className="main">
        <section className="pageHeader">
          <div className="container">
            <h1>Frequently Asked Questions</h1>
            <p>Find answers to common questions</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="faqList">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  faq={faq}
                  isOpen={openIndex === index}
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                />
              ))}
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

        .faqList {
          max-width: 800px;
          margin: 0 auto;
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
