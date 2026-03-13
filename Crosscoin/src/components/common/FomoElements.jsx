import React, { useState, useEffect } from 'react';
import '../../../styles/common/FomoElements.css';

/**
 * FOMO (Fear of Missing Out) Elements Component
 * Displays urgency and social proof indicators
 */

export const StockCounter = ({ stock, threshold = 5 }) => {
  const isLowStock = stock <= threshold;
  
  return (
    <div className={`stock-counter ${isLowStock ? 'low-stock' : ''}`}>
      {isLowStock && <span className="stock-icon">⚡</span>}
      <span className="stock-text">
        {stock <= 0 ? 'Out of Stock' : `Only ${stock} left`}
      </span>
    </div>
  );
};

export const ViewCounter = ({ views = 0 }) => {
  const [displayViews, setDisplayViews] = useState(views);

  useEffect(() => {
    setDisplayViews(views);
  }, [views]);

  const formatViews = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num;
  };

  return (
    <div className="view-counter">
      <span className="view-icon">👁️</span>
      <span className="view-text">{formatViews(displayViews)} viewing</span>
    </div>
  );
};

export const PurchaseCounter = ({ purchases = 0 }) => {
  const formatPurchases = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num;
  };

  return (
    <div className="purchase-counter">
      <span className="purchase-icon">✓</span>
      <span className="purchase-text">{formatPurchases(purchases)} sold</span>
    </div>
  );
};

export const TimerBadge = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="timer-badge">
      <span className="timer-icon">⏱️</span>
      <span className="timer-text">{timeLeft}</span>
    </div>
  );
};

export const RatingBadge = ({ rating = 0, reviews = 0 }) => {
  const stars = Math.round(rating);
  
  return (
    <div className="rating-badge">
      <span className="stars">
        {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </span>
      <span className="rating-text">
        {rating.toFixed(1)} ({reviews} reviews)
      </span>
    </div>
  );
};

export const DiscountBadge = ({ discount = 0, originalPrice = 0, salePrice = 0 }) => {
  let discountPercent = discount;
  
  if (!discount && originalPrice && salePrice) {
    discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  }

  if (discountPercent <= 0) return null;

  return (
    <div className="discount-badge">
      <span className="discount-text">-{discountPercent}%</span>
    </div>
  );
};

export const FomoContainer = ({ children, className = '' }) => {
  return (
    <div className={`fomo-container ${className}`}>
      {children}
    </div>
  );
};

export const UrgencyBanner = ({ message, type = 'warning' }) => {
  return (
    <div className={`urgency-banner urgency-${type}`}>
      <span className="urgency-icon">
        {type === 'warning' && '⚠️'}
        {type === 'success' && '✓'}
        {type === 'info' && 'ℹ️'}
      </span>
      <span className="urgency-text">{message}</span>
    </div>
  );
};

export const TrustBadge = ({ text = 'Trusted by thousands', icon = '🛡️' }) => {
  return (
    <div className="trust-badge">
      <span className="trust-icon">{icon}</span>
      <span className="trust-text">{text}</span>
    </div>
  );
};
