import React, { useState, useEffect } from 'react';
import { FiGift, FiCheck } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { getPublicCoupons } from '../../services/publicindex';
import './QuantityOfferBar.css';

const QuantityOfferBar = ({ selectedPaymentMode = 'cod', appliedCoupon, onCouponApply }) => {
  const { cartItems, cartTotal } = useCart();
  const [offerData, setOfferData] = useState(null);
  const [autoAppliedCoupons, setAutoAppliedCoupons] = useState(new Set());

  useEffect(() => {
    const fetchAndProcessOffers = async () => {
      if (cartItems.length === 0) {
        setOfferData(null);
        return;
      }

      try {
        const response = await getPublicCoupons();
        if (!response || !response.coupons) {
          setOfferData(null);
          return;
        }

        // Get all coupons EXCEPT first-order coupons
        const allCoupons = response.coupons.filter(c => !c.firstOrderOnly);
        
        // Filter by payment mode
        const applicableCoupons = allCoupons.filter(c => {
          if (!c.paymentModeRestriction || c.paymentModeRestriction === 'all') return true;
          return c.paymentModeRestriction === selectedPaymentMode;
        });

        if (applicableCoupons.length === 0) {
          setOfferData({ type: 'no_offers', paymentMode: selectedPaymentMode });
          return;
        }

        const subtotal = cartTotal || 0;
        let bestOffer = null;

        // Process each coupon - PRIORITIZE AMOUNT-BASED OFFERS
        for (const coupon of applicableCoupons) {
          const isApplied = appliedCoupon && appliedCoupon.code === coupon.code;

          // Handle percentage, fixed, and tiered coupons (AMOUNT-BASED)
          if (coupon.type === 'percentage' || coupon.type === 'fixed' || coupon.type === 'tiered') {
            const minPurchase = parseFloat(coupon.minPurchase || 0);
            
            if (subtotal >= minPurchase) {
              let discount = 0;
              
              if (coupon.type === 'percentage') {
                const percentage = parseFloat(coupon.value || 0);
                discount = (subtotal * percentage) / 100;
                const maxDiscount = parseFloat(coupon.maxDiscount || 0);
                if (maxDiscount > 0 && discount > maxDiscount) {
                  discount = maxDiscount;
                }
              } else if (coupon.type === 'fixed') {
                discount = parseFloat(coupon.value || 0);
              } else if (coupon.type === 'tiered' && coupon.tieredDiscounts) {
                let tiers = [];
                try {
                  tiers = typeof coupon.tieredDiscounts === 'string' 
                    ? JSON.parse(coupon.tieredDiscounts) 
                    : coupon.tieredDiscounts;
                } catch (e) {
                  continue;
                }
                
                if (Array.isArray(tiers) && tiers.length > 0) {
                  // Sort tiers from highest to lowest to find the best applicable tier
                  // Support both minValue and minAmount field names
                  tiers.sort((a, b) => {
                    const aMin = parseFloat(a.minValue || a.minAmount || 0);
                    const bMin = parseFloat(b.minValue || b.minAmount || 0);
                    return bMin - aMin;
                  });
                  
                  // Find the highest tier where cart value meets the requirement
                  const applicableTier = tiers.find(t => {
                    const minRequired = parseFloat(t.minValue || t.minAmount || 0);
                    return subtotal >= minRequired;
                  });
                  
                  if (applicableTier) {
                    discount = parseFloat(applicableTier.discount || 0);
                    
                    // Auto-apply only if:
                    // 1. No coupon is currently applied, OR
                    // 2. Same coupon but discount amount changed (tier upgrade)
                    // 3. This coupon hasn't been auto-applied before (user didn't manually remove it)
                    const shouldApply = discount > 0 && onCouponApply && (
                      (!appliedCoupon && !autoAppliedCoupons.has(coupon.code)) ||
                      (appliedCoupon && appliedCoupon.code === coupon.code && parseFloat(appliedCoupon.discount || 0) !== discount)
                    );
                    
                    if (shouldApply) {
                      onCouponApply({
                        code: coupon.code,
                        discountAmount: discount,
                        discount: discount,
                        value: discount,
                        coupon: coupon,
                        paymentMode: selectedPaymentMode
                      });
                      // Mark this coupon as auto-applied
                      setAutoAppliedCoupons(prev => new Set([...prev, coupon.code]));
                    }
                  }
                  
                  // Check if there's a next higher tier to show progress
                  const sortedTiersAsc = [...tiers].sort((a, b) => {
                    const aMin = parseFloat(a.minValue || a.minAmount || 0);
                    const bMin = parseFloat(b.minValue || b.minAmount || 0);
                    return aMin - bMin;
                  });
                  const nextTier = sortedTiersAsc.find(t => {
                    const minRequired = parseFloat(t.minValue || t.minAmount || 0);
                    return subtotal < minRequired;
                  });
                  
                  if (nextTier && isApplied && discount > 0) {
                    const nextDiscount = parseFloat(nextTier.discount || 0);
                    const nextValue = parseFloat(nextTier.minValue || nextTier.minAmount || 0);
                    const remaining = nextValue - subtotal;
                    
                    if (!bestOffer || nextDiscount > bestOffer.discount) {
                      bestOffer = {
                        type: 'tiered_with_next',
                        coupon,
                        currentDiscount: discount,
                        nextDiscount,
                        currentValue: subtotal,
                        requiredValue: nextValue,
                        remaining,
                        progress: (subtotal / nextValue) * 100,
                        isApplied: true
                      };
                      continue;
                    }
                  }
                }
              }
              
              if (discount > 0) {
                if (!bestOffer || discount > bestOffer.discount) {
                  bestOffer = {
                    type: isApplied ? 'achieved' : 'available',
                    coupon,
                    discount,
                    isApplied
                  };
                }
              }
            } else {
              const remaining = minPurchase - subtotal;
              let potentialDiscount = 0;
              
              if (coupon.type === 'percentage') {
                const percentage = parseFloat(coupon.value || 0);
                potentialDiscount = (minPurchase * percentage) / 100;
                const maxDiscount = parseFloat(coupon.maxDiscount || 0);
                if (maxDiscount > 0 && potentialDiscount > maxDiscount) {
                  potentialDiscount = maxDiscount;
                }
              } else if (coupon.type === 'fixed') {
                potentialDiscount = parseFloat(coupon.value || 0);
              } else if (coupon.type === 'tiered' && coupon.tieredDiscounts) {
                let tiers = [];
                try {
                  tiers = typeof coupon.tieredDiscounts === 'string' 
                    ? JSON.parse(coupon.tieredDiscounts) 
                    : coupon.tieredDiscounts;
                } catch (e) {
                  continue;
                }
                
                if (Array.isArray(tiers) && tiers.length > 0) {
                  // Find the first tier that user can reach
                  // Support both minValue and minAmount field names
                  tiers.sort((a, b) => {
                    const aMin = parseFloat(a.minValue || a.minAmount || 0);
                    const bMin = parseFloat(b.minValue || b.minAmount || 0);
                    return aMin - bMin;
                  });
                  const nextTier = tiers.find(t => {
                    const minRequired = parseFloat(t.minValue || t.minAmount || 0);
                    return subtotal < minRequired;
                  });
                  
                  if (nextTier) {
                    potentialDiscount = parseFloat(nextTier.discount || 0);
                    const nextValue = parseFloat(nextTier.minValue || nextTier.minAmount || 0);
                    const tierRemaining = nextValue - subtotal;
                    
                    if (!bestOffer || potentialDiscount > bestOffer.discount) {
                      bestOffer = {
                        type: 'progress_value',
                        coupon,
                        discount: potentialDiscount,
                        currentValue: subtotal,
                        requiredValue: nextValue,
                        remaining: tierRemaining,
                        progress: (subtotal / nextValue) * 100,
                        isApplied: false
                      };
                      continue;
                    }
                  }
                }
              }
              
              if (potentialDiscount > 0) {
                if (!bestOffer || potentialDiscount > bestOffer.discount) {
                  bestOffer = {
                    type: 'progress_value',
                    coupon,
                    discount: potentialDiscount,
                    currentValue: subtotal,
                    requiredValue: minPurchase,
                    remaining,
                    progress: (subtotal / minPurchase) * 100,
                    isApplied: false
                  };
                }
              }
            }
          }
        }

        if (bestOffer) {
          setOfferData(bestOffer);
        } else {
          setOfferData({ type: 'no_offers', paymentMode: selectedPaymentMode });
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
        setOfferData(null);
      }
    };

    fetchAndProcessOffers();
  }, [cartItems, cartTotal, selectedPaymentMode, appliedCoupon, autoAppliedCoupons, onCouponApply]);

  // No offers or no cart
  if (!offerData || offerData.type === 'no_offers') {
    if (selectedPaymentMode === 'cod' && cartItems.length > 0) {
      return (
        <div className="quantity-offer-bar" style={{ borderColor: '#28a745', background: '#d4edda' }}>
          <div className="offer-content">
            <div className="offer-icon" style={{ color: '#28a745' }}>
              <FiGift />
            </div>
            <div className="offer-text">
              <div className="offer-title" style={{ color: '#28a745' }}>
                💳 Switch to Prepaid for Exclusive Offers!
              </div>
              <div className="offer-description">
                Get exciting discounts when you choose Prepaid payment
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  // Show achieved offer (coupon is applied)
  if (offerData.type === 'achieved' && offerData.isApplied) {
    return (
      <div className="quantity-offer-bar achieved">
        <div className="offer-content">
          <div className="offer-icon achieved-icon">
            <FiCheck />
          </div>
          <div className="offer-text">
            <div className="offer-title" style={{ fontSize: '15px', fontWeight: '600' }}>
              🎉 Discount Applied!
            </div>
            <div className="offer-description" style={{ fontSize: '12px', marginTop: '4px' }}>
              Saving ₹{offerData.discount} with {selectedPaymentMode === 'prepaid' ? 'Prepaid' : 'COD'}
            </div>
          </div>
        </div>
        <div className="offer-actions">
          <div className="offer-badge achieved-badge">
            ₹{offerData.discount} OFF
          </div>
          <div className="auto-applied-badge">
            ✅ Applied
          </div>
        </div>
      </div>
    );
  }

  // Show tiered coupon with next tier progress (current tier applied, showing next tier)
  if (offerData.type === 'tiered_with_next' && offerData.isApplied) {
    const color = selectedPaymentMode === 'prepaid' ? '#28a745' : '#007bff';
    
    return (
      <div className="quantity-offer-bar" style={{ borderColor: color }}>
        <div className="offer-content">
          <div className="offer-icon" style={{ color }}>
            <FiGift />
          </div>
          <div className="offer-text">
            <div className="offer-title" style={{ color, fontSize: '15px', fontWeight: '600' }}>
              ✅ ₹{offerData.currentDiscount} OFF Applied!
            </div>
            <div className="offer-description" style={{ fontSize: '12px', marginTop: '4px' }}>
              Add ₹{offerData.remaining.toFixed(0)} more to get ₹{offerData.nextDiscount} OFF
            </div>
          </div>
        </div>
        
        <div className="offer-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(offerData.progress, 100)}%`, backgroundColor: color }} />
          </div>
          <div className="progress-text">
            ₹{offerData.currentValue.toFixed(0)} / ₹{offerData.requiredValue.toFixed(0)}
          </div>
        </div>

        <div className="offer-badge" style={{ backgroundColor: color }}>
          ₹{offerData.nextDiscount} OFF
        </div>
      </div>
    );
  }

  // Show available offer (requirements met but not applied)
  if (offerData.type === 'available' && !offerData.isApplied) {
    const color = selectedPaymentMode === 'prepaid' ? '#28a745' : '#007bff';
    
    return (
      <div className="quantity-offer-bar" style={{ borderColor: color, background: '#e7f5ff' }}>
        <div className="offer-content">
          <div className="offer-icon" style={{ color }}>
            <FiGift />
          </div>
          <div className="offer-text">
            <div className="offer-title" style={{ color, fontSize: '15px', fontWeight: '600' }}>
              🎁 Get ₹{offerData.discount} OFF on this order!
            </div>
            <div className="offer-description" style={{ fontSize: '12px', marginTop: '4px' }}>
              Use code {offerData.coupon.code} to get discount
            </div>
          </div>
        </div>
        <div className="offer-badge" style={{ backgroundColor: color }}>
          ₹{offerData.discount} OFF
        </div>
      </div>
    );
  }

  // Show progress based on cart value
  if (offerData.type === 'progress_value') {
    const color = selectedPaymentMode === 'prepaid' ? '#28a745' : '#007bff';
    const needsPaymentChange = offerData.coupon.paymentModeRestriction && 
                                offerData.coupon.paymentModeRestriction !== 'all' && 
                                offerData.coupon.paymentModeRestriction !== selectedPaymentMode;
    
    return (
      <div className="quantity-offer-bar" style={{ borderColor: color }}>
        <div className="offer-content">
          <div className="offer-icon" style={{ color }}>
            <FiGift />
          </div>
          <div className="offer-text">
            <div className="offer-title" style={{ color, fontSize: '15px', fontWeight: '600' }}>
              {needsPaymentChange ? (
                <>Select {offerData.coupon.paymentModeRestriction === 'prepaid' ? 'Prepaid' : 'COD'} and add ₹{offerData.remaining.toFixed(0)} more to get ₹{offerData.discount} OFF</>
              ) : (
                <>Add ₹{offerData.remaining.toFixed(0)} more to get ₹{offerData.discount} OFF</>
              )}
            </div>
            <div className="offer-description" style={{ fontSize: '12px', marginTop: '4px' }}>
              Use code {offerData.coupon.code} to get discount
            </div>
          </div>
        </div>
        
        <div className="offer-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(offerData.progress, 100)}%`, backgroundColor: color }} />
          </div>
          <div className="progress-text">
            ₹{offerData.currentValue.toFixed(0)} / ₹{offerData.requiredValue.toFixed(0)}
          </div>
        </div>

        <div className="offer-badge" style={{ backgroundColor: color }}>
          ₹{offerData.discount} OFF
        </div>
      </div>
    );
  }

  return null;
};

export default QuantityOfferBar;
