import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useRouter } from "next/navigation";
import { getPublicProductBySlug, createPublicReview, getPublicCoupons } from '../services/publicindex';
import SeoWrapper from '../console/SeoWrapper';
import { showValidationErrorToast, showReviewSubmittedSuccessToast, showReviewSubmittedErrorToast } from '../utils/toast';
import Loader from '../components/Loader';
import { fbqTrack } from '../components/common/Analytics';
import { getProductImageSrc } from '../utils/imageUtils';

export default function ProductDetails() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get('slug');
  const { addToCart, removeFromCart } = useCart();
  const { addToWishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();
  
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    name: '',
    email: '',
    files: []
  });
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreview, setFilePreview] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [copiedCoupon, setCopiedCoupon] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        if (productSlug) {
          const response = await getPublicProductBySlug(productSlug);
          if (response.success) {
            setProduct(response.data);
            // Set default variation if available
            if (response.data.variations && response.data.variations.length > 0) {
              setSelectedVariation(response.data.variations[0]);
              // Initialize selected attributes with first options
              const firstVariation = response.data.variations[0];
              if (firstVariation.attributes) {
                const attributes = typeof firstVariation.attributes === 'string'
                  ? JSON.parse(firstVariation.attributes)
                  : firstVariation.attributes;
                const initialAttributes = {};
                Object.keys(attributes).forEach(key => {
                  initialAttributes[key] = attributes[key][0];
                });
                setSelectedAttributes(initialAttributes);
              }
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch product');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productSlug]);

  // Fetch coupons for display
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const data = await getPublicCoupons();
        setCoupons(Array.isArray(data) ? data : data.coupons || []);
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchCoupons();
  }, []);

  const generateCouponDescription = (coupon) => {
    const value = parseFloat(coupon.value);
    const minPurchase = parseFloat(coupon.minPurchase);
    const maxDiscount = parseFloat(coupon.maxDiscount);

    if (coupon.type === 'percentage') {
      let description = `Get ${value}% off`;
      if (minPurchase > 0) {
        description += ` on a minimum purchase of ₹${minPurchase}`;
      }
      if (maxDiscount > 0) {
        description += `. Maximum discount: ₹${maxDiscount}`;
      }
      return description + '.';
    }

    if (coupon.type === 'fixed') {
      let description = `Get a flat ₹${value} discount`;
      if (minPurchase > 0) {
        description += ` on a minimum purchase of ₹${minPurchase}`;
      }
      return description + '.';
    }
    
    return 'A special discount on your order.';
  };

  const handleCopyCoupon = async (couponCode) => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopiedCoupon(couponCode);
      setTimeout(() => setCopiedCoupon(null), 2000); // Hide tooltip after 2 seconds
    } catch (err) {
      console.error('Failed to copy coupon code:', err);
    }
  };

  const renderStars = (rating) => {
    const totalStars = 5;
    const roundedRating = Math.round(rating || 0);
    const stars = [];
    for (let i = 0; i < totalStars; i++) {
      stars.push(i < roundedRating ? '★' : '☆');
    }
    return stars.join(' ');
  };

  const handleAttributeChange = (attributeName, value) => {
    setSelectedAttributes(prev => {
      const newAttributes = { ...prev, [attributeName]: value };
      // Find matching variation
      const matchingVariation = product.variations.find(variation => {
        const attrs = typeof variation.attributes === 'string'
          ? JSON.parse(variation.attributes)
          : variation.attributes;
        return Object.entries(newAttributes).every(([key, val]) => 
          attrs[key]?.includes(val)
        );
      });
      if (matchingVariation) {
        setSelectedVariation(matchingVariation);
        console.log('Variation selected:', matchingVariation);
      }
      return newAttributes;
    });
  };

  const validateForm = () => {
    if (!reviewForm.name.trim()) return 'Please enter your name';
    if (!reviewForm.email.trim()) return 'Please enter your email';
    if (!reviewForm.email.includes('@')) return 'Please enter a valid email';
    if (!reviewForm.comment.trim()) return 'Please enter your review';
    if (reviewForm.comment.length < 10) return 'Review must be at least 10 characters';
    return null;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setFormTouched(true);
    
    const validationError = validateForm();
    if (validationError) {
      showValidationErrorToast(validationError);
      return;
    }

    setIsSubmitting(true);
    setReviewError(null);
    setReviewSuccess(false);

    try {
      const formData = new FormData();
      formData.append('productId', product.id);
      formData.append('rating', reviewForm.rating);
      formData.append('comment', reviewForm.comment.trim());
      formData.append('name', reviewForm.name.trim());
      formData.append('email', reviewForm.email.trim());

      // Append files if they exist
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
      }

      const response = await createPublicReview(formData);
      if (response.success) {
        setReviewSuccess(true);
        showReviewSubmittedSuccessToast();
        setReviewForm({
          rating: 5,
          comment: '',
          name: '',
          email: '',
          files: []
        });
        setFormTouched(false);
        // Refresh product data to get updated reviews
        const updatedProduct = await getPublicProductBySlug(productSlug);
        if (updatedProduct.success) {
          setProduct(updatedProduct.data);
        }
      }
    } catch (error) {
      showReviewSubmittedErrorToast(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setReviewForm(prev => ({ ...prev, [field]: value }));
    if (formTouched) {
      setReviewError(null);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const maxFiles = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (files.length > maxFiles) {
      showValidationErrorToast(`You can only upload up to ${maxFiles} files`);
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        showValidationErrorToast(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showValidationErrorToast(`${file.name} is not a valid image or video file`);
        return false;
      }
      return true;
    });

    if (validFiles.length !== files.length) {
      return;
    }

    setSelectedFiles(validFiles);
    setReviewForm(prev => ({ ...prev, files: validFiles }));

    // Create preview URLs
    const previews = validFiles.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type
    }));
    setFilePreview(previews);
    setReviewError(null);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = filePreview.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setReviewForm(prev => ({ ...prev, files: newFiles }));
    setFilePreview(newPreviews);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Header />
        <Loader />
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="error-container">
        <Header />
        <div className="error">Error: {error || 'Product not found'}</div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedVariation) {
      showValidationErrorToast('Please select all required variations.');
      console.log('Add to cart failed: No variation selected');
      return;
    }
    const selectedColor = selectedAttributes.color || '';
    const selectedSize = selectedAttributes.size || '';
    addToCart(product, selectedColor, selectedSize, quantity);
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 2000);
    console.log('Add to cart:', { product, selectedColor, selectedSize, quantity });
    fbqTrack('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity,
    });
  };

  const handleBuyNow = () => {
    if (!selectedVariation) {
      showValidationErrorToast('Please select all variations');
      return;
    }
    const selectedColor = selectedAttributes.color || '';
    const selectedSize = selectedAttributes.size || '';
    addToCart(product, selectedColor, selectedSize, quantity);
    router.push('/unifiedcheckout');
    fbqTrack('InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity,
    });
  };

  const handleAddToWishlist = () => {
    addToWishlist(product);
    fbqTrack('AddToWishlist', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  };

  const handleRemoveFromWishlist = () => {
    removeFromWishlist(product.id);
    fbqTrack('RemoveFromWishlist', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  };

  const renderAttributeOptions = () => {
    if (!selectedVariation) return null;
    const attributes = typeof selectedVariation.attributes === 'string'
      ? JSON.parse(selectedVariation.attributes)
      : selectedVariation.attributes;
    return Object.entries(attributes).map(([key, values]) => (
      <div key={key} className="variation-group">
        <span className="option-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
        <div className={`variation-options ${key === 'color' ? 'color-options' : ''}`}> 
          {values.map((value) => (
            key === 'color' ? (
              <button
                key={value}
                className={`color-option${selectedAttributes[key] === value ? ' selected' : ''}`}
                style={{ backgroundColor: value.toLowerCase(), border: selectedAttributes[key] === value ? '2px solid #e60000' : '1px solid #ccc' }}
                onClick={() => handleAttributeChange(key, value)}
                aria-label={value}
              >
                {selectedAttributes[key] === value && <span className="color-check">✓</span>}
              </button>
            ) : (
              <button
                key={value}
                className={`size-option${selectedAttributes[key] === value ? ' selected' : ''}`}
                onClick={() => handleAttributeChange(key, value)}
              >
                {value}
              </button>
            )
          ))}
        </div>
      </div>
    ));
  };

  const renderReviewForm = () => (
    <div className="review-form-container">
      {reviewSuccess ? (
        <div className="review-success">
          <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p>Thank you for your review! It will be published after moderation.</p>
        </div>
      ) : (
        <form onSubmit={handleReviewSubmit} className="review-form">
          <div className="form-group">
            <label>Your Rating</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-button ${reviewForm.rating >= star ? 'active' : ''}`}
                  onClick={() => handleInputChange('rating', star)}
                  aria-label={`${star} star${star === 1 ? '' : 's'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              type="text"
              id="name"
              value={reviewForm.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
              required
              className={formTouched && !reviewForm.name.trim() ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Your Email</label>
            <input
              type="email"
              id="email"
              value={reviewForm.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              required
              className={formTouched && (!reviewForm.email.trim() || !reviewForm.email.includes('@')) ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="comment">Your Review</label>
            <textarea
              id="comment"
              value={reviewForm.comment}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              placeholder="Share your experience with this product (minimum 10 characters)"
              required
              rows={4}
              className={formTouched && (!reviewForm.comment.trim() || reviewForm.comment.length < 10) ? 'error' : ''}
              style={{padding: '10px', background: '#fafbfc', border: '1px solid #e0e0e0'}}
            />
            <div className="character-count">
              {reviewForm.comment.length}/500 characters
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="files">Upload Images/Videos (Optional)</label>
            <input
              type="file"
              id="files"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ padding: '10px', background: '#fafbfc', border: '1px solid #e0e0e0' }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              You can upload up to 5 files (images or videos). Maximum size: 5MB per file.
            </small>
          </div>

          {filePreview.length > 0 && (
            <div className="file-preview">
              <h4>Selected Files:</h4>
              <div className="preview-grid">
                {filePreview.map((file, index) => (
                  <div key={index} className="preview-item">
                    {file.type.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                    ) : (
                      <video 
                        src={file.url} 
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                        controls
                      />
                    )}
                    <p style={{ fontSize: '12px', margin: '5px 0' }}>{file.name}</p>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewError && (
            <div className="review-error">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {reviewError}
            </div>
          )}

          <button
            type="submit"
            className="submit-review"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="loading-spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <SeoWrapper
      pageName={product.name || "product-details"}
      metaTitle={product.seo?.metaTitle}
      metaDescription={product.seo?.metaDescription}
      metaKeywords={product.seo?.metaKeywords}
      ogTitle={product.seo?.ogTitle}
      ogDescription={product.seo?.ogDescription}
      ogImage={product.seo?.ogImage}
      canonicalUrl={product.seo?.canonicalUrl}
      structuredData={product.seo?.structuredData}
    >
      <div className="product-details-container">
        <Header />
        <div className="product-details">
          <div className="product-images">
            <Image
              className="main-image"
              src={getProductImageSrc(product.images[selectedThumbnail])}
              alt={product.images[selectedThumbnail]?.alt_text || product.name}
              width={500}
              height={500}
            />
            <div className="thumbnail-images">
              {product.images.map((image, idx) => (
                <Image
                  key={image.id}
                  src={getProductImageSrc(image)}
                  alt={image.alt_text || `${product.name} thumbnail ${idx + 1}`}
                  className={selectedThumbnail === idx ? "active" : ""}
                  onClick={() => setSelectedThumbnail(idx)}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                />
              ))}
            </div>
          </div>
          <div className="product-info">
            <h1>{product.name}</h1>
            <div className="product-rating-row">
              <span className="stars">{renderStars(product.avg_rating)}</span>
              <span className="rating-value">{parseFloat(product.avg_rating || 0).toFixed(1)}</span>
              <span className="review-count">({product.reviews?.length || 0} reviews)</span>
              {selectedVariation && (
                <span className="sku-label">| SKU: <span className="sku-value">{selectedVariation.sku}</span></span>
              )}
            </div>
            <hr className="product-divider" />
            <div className="product-desc-short">
              <span>{product.description}</span>
            </div>
            <div className="product-price-row">
              {selectedVariation && (
                <>
                  <span className="current-price">₹{selectedVariation.price}</span>
                  {selectedVariation.comparePrice && (
                    <span className="original-price">₹{selectedVariation.comparePrice}</span>
                  )}
                </>
              )}
            </div>
            <div className="product-options">
              {renderAttributeOptions()}
            </div>
            {/* Coupons Display */}
            {coupons && coupons.length > 0 && (
              <div className="product-coupons-box">
                <h3 className="product-coupons-title">Available Coupons</h3>
                <div className="product-coupons-scroller-row">
                  {coupons.map((coupon) => (
                    <div 
                      key={coupon.id} 
                      className="coupon-card-details"
                      onClick={() => handleCopyCoupon(coupon.code)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        <div className="coupon-code-details">{coupon.code}</div>
                        <p className="coupon-description-details">
                          {coupon.description || generateCouponDescription(coupon)}
                        </p>
                        {copiedCoupon === coupon.code && (
                          <div style={{
                            position: 'absolute',
                            top: '-40px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#CE1E36',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            zIndex: 10,
                            animation: 'fadeInOut 2s ease-in-out'
                          }}>
                            Copied!
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Variation Scroller */}
            {product.variations && product.variations.length > 1 && (
              <div className="variation-scroller-box">
                <h3 className="variation-scroller-title">All Variations</h3>
                <div className="variation-scroller-row">
                  {product.variations.map((v, idx) => {
                    // Find image for this variation
                    let vImgIdx = 0;
                    if (v.image_url) {
                      vImgIdx = product.images.findIndex(img => img.image_url === v.image_url);
                    } else if (v.imageId) {
                      vImgIdx = product.images.findIndex(img => img.id === v.imageId);
                    } else if (v.images && Array.isArray(v.images)) {
                      for (const vi of v.images) {
                        const foundIdx = product.images.findIndex(img => img.image_url === vi.image_url);
                        if (foundIdx !== -1) { vImgIdx = foundIdx; break; }
                      }
                    }
                    if (vImgIdx === -1) vImgIdx = 0;
                    const vImg = product.images[vImgIdx];
                    // Get color/size attributes
                    const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
                    const color = attrs && attrs.color ? attrs.color[0] : null;
                    const size = attrs && attrs.size ? attrs.size[0] : null;
                    return (
                      <div
                        key={v.id}
                        className={`variation-card${selectedVariation && selectedVariation.id === v.id ? ' selected' : ''}`}
                        onClick={() => {
                          setSelectedVariation(v);
                          setSelectedAttributes(attrs);
                          setSelectedThumbnail(vImgIdx);
                        }}
                      >
                        <div className="variation-card-img-wrap">
                          <img
                            src={getProductImageSrc(vImg)}
                            alt={vImg?.alt_text || 'Variation'}
                            className="variation-card-img"
                          />
                        </div>
                        <div className="variation-card-attrs">
                          {color && <span className="variation-card-color" style={{background: color, borderColor: color}} title={color}></span>}
                          {size && <span className="variation-card-size">{size}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="product-action-box">
              <div className="quantity-and-buttons">
                <div className="quantity-box">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="quantity-btn">-</button>
                  <span className="quantity-value">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="quantity-btn">+</button>
                </div>
                <button className="add-to-cart" onClick={handleAddToCart}>
                  {showAddedToCart ? 'Added to Cart!' : 'Add to cart'}
                </button>
                <button className="buy-now" onClick={handleBuyNow}>
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Tabs for Description and Review */}
        <div className="product-tabs-section">
          <div className="product-tabs-container">
            <div className="product-tabs">
              <button
                className={`tab${activeTab === "description" ? " active" : ""}`}
                onClick={() => setActiveTab("description")}
              >
                Description
              </button>
              <button
                className={`tab${activeTab === "review" ? " active" : ""}`}
                onClick={() => setActiveTab("review")}
              >
                Review ({product.reviews?.length || 0})
              </button>
            </div>
            {/* Tab Content */}
            {activeTab === "description" ? (
              <div className="product-description">
                <p>{product.description}</p>
                {product.seo?.metaDescription && (
                  <p>{product.seo.metaDescription}</p>
                )}
              </div>
            ) : (
              <div className="product-reviews">
                {product.has_video_reviews && (
                  <div className="video-reviews">
                    <h3>Video Reviews</h3>
                    <p>Video reviews available</p>
                  </div>
                )}
                
                {/* Display existing reviews */}
                <div className="existing-reviews">
                  <h3>Customer Reviews ({product.reviews?.length || 0})</h3>
                  {product.reviews && product.reviews.length > 0 ? (
                    <div className="reviews-list">
                      {product.reviews.map((review, index) => (
                        <div key={review.id || index} className="review-item">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <span className="reviewer-name">{review.reviewerName || review.User?.username || review.guestName || 'Anonymous'}</span>
                              <div className="review-rating">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                  <span key={i} className="star">★</span>
                                ))}
                              </div>
                            </div>
                            <span className="review-date">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="review-content">
                            <p className="review-text">{review.review}</p>
                            {review.ReviewImages && review.ReviewImages.length > 0 && (
                              <div className="review-images">
                                {review.ReviewImages.map((image, imgIndex) => (
                                  <div key={image.id || imgIndex} className="review-image">
                                    {image.fileType === 'video' ? (
                                      <video 
                                        src={getProductImageSrc(`/uploads/reviews/${image.fileName}`)}
                                        controls
                                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <img 
                                        src={getProductImageSrc(`/uploads/reviews/${image.fileName}`)}
                                        alt={`Review image ${imgIndex + 1}`}
                                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
                  )}
                </div>

                <div className="review-section">
                  <h3>Write a Review</h3>
                  {renderReviewForm()}
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </SeoWrapper>
  );
} 