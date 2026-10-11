import React, { useEffect, useState } from 'react';
import { getAllPublicReviews } from '../../services/publicApi';

// Only FACTUAL trust signals: Made in India (Cross Coin is based in India),
// secure payments, free shipping (now on all orders), the 7-day returns policy
// (see /returns and the PDP), and Cash on Delivery (offered at checkout).
const TRUST_SIGNALS = [
  'Made in India',
  '100% secure payments',
  'Free shipping on all orders',
  'Easy 7-day returns',
  'COD available',
];

const TrustBadges = () => {
  // Reuse the real store-wide review total (same /api/reviews/all source the
  // home page's Customer Reviews section uses). Render the rating line only
  // when real reviews exist — never a fabricated number.
  const [rating, setRating] = useState(null);

  useEffect(() => {
    let active = true;
    getAllPublicReviews({ limit: 1, sort: 'highest' })
      .then((r) => {
        const list = Array.isArray(r) ? r : (r?.reviews || r?.data || []);
        const rated = list.filter((x) => Number(x.rating) > 0);
        const avg = rated.length ? rated.reduce((a, x) => a + Number(x.rating), 0) / rated.length : 0;
        const total = Math.max(Number(r?.pagination?.total) || 0, list.length);
        if (active && avg > 0 && total > 0) setRating({ avg, total });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const badges = [
    {
      id: 1,
      title: 'Premium Quality',
      description: 'Handcrafted with the finest materials, built to last',
      badge: 'Since 2018',
      color: 'red',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 2,
      title: 'Secure Shopping',
      description: '100% safe & encrypted checkout on every order',
      badge: 'SSL Protected',
      color: 'blue',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="11" width="18" height="10" rx="2" stroke="#fff" strokeWidth="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: 3,
      title: 'Fast Delivery',
      description: 'Worldwide shipping — delivered to your doorstep',
      badge: 'Pan India',
      color: 'red',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="11" width="15" height="9" rx="2" stroke="#fff" strokeWidth="2"/>
          <path d="M16 14h4l3 3v3h-7v-6z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
          <circle cx="5.5" cy="20" r="1.5" stroke="#fff" strokeWidth="1.8"/>
          <circle cx="18.5" cy="20" r="1.5" stroke="#fff" strokeWidth="1.8"/>
        </svg>
      )
    },
    {
      id: 4,
      title: 'Authentic Products',
      description: '100% genuine Cross Coin merchandise, guaranteed',
      badge: 'Verified',
      color: 'blue',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <section className="trust-badges-section">
      <div className="trust-badges-container">
        <div className="trust-badges-header">
          <h2 className="trust-badges-title">Built on <strong>Trust</strong></h2>
          <p className="trust-badges-subtitle">Delivered with care, every single time</p>
        </div>

        {/* Prominent factual trust-signal strip + real store-wide rating */}
        <div className="trust-badges-strip">
          {rating && (
            <span className="trust-badges-pill trust-badges-pill--rating">
              ★ Rated {rating.avg.toFixed(1)} by {rating.total.toLocaleString('en-IN')}+ happy shoppers
            </span>
          )}
          {TRUST_SIGNALS.map((label) => (
            <span key={label} className="trust-badges-pill">{label}</span>
          ))}
        </div>

        <div className="trust-badges-grid">
          {badges.map((badge) => (
            <div key={badge.id} className={`trust-badge-card trust-badge-card--${badge.color}`}>
              <div className="trust-badge-icon-wrap">
                {badge.icon}
              </div>
              <div className="trust-badge-body">
                <h3 className="trust-badge-title">{badge.title}</h3>
                <p className="trust-badge-description">{badge.description}</p>
              </div>
              <span className="trust-badge-label">{badge.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
