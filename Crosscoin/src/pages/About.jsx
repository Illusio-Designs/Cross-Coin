import React from 'react';
import Link from 'next/link';
import SeoWrapper from '../console/SeoWrapper';

const stats = [
  { value: '50K+', label: 'Happy Customers' },
  { value: '100+', label: 'Product Designs' },
  { value: '5+', label: 'Years of Craft' },
  { value: '24/7', label: 'Customer Support' },
];

const values = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    title: 'Uncompromising Quality',
    desc: 'Every product is engineered with precision — from yarn selection to final stitch. We hold each pair to the same standard we would demand ourselves.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Trust & Transparency',
    desc: 'No hidden fees, no misleading claims. We communicate honestly with every customer and stand behind every product we sell.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    ),
    title: 'Customer Obsession',
    desc: 'Your satisfaction is not a metric — it is our mission. We listen, adapt, and continuously improve based on real feedback from real people.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
      </svg>
    ),
    title: 'Thoughtful Design',
    desc: 'Style and function are not opposites. Our design team obsesses over every detail — colour, texture, fit — so you never have to choose between looking good and feeling great.',
  },
];

const milestones = [
  { year: '2019', title: 'The Idea', desc: 'Founded in a small workshop with one goal: make everyday socks worth wearing.' },
  { year: '2021', title: 'First 10,000 Customers', desc: 'Word spread fast. Our performance ankle socks became a staple for athletes and professionals alike.' },
  { year: '2023', title: 'Pan-India Reach', desc: 'Expanded shipping across all 28 states. Every Indian doorstep, reachable.' },
  { year: '2025', title: 'Cross Coin® Today', desc: 'Over 50,000 customers, 100+ designs, and a growing community that believes comfort is non-negotiable.' },
];

const whyUs = [
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
    title: 'Premium Materials',
    desc: 'Combed cotton, moisture-wicking blends, and reinforced heels — sourced responsibly for lasting comfort.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 3-5 3V8z"/>
      </svg>
    ),
    title: 'Rigorous Testing',
    desc: 'Each batch goes through wash, stretch, and wear tests before it ever reaches your door.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
      </svg>
    ),
    title: 'Fast Delivery',
    desc: 'Pan-India shipping with real-time tracking. Most orders delivered within 3–5 business days.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    title: 'Dedicated Support',
    desc: 'Real humans, real answers. Our support team responds within hours — not days.',
  },
];

export default function About() {
  return (
    <SeoWrapper pageName="about">
      <div className="ab-page">

        {/* Hero */}
        <section className="ab-hero">
          <div className="ab-hero-inner">
            <div className="ab-hero-badge">Our Story</div>
            <h1 className="ab-hero-title">We Make Socks<br /><span>Worth Wearing</span></h1>
            <p className="ab-hero-sub">Cross Coin® was built on a simple belief — the things closest to your skin deserve the most attention. We craft performance socks that combine technical precision with everyday wearability.</p>
            <div className="ab-hero-actions">
              <Link href="/Products" className="ab-btn-primary">Shop the Collection</Link>
              <Link href="/Contact" className="ab-btn-outline">Get in Touch</Link>
            </div>
          </div>
          <div className="ab-hero-stats">
            {stats.map((s, i) => (
              <div className="ab-hero-stat" key={i}>
                <div className="ab-hero-stat-val">{s.value}</div>
                <div className="ab-hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="ab-mission">
          <div className="ab-container ab-mission-grid">
            <div className="ab-mission-text">
              <div className="ab-label">Our Mission</div>
              <h2 className="ab-section-title">Comfort Is Not a Luxury.<br />It Is a Standard.</h2>
              <p>At Cross Coin®, we started with a frustration most people share but rarely talk about — socks that lose shape after two washes, seams that dig in, and fabrics that trap heat. We decided to fix that.</p>
              <p>Our mission is to engineer everyday essentials that perform as hard as you do. Whether you are running a marathon, sitting through back-to-back meetings, or just going about your day — your socks should never be the problem.</p>
              <p>We work directly with manufacturers, control every step of the supply chain, and refuse to cut corners on materials. That is the Cross Coin® promise.</p>
            </div>
            <div className="ab-mission-visual">
              <div className="ab-mission-card">
                <div className="ab-mission-card-icon">
                  <svg width="32" height="32" fill="none" stroke="#CE1E36" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div className="ab-mission-card-title">Quality Promise</div>
                <div className="ab-mission-card-text">Every product is tested for durability, comfort, and consistency before it ships.</div>
              </div>
              <div className="ab-mission-card">
                <div className="ab-mission-card-icon">
                  <svg width="32" height="32" fill="none" stroke="#CE1E36" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <div className="ab-mission-card-title">50,000+ Customers</div>
                <div className="ab-mission-card-text">A growing community of people who refuse to settle for uncomfortable basics.</div>
              </div>
              <div className="ab-mission-card">
                <div className="ab-mission-card-icon">
                  <svg width="32" height="32" fill="none" stroke="#CE1E36" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                </div>
                <div className="ab-mission-card-title">Pan-India Delivery</div>
                <div className="ab-mission-card-text">Shipping to every corner of India with real-time tracking on every order.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="ab-timeline-section">
          <div className="ab-container">
            <div className="ab-label">How We Got Here</div>
            <h2 className="ab-section-title">Our Journey</h2>
            <div className="ab-timeline">
              {milestones.map((m, i) => (
                <div className="ab-timeline-item" key={i}>
                  <div className="ab-timeline-year">{m.year}</div>
                  <div className="ab-timeline-dot" />
                  <div className="ab-timeline-content">
                    <div className="ab-timeline-title">{m.title}</div>
                    <div className="ab-timeline-desc">{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="ab-values-section">
          <div className="ab-container">
            <div className="ab-label">What Drives Us</div>
            <h2 className="ab-section-title">Our Core Values</h2>
            <div className="ab-values-grid">
              {values.map((v, i) => (
                <div className="ab-value-card" key={i}>
                  <div className="ab-value-icon">{v.icon}</div>
                  <div className="ab-value-title">{v.title}</div>
                  <div className="ab-value-desc">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Us */}
        <section className="ab-why-section">
          <div className="ab-container">
            <div className="ab-label">Why Cross Coin®</div>
            <h2 className="ab-section-title">Built Different, By Design</h2>
            <div className="ab-why-grid">
              {whyUs.map((w, i) => (
                <div className="ab-why-item" key={i}>
                  <div className="ab-why-icon">{w.icon}</div>
                  <div className="ab-why-body">
                    <div className="ab-why-title">{w.title}</div>
                    <div className="ab-why-desc">{w.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ab-cta">
          <div className="ab-container">
            <h2 className="ab-cta-title">Ready to Feel the Difference?</h2>
            <p className="ab-cta-sub">Join over 50,000 customers who have made the switch to socks that actually perform.</p>
            <div className="ab-cta-actions">
              <Link href="/Products" className="ab-btn-primary">Shop Now</Link>
              <Link href="/Contact" className="ab-btn-outline-light">Contact Us</Link>
            </div>
          </div>
        </section>

      </div>
    </SeoWrapper>
  );
}
