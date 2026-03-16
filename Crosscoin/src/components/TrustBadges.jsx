import React from 'react';

const TrustBadges = () => {
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
          <p className="trust-badges-label">Why choose us</p>
          <h2 className="trust-badges-title">Built on trust, delivered with care</h2>
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
