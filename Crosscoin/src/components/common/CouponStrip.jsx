import React, { useState, useEffect } from 'react';
import { getPublicCoupons } from '../../services/publicApi';

const CouponStrip = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await getPublicCoupons();
        
        if (response && response.success && Array.isArray(response.coupons)) {
          setCoupons(response.coupons);
        } else {
          setCoupons([]);
        }
      } catch (error) {
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  const handleCopyCode = (code, event) => {
    event.stopPropagation();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      }).catch(() => {});
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (err) {
      }
      document.body.removeChild(textArea);
    }
  };

  const generateCouponDescription = (coupon) => {
    if (coupon.description) {
      return coupon.description;
    }

    const value = parseFloat(coupon.value);
    const minPurchase = parseFloat(coupon.minPurchase);

    let description = '';
    
    if (coupon.type === 'percentage') {
      description = `<span class="discount-badge">${value}% OFF</span> on orders above ₹${minPurchase}`;
    } else if (coupon.type === 'fixed') {
      description = `<span class="discount-badge">₹${value} OFF</span> on orders above ₹${minPurchase}`;
    } else if (coupon.type === 'tiered') {
      description = `Buy 2 → Extra <span class="discount-badge">₹50 OFF</span>, Buy 3 → <span class="discount-badge">₹100 OFF</span>`;
    } else if (coupon.type === 'quantity_based') {
      description = `Volume discount available`;
    } else {
      description = 'Special offer';
    }
    
    return description;
  };

  if (loading || coupons.length === 0) {
    return null;
  }

  // Duplicate coupons for seamless marquee effect
  const duplicatedCoupons = [...coupons, ...coupons, ...coupons];

  return (
    <div className="coupon-banner">
      <div className="coupon-marquee">
        {duplicatedCoupons.map((coupon, index) => (
          <div key={`${coupon.id}-${index}`} className="coupon-offer-item">
            <span className="coupon-offer-text" dangerouslySetInnerHTML={{ __html: generateCouponDescription(coupon) }} />
            <button 
              className={`coupon-code-pill ${copiedCode === coupon.code ? 'copied' : ''}`}
              onClick={(e) => handleCopyCode(coupon.code, e)}
              title="Click to copy code"
            >
              {copiedCode === coupon.code ? '✓ COPIED' : coupon.code}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CouponStrip;
