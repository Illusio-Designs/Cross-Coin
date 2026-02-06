import React, { useState, useEffect } from 'react';
import { getPublicCoupons } from '../services/publicindex';
import '../styles/components/CouponStrip.css';

const CouponStrip = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await getPublicCoupons();
        console.log('Coupon API Response:', response);
        
        // Based on backend controller: response = { success: true, count: number, coupons: [...] }
        if (response && response.success && Array.isArray(response.coupons)) {
          console.log('Active coupons from API:', response.coupons);
          setCoupons(response.coupons);
        } else {
          console.log('No coupons in response or invalid format');
          setCoupons([]);
        }
      } catch (error) {
        console.error('Error fetching coupons:', error);
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  // Copy coupon code to clipboard
  const handleCopyCode = (code, event) => {
    event.stopPropagation();
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        // Show a brief visual feedback
        const target = event.currentTarget;
        const originalText = target.textContent;
        target.textContent = 'COPIED!';
        target.style.background = 'rgba(255, 255, 255, 0.35)';
        
        setTimeout(() => {
          target.textContent = originalText;
          target.style.background = 'rgba(255, 255, 255, 0.15)';
        }, 1000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        const target = event.currentTarget;
        const originalText = target.textContent;
        target.textContent = 'COPIED!';
        setTimeout(() => {
          target.textContent = originalText;
        }, 1000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Generate coupon description based on API response fields
  const generateCouponDescription = (coupon) => {
    // Use description from API if available
    if (coupon.description) {
      return coupon.description;
    }

    // Otherwise generate based on type and value
    const value = parseFloat(coupon.value);
    const minPurchase = parseFloat(coupon.minPurchase);
    const maxDiscount = parseFloat(coupon.maxDiscount);

    let description = '';
    
    if (coupon.type === 'percentage') {
      description = `Get ${value}% OFF`;
      if (minPurchase > 0) {
        description += ` on orders above ₹${minPurchase}`;
      }
      if (maxDiscount > 0) {
        description += ` (Max: ₹${maxDiscount})`;
      }
    } else if (coupon.type === 'fixed') {
      description = `Get ₹${value} OFF`;
      if (minPurchase > 0) {
        description += ` on orders above ₹${minPurchase}`;
      }
    } else if (coupon.type === 'tiered') {
      description = `Tiered discount on cart value`;
    } else if (coupon.type === 'quantity_based') {
      description = `Discount on bulk purchase`;
    } else {
      description = 'Special discount on your order';
    }
    
    return description;
  };

  // Don't render if no coupons
  if (loading || coupons.length === 0) {
    return null;
  }

  // Duplicate coupons for seamless infinite scroll (at least 3 times)
  const duplicatedCoupons = [...coupons, ...coupons, ...coupons];

  return (
    <div className="coupon-strip">
      <div className="coupon-strip-track">
        {duplicatedCoupons.map((coupon, index) => (
          <div key={`${coupon.id}-${index}`} className="coupon-item">
            <span className="coupon-text">
              {generateCouponDescription(coupon)} - Use Code: 
              <strong 
                onClick={(e) => handleCopyCode(coupon.code, e)}
                title="Click to copy"
              >
                {coupon.code}
              </strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CouponStrip;
