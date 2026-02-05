import React, { useState, useEffect } from 'react';
import { FiGift, FiCheck } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { getPublicCoupons } from '../../services/publicindex';
import './QuantityOfferBar.css';

const QuantityOfferBar = ({ onCouponApply, selectedPaymentMode = 'cod', appliedCoupon }) => {
  const { cartItems, cartTotal } = useCart();
  const [offerData, setOfferData] = useState(null);

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

        // Get only quantity-based coupons
        const quantityCoupons = response.coupons.filter(c => c.type === 'quantity_based' && c.quantityBasedDiscounts);
        
        // Filter by payment mode
        const applicableCoupons = quantityCoupons.filter(c => {
          if (!c.paymentModeRestriction || c.paymentModeRestriction === 'all') return true;
          return c.paymentModeRestriction === selectedPaymentMode;
        });

        if (applicableCoupons.length === 0) {
          // No offers for current payment mode
          setOfferData({ type: 'no_offers', paymentMode: selectedPaymentMode });
          return;
        }

        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        let bestOffer = null;

        // Process each coupon
        for (const coupon of applicableCoupons) {
          let tiers = [];
          try {
            tiers = typeof coupon.quantityBasedDiscounts === 'string' 
              ? JSON.parse(coupon.quantityBasedDiscounts) 
              : coupon.quantityBasedDiscounts;
          } catch (e) {
            continue;
          }

          if (!Array.isArray(tiers) || tiers.length === 0) continue;
          tiers.sort((a, b) => a.minQuantity - b.minQuantity);

          // Find current tier (already achieved)
          const metTiers = tiers.filter(t => totalQuantity >= t.minQuantity);
          const currentTier = metTiers.length > 0 ? metTiers[metTiers.length - 1] : null;
          
          // Find next tier (to achieve)
          const nextTier = tiers.find(t => totalQuantity < t.minQuantity);

          // If we have a current tier, apply it
          if (currentTier) {
            const currentDiscount = parseFloat(currentTier.discount);
            
            // Auto-apply current tier discount - update if discount amount changed
            const shouldApply = !appliedCoupon || 
                               appliedCoupon.code !== coupon.code || 
                               parseFloat(appliedCoupon.discount || 0) !== currentDiscount;
            
            if (shouldApply && onCouponApply) {
              console.log('QuantityOfferBar: Auto-applying discount:', {
                code: coupon.code,
                discountAmount: currentDiscount,
                discount: currentDiscount,
                reason: !appliedCoupon ? 'no coupon' : appliedCoupon.code !== coupon.code ? 'different coupon' : 'discount changed'
              });
              onCouponApply({
                code: coupon.code,
                discountAmount: currentDiscount,
                discount: currentDiscount, // OrderSummary uses this
                value: currentDiscount, // Some components might use this
                coupon: coupon,
                paymentMode: selectedPaymentMode,
                tier: currentTier.minQuantity // Track which tier is applied
              });
            }

            // If there's a next tier, show progress towards it
            if (nextTier) {
              const nextDiscount = parseFloat(nextTier.discount);
              const remaining = nextTier.minQuantity - totalQuantity;
              
              if (!bestOffer || nextDiscount > bestOffer.discount) {
                bestOffer = {
                  type: 'progress_with_current',
                  coupon,
                  currentTier,
                  currentDiscount,
                  nextTier,
                  nextDiscount,
                  currentQty: totalQuantity,
                  requiredQty: nextTier.minQuantity,
                  remaining,
                  progress: (totalQuantity / nextTier.minQuantity) * 100
                };
              }
            } else {
              // No more tiers, show achieved
              if (!bestOffer || currentDiscount > bestOffer.discount) {
                bestOffer = {
                  type: 'achieved',
                  coupon,
                  tier: currentTier,
                  discount: currentDiscount,
                  currentQty: totalQuantity,
                  requiredQty: currentTier.minQuantity
                };
              }
            }
          } else if (nextTier) {
            // No current tier, show progress to first tier
            const discount = parseFloat(nextTier.discount);
            const remaining = nextTier.minQuantity - totalQuantity;
            
            if (!bestOffer || discount > bestOffer.discount) {
              bestOffer = {
                type: 'progress',
                coupon,
                tier: nextTier,
                discount,
                currentQty: totalQuantity,
                requiredQty: nextTier.minQuantity,
                remaining,
                progress: (totalQuantity / nextTier.minQuantity) * 100
              };
            }
          }
        }

        if (bestOffer) {
          setOfferData(bestOffer);
          
          // Note: Auto-apply is now handled inside the loop above
        } else {
          setOfferData({ type: 'no_offers', paymentMode: selectedPaymentMode });
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
        setOfferData(null);
      }
    };

    fetchAndProcessOffers();
  }, [cartItems, cartTotal, selectedPaymentMode, appliedCoupon, onCouponApply]);

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

  // Show achieved offer
  if (offerData.type === 'achieved') {
    return (
      <div className="quantity-offer-bar achieved">
        <div className="offer-content">
          <div className="offer-icon achieved-icon">
            <FiCheck />
          </div>
          <div className="offer-text">
            <div className="offer-title">🎉 Discount Applied!</div>
            <div className="offer-description">
              {offerData.coupon.description} - Saving ₹{offerData.discount} with {selectedPaymentMode === 'prepaid' ? 'Prepaid' : 'COD'}
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

  // Show progress with current discount applied
  if (offerData.type === 'progress_with_current') {
    const color = selectedPaymentMode === 'prepaid' ? '#28a745' : '#007bff';
    
    return (
      <div className="quantity-offer-bar" style={{ borderColor: color }}>
        <div className="offer-content">
          <div className="offer-icon" style={{ color }}>
            <FiGift />
          </div>
          <div className="offer-text">
            <div className="offer-title" style={{ color }}>
              ✅ ₹{offerData.currentDiscount} OFF Applied!
            </div>
            <div className="offer-description">
              Add <strong>{offerData.remaining} more item{offerData.remaining > 1 ? 's' : ''}</strong> to get ₹{offerData.nextDiscount} OFF!
            </div>
          </div>
        </div>
        
        <div className="offer-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(offerData.progress, 100)}%`, backgroundColor: color }} />
          </div>
          <div className="progress-text">
            {offerData.currentQty} / {offerData.requiredQty} items
          </div>
        </div>

        <div className="offer-badge" style={{ backgroundColor: color }}>
          ₹{offerData.nextDiscount} OFF
        </div>
      </div>
    );
  }

  // Show progress
  if (offerData.type === 'progress') {
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
            <div className="offer-title" style={{ color }}>
              {offerData.coupon.description}
            </div>
            <div className="offer-description">
              {needsPaymentChange ? (
                <>Select <strong>{offerData.coupon.paymentModeRestriction === 'prepaid' ? 'Prepaid' : 'COD'}</strong> and add <strong>{offerData.remaining} more item{offerData.remaining > 1 ? 's' : ''}</strong> to get ₹{offerData.discount} OFF!</>
              ) : (
                <>Add <strong>{offerData.remaining} more item{offerData.remaining > 1 ? 's' : ''}</strong> to get ₹{offerData.discount} OFF!</>
              )}
            </div>
          </div>
        </div>
        
        <div className="offer-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(offerData.progress, 100)}%`, backgroundColor: color }} />
          </div>
          <div className="progress-text">
            {offerData.currentQty} / {offerData.requiredQty} items
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
