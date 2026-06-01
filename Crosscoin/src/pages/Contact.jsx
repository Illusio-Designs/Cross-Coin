import React, { useState } from 'react';
import SeoWrapper from '../console/SeoWrapper';
import { showSuccess, showError } from '../utils/toastNotification';
import { fetchPageSeo } from '../utils/fetchPageSeo';

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('contact', ctx) } };
}

const contactInfo = [
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    label: 'Phone',
    value: '+91 74348 34000',
    sub: 'Mon – Fri, 24 Hours',
    href: 'tel:+917434834000',
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    label: 'Email',
    value: 'info@crosscoin.in',
    sub: 'We reply within 24 hours',
    href: 'mailto:info@crosscoin.in',
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    label: 'Address',
    value: '403, 4th Floor, Dev App, Sanidhay Park Soc',
    sub: 'Morbi, Gujarat, India — 363641',
    href: null,
  },
];

const socials = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/crosscoin99/?igsh=d2FiY29iemhtb2Nl',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/people/Cross-Coin/61577195743730/',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/917434834000',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
      </svg>
    ),
  },
];

const faqs = [
  { q: 'How long does delivery take?', a: 'Most orders are delivered within 3–5 business days across India. You will receive a tracking link once your order ships.' },
  { q: 'Can I return or exchange a product?', a: 'Yes. We accept returns and exchanges within 7 days of delivery, provided the product is unused and in original packaging.' },
  { q: 'Do you offer bulk or wholesale orders?', a: 'Absolutely. For bulk orders of 50+ units, please email us directly and we will share our wholesale pricing.' },
  { q: 'How do I track my order?', a: 'Visit our Order Tracking page and enter your order number or AWB number to get real-time updates.' },
];

export default function Contact({ seoData }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      showError('fieldRequired');
      return;
    }
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setForm({ name: '', email: '', subject: '', message: '' });
      setSent(true);
      showSuccess('orderPlaced', "Message sent! We'll get back to you within 24 hours.");
      setTimeout(() => setSent(false), 4000);
    } catch {
      showError('saveFailed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SeoWrapper pageName="contact" seoData={seoData}>
      <div className="ct-page">

        {/* Hero */}
        <section className="ct-hero">
          <div className="ct-hero-inner">
            <div className="ct-hero-badge">Contact Us</div>
            <h1 className="ct-hero-title">We Are Here<br /><span>To Help You</span></h1>
            <p className="ct-hero-sub">Whether you have a question about an order, need product advice, or just want to say hello — our team is ready to respond.</p>
            <div className="ct-hero-pills">
              <div className="ct-pill">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Replies within 24 hours
              </div>
              <div className="ct-pill">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Mon – Fri support
              </div>
              <div className="ct-pill">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                100% satisfaction guarantee
              </div>
            </div>
          </div>
        </section>

        {/* Contact Grid */}
        <section className="ct-main">
          <div className="ct-container ct-grid">

            {/* Left — Info */}
            <div className="ct-info">
              <div className="ct-info-title">Get in Touch</div>
              <p className="ct-info-sub">Reach us through any of the channels below. We are a small, dedicated team and we take every message seriously.</p>

              <div className="ct-info-items">
                {contactInfo.map((c, i) => (
                  <div className="ct-info-item" key={i}>
                    <div className="ct-info-icon">{c.icon}</div>
                    <div className="ct-info-body">
                      <div className="ct-info-label">{c.label}</div>
                      {c.href
                        ? <a href={c.href} className="ct-info-value">{c.value}</a>
                        : <div className="ct-info-value">{c.value}</div>
                      }
                      <div className="ct-info-sub-text">{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ct-social-block">
                <div className="ct-social-title">Follow Us</div>
                <div className="ct-socials">
                  {socials.map((s, i) => (
                    <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="ct-social-btn" aria-label={s.label} title={s.label}>
                      {s.icon}
                      <span>{s.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div className="ct-form-card">
              <div className="ct-form-title">Send a Message</div>
              <p className="ct-form-sub">Fill in the form and we will get back to you as soon as possible.</p>

              {sent && (
                <div className="ct-success">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Message sent successfully. We will be in touch shortly.
                </div>
              )}

              <form onSubmit={handleSubmit} className="ct-form">
                <div className="ct-form-row">
                  <div className="ct-field">
                    <label htmlFor="ct-name">Full Name</label>
                    <input id="ct-name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
                  </div>
                  <div className="ct-field">
                    <label htmlFor="ct-email">Email Address</label>
                    <input id="ct-email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
                  </div>
                </div>
                <div className="ct-field">
                  <label htmlFor="ct-subject">Subject</label>
                  <input id="ct-subject" type="text" name="subject" value={form.subject} onChange={handleChange} placeholder="What is this about?" required />
                </div>
                <div className="ct-field">
                  <label htmlFor="ct-message">Message</label>
                  <textarea id="ct-message" name="message" value={form.message} onChange={handleChange} placeholder="Describe your query in detail..." rows={5} required />
                </div>
                <button type="submit" className="ct-submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="ct-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="ct-faq-section">
          <div className="ct-container">
            <div className="ct-faq-header">
              <div className="ct-label">FAQ</div>
              <h2 className="ct-faq-title">Frequently Asked Questions</h2>
              <p className="ct-faq-sub">Quick answers to the questions we hear most often.</p>
            </div>
            <div className="ct-faq-list">
              {faqs.map((f, i) => (
                <div className={`ct-faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                  <button className="ct-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{f.q}</span>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="ct-faq-chevron">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {openFaq === i && <div className="ct-faq-a">{f.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </SeoWrapper>
  );
}
