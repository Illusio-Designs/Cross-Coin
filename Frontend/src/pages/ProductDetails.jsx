import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from "next/navigation";
import { getPublicProductBySlug, createPublicReview, getPublicCoupons } from '../services/publicindex';
import SeoWrapper from '../console/SeoWrapper';
import { showValidationErrorToast, showReviewSubmittedSuccessToast, showReviewSubmittedErrorToast } from '../utils/toast';
import Loader from '../components/Loader';
import { fbqTrack } from '../components/common/Analytics';
import { getProductImageSrc } from '../utils/imageUtils';
import DOMPurify from 'dompurify';
import Modal from "../components/common/Modal";
import colorMap from '../components/products/colorMap';
import { useRef } from "react";
// Add image loaded state

export default function ProductDetails() {
  const searchParams = useSearchParams();
  const rawSlug = searchParams.get('slug');
  
  // Decode the slug to handle URL-encoded characters like %28 and %29
  const productSlug = rawSlug ? decodeURIComponent(rawSlug) : null;
  
  const { addToCart, removeFromCart } = useCart();
  const { addToWishlist, removeFromWishlist, wishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Debug logging for slug processing
  console.log('=== FRONTEND SLUG DEBUG ===');
  console.log('Raw slug from URL:', rawSlug);
  console.log('Decoded slug:', productSlug);
  console.log('Loading state:', loading);
  console.log('Error state:', error);
  console.log('Product state:', product);
  console.log('==========================');
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
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [imageLoaded, setImageLoaded] = useState({});
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false);
  const couponRefs = useRef({});
  // Store selected size per pack/variation
  const [selectedSizes, setSelectedSizes] = useState({});

  // Add color selection by name
  const [selectedColor, setSelectedColor] = useState(null);
  // Add type/model selection state
  const [selectedType, setSelectedType] = useState(null);

  // Add state for selectedSku
  const [selectedSku, setSelectedSku] = useState('');

  // Find the selected variation by SKU
  const selectedVariationBySku = product?.variations.find(v => v.sku === selectedSku) || product?.variations[0];

  // Use images from selected variation if available, else fallback to product images
  const variationImages = selectedVariation?.images && selectedVariation.images.length > 0
    ? selectedVariation.images
    : product?.images || [];

  // Reset selectedThumbnail when SKU changes
  useEffect(() => {
    setSelectedThumbnail(0);
  }, [selectedSku]);

  // Parse attributes
  const attrs = selectedVariationBySku && typeof selectedVariationBySku.attributes === 'string'
    ? JSON.parse(selectedVariationBySku.attributes)
    : selectedVariationBySku?.attributes || {};

  const productApiCalledRef = useRef(false);
  const couponApiCalledRef = useRef(false);

  useEffect(() => {
    if (productApiCalledRef.current) return; // Prevent multiple calls
    productApiCalledRef.current = true;
    console.log('API BEING CALLED: ProductDetails product fetch');
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
              setSelectedSku(response.data.variations[0].sku); // Always select first variation
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
    if (couponApiCalledRef.current) return; // Prevent multiple calls
    couponApiCalledRef.current = true;
    console.log('API BEING CALLED: ProductDetails coupon fetch');
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

  // Get all unique color names from variations
  const colorOptions = product?.variations
    ? Array.from(new Set(product.variations.flatMap(v => {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        return attrs && attrs.color ? attrs.color : [];
      })))
    : [];

  // Find the variation for the selected color
  const selectedColorVariation = product?.variations
    ? product.variations.find(v => {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        return attrs && attrs.color && attrs.color.includes(selectedColor || colorOptions[0]);
      })
    : null;

  // Get all unique types from variations
  const typeOptions = product?.variations
    ? Array.from(new Set(product.variations.flatMap(v => {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        return attrs && attrs.type ? attrs.type : [];
      })))
    : [];

  // Get all colors for the selected type
  const colorsForSelectedType = product?.variations
    ? Array.from(new Set(product.variations
        .filter(v => {
          const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
          return attrs && attrs.type && attrs.type.includes(selectedType || typeOptions[0]);
        })
        .flatMap(v => {
          const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
          return attrs && attrs.color ? attrs.color : [];
        })
      ))
    : [];

  // Find the variation for the selected type and color
  const selectedTypeColorVariation = product?.variations
    ? product.variations.find(v => {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        return attrs && attrs.type && attrs.type.includes(selectedType || typeOptions[0]) &&
               attrs.color && attrs.color.includes(selectedColor || colorsForSelectedType[0]);
      })
    : null;

  // Update selectedType and selectedColor on mount if not set
  useEffect(() => {
    if (!selectedType && typeOptions.length > 0) {
      setSelectedType(typeOptions[0]);
    }
  }, [typeOptions, selectedType]);

  useEffect(() => {
    if (!selectedColor && colorsForSelectedType.length > 0) {
      setSelectedColor(colorsForSelectedType[0]);
    }
  }, [colorsForSelectedType, selectedColor]);

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

      // If clicking the same coupon, reset state first to force re-render
      if (copiedCoupon === couponCode) {
        setCopiedCoupon(null);
        setTooltipStyle({});
        setTimeout(() => {
          setCopiedCoupon(couponCode);
          setTooltipStyle({
            '--tooltip-top': `20px`,
            '--tooltip-left': `50vw`
          });
          requestAnimationFrame(() => {
            if (couponRefs.current[couponCode]) {
              const rect = couponRefs.current[couponCode].getBoundingClientRect();
              const top = rect.top - 44;
              const left = rect.left + rect.width / 2;
              setTooltipStyle({
                '--tooltip-top': `${top}px`,
                '--tooltip-left': `${left}px`,
                '--tooltip-arrow-left': `${left}px`
              });
            }
          });
        }, 0);
      } else {
        setCopiedCoupon(couponCode);
        setTooltipStyle({
          '--tooltip-top': `20px`,
          '--tooltip-left': `50vw`
        });
        requestAnimationFrame(() => {
          if (couponRefs.current[couponCode]) {
            const rect = couponRefs.current[couponCode].getBoundingClientRect();
            const top = rect.top - 44;
            const left = rect.left + rect.width / 2;
            setTooltipStyle({
              '--tooltip-top': `${top}px`,
              '--tooltip-left': `${left}px`,
              '--tooltip-arrow-left': `${left}px`
            });
          }
        });
      }

      setTimeout(() => {
        setCopiedCoupon(null);
        setTooltipStyle({});
      }, 2000);
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
      if(attributeName === 'color') {
        console.log('Color selected:', value, 'SelectedAttributes:', newAttributes);
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

  // Add this decodeHtml function
  function decodeHtml(html) {
    if (typeof window !== 'undefined') {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    }
    return html;
  }

  // Remove useEffect for tooltip position

  // Show loading state
  if (loading) {
    return (
      <SeoWrapper
        pageName="product-details"
        seo={null}
      >
        <div className="product-details-container">
          <Header />
          <div className="product-details">
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Loader />
            </div>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  // Show error state
  if (error) {
    return (
      <SeoWrapper
        pageName="product-details"
        seo={null}
      >
        <div className="product-details-container">
          <Header />
          <div className="product-details">
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h2>Product Not Found</h2>
              <p>The product you're looking for doesn't exist or has been removed.</p>
              <button 
                onClick={() => window.history.back()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  // Show error if no product found
  if (!product) {
    return (
      <SeoWrapper
        pageName="product-details"
        seo={null}
      >
        <div className="product-details-container">
          <Header />
          <div className="product-details">
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h2>Product Not Found</h2>
              <p>No product found with the given slug.</p>
              <button 
                onClick={() => window.history.back()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  // Log product description and image URL
  console.log('Product Description:', product.description);
  const mainImageUrl = product.images && product.images.length > 0
    ? (product.images[0].image_url || product.images[0].url || product.images[0])
    : '';
  console.log('Main Image URL:', mainImageUrl);

  // Use home page logic for image URL (getCategoryImageSrc equivalent)
  function getProductImageSrcForDetails(imageObj) {
    if (!imageObj) return '/assets/card1-left.webp';
    const img = imageObj.image_url || imageObj.url || imageObj;
    if (typeof img !== 'string') return '/assets/card1-left.webp';
    if (img.startsWith('http')) return img;
    let baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
    if (img.startsWith('/')) {
      return `${baseUrl}${img}`;
    }
    return `${baseUrl}/${img}`;
  }

  function forceEnvImageBase(url) {
    if (!url) return '/assets/card1-left.webp';
    if (url.startsWith('http')) {
      if (url.includes('localhost:5000')) {
        const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        return `${baseUrl}${path}`;
      }
      return url;
    }
    const baseUrl = process.env.NEXT_PUBLIC_IMAGE_URL || 'https://crosscoin.in';
    return `${baseUrl}${url}`;
  }

  // When a pack is selected, show its size options and highlight the selected size for that pack
  const handleSizeSelect = (sku, size) => {
    setSelectedSizes(prev => ({ ...prev, [sku]: size }));
  };

  // Get the selected size for the current pack
  let defaultSize = '';
    if (Array.isArray(attrs.size) && attrs.size.length > 0) {
        defaultSize = attrs.size[0];
    } else if (typeof attrs.size === 'string' && attrs.size) {
        defaultSize = attrs.size;
    }
  const selectedSizeForPack = selectedSizes[selectedSku] || defaultSize;

  // Update addToCart and buyNow to use selectedSizeForPack
  const handleAddToCart = () => {
    // No validation required - use defaults automatically
    const selectedColor = selectedAttributes.color || '';
    const selectedSize = selectedSizeForPack || '';
    // Find the image for the selected variation by product_variation_id
    let selectedImage = [];
    let imagesForVariation = [];
    if (product.images && product.images.length > 0 && selectedVariation.id) {
      imagesForVariation = product.images.filter(img => img.product_variation_id === selectedVariation.id);
      console.log('All product images:', product.images);
      console.log('Selected variation id:', selectedVariation.id);
      console.log('Images for this variation:', imagesForVariation);
      if (imagesForVariation.length > 0) {
        selectedImage = [imagesForVariation[0]];
      }
    }
    if (selectedImage.length === 0 && selectedVariation.images && selectedVariation.images.length > 0) {
      selectedImage = [selectedVariation.images[0]];
      console.log('Fallback to selectedVariation.images:', selectedVariation.images);
    }
    console.log('Final image sent to cart:', selectedImage);
    addToCart(
      product,
      selectedColor,
      selectedSize,
      quantity,
      selectedVariation.id,
      selectedImage
    );
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 2000);
    fbqTrack('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
      quantity,
    });
  };

  const handleBuyNow = async () => {
    console.log('=== BUY NOW CLICKED ===');
    console.log('Product:', product);
    console.log('Selected variation:', selectedVariation);
    console.log('Selected attributes:', selectedAttributes);
    console.log('Selected size for pack:', selectedSizeForPack);
    console.log('User authenticated:', isAuthenticated);
    
    setIsBuyNowLoading(true);

    try {
      // Use default values automatically - no validation required
      const selectedColor = selectedAttributes.color || '';
      const selectedSize = selectedSizeForPack || '';
      
      // Find the image for the selected variation by product_variation_id
      let selectedImage = [];
      let imagesForVariation = [];
      if (product.images && product.images.length > 0 && selectedVariation.id) {
        imagesForVariation = product.images.filter(img => img.product_variation_id === selectedVariation.id);
        console.log('All product images:', product.images);
        console.log('Selected variation id:', selectedVariation.id);
        console.log('Images for this variation:', imagesForVariation);
        if (imagesForVariation.length > 0) {
          selectedImage = [imagesForVariation[0]];
        }
      }
      if (selectedImage.length === 0 && selectedVariation.images && selectedVariation.images.length > 0) {
        selectedImage = [selectedVariation.images[0]];
        console.log('Fallback to selectedVariation.images:', selectedVariation.images);
      }
      console.log('Final image sent to cart:', selectedImage);
      
      // Add product to cart
      console.log('ProductDetails Buy Now: Adding product to cart with variation data:', {
        productName: product.name,
        selectedColor,
        selectedSize,
        quantity,
        selectedVariationId: selectedVariation.id,
        selectedVariation,
        selectedImage
      });
      await addToCart(
        product,
        selectedColor,
        selectedSize,
        quantity,
        selectedVariation.id,
        selectedImage
      );
      console.log('Product added to cart successfully');

      // Track the event (non-blocking)
      console.log('Tracking checkout event...');
      try {
        fbqTrack('InitiateCheckout', {
          content_ids: [product.id],
          content_name: product.name,
          content_type: 'product',
          value: product.price,
          currency: 'INR',
          quantity,
        });
      } catch (trackingError) {
        console.warn('Tracking error (non-blocking):', trackingError);
      }

      // Handle different flows for authenticated vs guest users
      if (!isAuthenticated) {
        console.log('ProductDetails Buy Now: User not authenticated - setting guest checkout flag');
        sessionStorage.setItem('guestCheckout', 'true');
        // Clear any existing step to ensure guest form is shown first
        sessionStorage.removeItem('checkoutStep');
      } else {
        console.log('ProductDetails Buy Now: User authenticated - clearing guest checkout flag');
        sessionStorage.removeItem('guestCheckout');
        // Set step to cart for authenticated users
        sessionStorage.setItem('checkoutStep', 'cart');
      }

      // Redirect to unified checkout
      console.log('Redirecting to unified checkout...');
      console.log('Current URL before redirect:', window.location.href);
      
      // Use router.push for better navigation
      try {
        router.push('/UnifiedCheckout');
        console.log('Router push executed');
      } catch (e) {
        console.error('Router push failed:', e);
        // Fallback to window.location
        try {
          window.location.replace('/UnifiedCheckout');
          console.log('Fallback redirect method executed');
        } catch (e2) {
          console.error('Fallback redirect failed:', e2);
          window.location.href = '/UnifiedCheckout';
        }
      }
      
    } catch (error) {
      console.error('Error in buy now process:', error);
      showValidationErrorToast('Something went wrong. Please try again.');
      setIsBuyNowLoading(false);
    }
  };

  const handleAddToWishlist = () => {
    const productToSend = {
      ...product,
      variationImages: variationImages.map(img => img.image_url || img.url || img),
      selectedVariation: selectedVariationBySku,
      selectedSize: selectedSizeForPack,
    };
    addToWishlist(productToSend);
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

  // Calculate star counts for 5-1 stars
  const starCounts = [5, 4, 3, 2, 1].map(star =>
    product.reviews ? product.reviews.filter(r => r.rating === star).length : 0
  );
  const totalReviews = product.reviews ? product.reviews.length : 0;

  // Log color options and selected color for debugging
  console.log('Color options:', colorOptions, 'Selected color:', selectedColor);

  // Add this function inside the ProductDetails component
  const renderColorSelection = () => {
    // Always show color selection if at least one variation has a color attribute
    const hasColor = product?.variations && product.variations.some(v => {
      const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
      return attrs && attrs.color && Array.isArray(attrs.color) && attrs.color.length > 0;
    });
    if (!hasColor) return null;
    return (
      <div className="select-color-section">
        <strong>Select Color:</strong>
        <div className="select-color-options">
          {product.variations.map((variation) => {
            const attrs = typeof variation.attributes === 'string' ? JSON.parse(variation.attributes) : variation.attributes;
            const colors = Array.isArray(attrs?.color) ? attrs.color : [];
            return (
              <button
                key={variation.sku}
                className={`color-swatch-btn color-pack-btn${selectedSku === variation.sku ? ' selected' : ''}`}
                onClick={() => {
                  setSelectedSku(variation.sku);
                  setSelectedVariation(variation);
                }}
                aria-label={`Select pack with colors: ${colors.join(', ')}`}
                type="button"
              >
                <div className="color-pack-swatch-row">
                  {colors.map((color, cidx) => (
                    <span
                      key={color + cidx}
                      className="color-swatch"
                      style={{ backgroundColor: colorMap[color.toLowerCase()] || '#ccc' }}
                      title={color}
                    />
                  ))}
                </div>
                <span className="color-pack-count">{colors.length > 1 ? `Pack of ${colors.length}` : colors[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Update renderSizeSelection to only show if there are 2+ sizes and not if size is 'Free Size'
  const renderSizeSelection = () => {
    let sizes = Array.isArray(attrs.size) ? attrs.size : (typeof attrs.size === 'string' && attrs.size ? [attrs.size] : []);
    // Remove empty/undefined/null values
    sizes = sizes.filter(s => !!s && typeof s === 'string');
    // Hide if only one size and it's 'Free Size' (case-insensitive)
    if (sizes.length === 1 && sizes[0].toLowerCase().includes('free')) return null;
    // Only show size selection if there are 2 or more sizes
    if (sizes.length < 2) return null;
    return (
      <div className="select-size-section">
        <strong>Select Size:</strong>
        <div className="select-size-options">
          {sizes.map((size) => (
            <button
              key={size}
              className={`size-swatch-btn${selectedSizeForPack === size ? ' selected' : ''}`}
              onClick={() => handleSizeSelect(selectedSku, size)}
              type="button"
              aria-label={`Select size ${size}`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Collect all unique attribute keys from all variations
  const allAttributeKeys = product?.variations
    ? Array.from(new Set(product.variations.flatMap(v => {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        return attrs ? Object.keys(attrs) : [];
      }))).sort()
    : [];

  return (
    <SeoWrapper
      pageName={product?.slug || "product-details"}
      seo={product?.seo}
    >
      <div className="product-details-container">
        <Header />
        <div className="product-details">
          <div className="product-gallery" style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Skeleton placeholder for main image */}
              {!imageLoaded[selectedThumbnail] && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: '#eee',
                    borderRadius: 8,
                    zIndex: 1
                  }}
                />
              )}
              {variationImages[selectedThumbnail] && (variationImages[selectedThumbnail].image_url || variationImages[selectedThumbnail].url || variationImages[selectedThumbnail]) ? (
                <>
                  <img
                    src={forceEnvImageBase(
                      variationImages[selectedThumbnail]?.image_url ||
                      variationImages[selectedThumbnail]?.url ||
                      variationImages[selectedThumbnail]
                    )}
                    alt={variationImages[selectedThumbnail]?.alt_text || product.name}
                    style={{
                      width: '100%',
                      height: '400px',
                      objectFit: 'contain',
                      boxShadow: '0 2px 8px #eee',
                      background: '#eee',
                      display: 'block'
                    }}
                    onLoad={() => setImageLoaded(prev => ({ ...prev, [selectedThumbnail]: true }))}
                    onError={() => setImageLoaded(prev => ({ ...prev, [selectedThumbnail]: true }))}
                    onClick={() => setIsZoomOpen(true)}
                  />
                  {!imageLoaded[selectedThumbnail] && (
                    <div className="shimmer-placeholder" />
                  )}
                </>
              ) : (
                <div style={{ width: 400, height: 400, background: '#eee', borderRadius: 8 }} />
              )}
              {/* Zoom button overlay */}
              <button
                onClick={() => setIsZoomOpen(true)}
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px #eee',
                  cursor: 'pointer'
                }}
                aria-label="Zoom"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
            {/* Thumbnails */}
            <div style={{ display: 'flex', flexWrap: 'wrap' , justifyContent: 'center', gap: 16, marginTop: 16 }}>
              {variationImages.map((image, idx) => (
                (image && (image.image_url || image.url || image)) ? (
                  <div key={image.id || idx} style={{ position: 'relative', width: 80, height: 80 }}>
                    {/* Skeleton placeholder for thumbnail */}
                    {!imageLoaded[idx] && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: '#eee',
                          zIndex: 1
                        }}
                      />
                    )}
                    <img
                      src={forceEnvImageBase(image.image_url || image.url || image)}
                      alt={image.alt_text || `${product.name} thumbnail ${idx + 1}`}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        border: selectedThumbnail === idx ? '2px solid #222' : '1px solid #eee',
                        cursor: 'pointer',
                        background: '#eee',
                        display: 'block'
                      }}
                      onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
                      onError={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
                      onClick={() => setSelectedThumbnail(idx)}
                    />
                    {!imageLoaded[idx] && (
                      <div className="shimmer-placeholder" style={{ width: 80, height: 80, position: 'absolute', top: 0, left: 0 }} />
                    )}
                  </div>
                ) : (
                  <div key={image.id || idx} style={{ width: 80, height: 80, background: '#eee', borderRadius: 4 }} />
                )
              ))}
            </div>
            {/* Zoom Modal */}
            {isZoomOpen && (
              <Modal isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)}>
                <img
                  src={forceEnvImageBase(
                    variationImages[selectedThumbnail]?.image_url ||
                    variationImages[selectedThumbnail]?.url ||
                    variationImages[selectedThumbnail]
                  )}
                  alt="Zoomed"
                  style={{ width: '100%', maxWidth: 700, objectFit: 'contain', borderRadius: 8 }}
                />
              </Modal>
            )}
          </div>
          <div className="product-info">
            {/* A. Title, price, review, wishlist */}
            <div className="product-title-row">
              <div>
                <h1 className="product-title">{product.name}</h1>
                <div className="product-price-row">
                  <span className="current-price">₹{selectedVariationBySku.price}</span>
                  {selectedVariationBySku.comparePrice && (
                    <span className="original-price">₹{selectedVariationBySku.comparePrice}</span>
                  )}
                  <span className="review-summary">
                    <span className="stars">{renderStars(product.avg_rating || 0)}</span>
                    <span className="rating-value">{parseFloat(product.avg_rating || 0).toFixed(1)}</span>
                    <span className="review-count">({product.review_count || 0} reviews)</span>
                  </span>
                </div>
                {/* Included Colors UI for Packs and Singles */}
                {/* Removed Included Colors section as per request */}
              </div>
              {/* Wishlist icon */}
              <button
                className="wishlist-btn"
                onClick={() => {
                  if (wishlist.some(item => item.id === product.id)) {
                    handleRemoveFromWishlist()
                  } else {
                    handleAddToWishlist()
                  }
                }}
                aria-label={wishlist.some(item => item.id === product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <svg
                  className="wishlist-icon"
                  width="32" 
                  height="32"
                  viewBox="0 0 24 24"
                  fill={wishlist.some(item => item.id === product.id) ? '#e60000' : 'none'}
                  stroke="#222"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>
            {/* D. Details section */}
            <div className="product-details-section">
              <h3 className="details-heading">Details</h3>
              <div
                  className="details-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px 32px',
                    alignItems: 'start',
                  }}
                >
                  {allAttributeKeys.map((key) => (
                    <div key={key} style={{ minWidth: 120 }}>
                      <span className="details-label" style={{ textTransform: 'capitalize' }}>{key}:</span>
                      <span className="details-value">{key === 'size' ? selectedSizeForPack : (Array.isArray(attrs[key]) ? attrs[key].join(', ') : (attrs[key] ?? '-'))}</span>
                    </div>
                  ))}
                  <div>
                    <span className="details-label">SKU:</span>
                    <span className="details-value">{selectedSku || '-'}</span>
                  </div>
                </div>
            </div>
            {renderColorSelection()}
            {renderSizeSelection()}
            {/* Coupon Box Section (moved after details) */}
            {coupons && coupons.length > 0 && (
              <div className="product-coupons-box">
                <h3 className="product-coupons-title">Available Coupons</h3>
                <div className="product-coupons-scroller-row">
                  {coupons.map((coupon) => (
                    <div 
                      key={coupon.id || coupon.code} 
                      className="coupon-card-details"
                      onClick={() => handleCopyCoupon(coupon.code)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Copy coupon code ${coupon.code}`}
                      onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') handleCopyCoupon(coupon.code); }}
                      ref={el => couponRefs.current[coupon.code] = el}
                    >
                      <div className="coupon-code-details">{coupon.code}</div>
                      <p className="coupon-description-details">
                        {coupon.description || generateCouponDescription(coupon)}
                      </p>
                      {copiedCoupon === coupon.code && tooltipStyle['--tooltip-top'] && tooltipStyle['--tooltip-left'] && (
                        <span className="coupon-copied-tooltip fixed" style={tooltipStyle}>Copied!</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Quantity and Action Buttons Section */}
            <div className="quantity-section">
              <div className="details-heading">Quantity:</div>
              <div className="quantity-box">
                <button className="quantity-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                <span className="quantity-value">{quantity}</span>
                <button className="quantity-btn" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
            {/* Action Buttons Row */}
            <div className="action-buttons-row">
              <button className="add-to-cart-btn" onClick={handleAddToCart}>
                ADD TO CART
              </button>
              <button 
                className="buy-now-btn" 
                onClick={handleBuyNow}
                disabled={isBuyNowLoading}
                style={{
                  opacity: isBuyNowLoading ? 0.7 : 1,
                  cursor: isBuyNowLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isBuyNowLoading ? (
                  <>
                    <svg className="loading-spinner" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '8px' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                    PROCESSING...
                  </>
                ) : (
                  'BUY IT NOW'
                )}
              </button>
            </div>
            {/* Description row added below */}
            <div className="details-row">
              <div>
                <div className="details-heading">Description:</div>
                <span className="details-value">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(decodeHtml(product.description || "-"))
                    }}
                  />
                </span>
              </div>
            </div>
        </div>
          
        </div>
        {/* Review Slider and Review Form (no tabs) */}
        <div className="product-reviews-section" style={{ margin: '32px 9%' }}>
          <div className="review-header-row">
            <h2 className="customer-reviews-heading">Customer Reviews</h2>
              <button
              className="write-review-btn"
              onClick={() => setShowReviewForm(true)}
            >
              Write a Review
              </button>
            </div>
          <div className="star-breakdown-row">
            {[5,4,3,2,1].map((star, idx) => (
              <div className="star-breakdown-item" key={star}>
                <span className="star-label">{star} <span style={{color:'#f59e42'}}>★</span></span>
                <span className="star-count">{starCounts[idx]}</span>
              </div>
            ))}
            <span className="total-reviews-label">({totalReviews} reviews)</span>
                  </div>
          <div
            className="review-slider"
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: '16px',
              padding: '8px 0',
              scrollSnapType: 'x mandatory'
            }}
          >
            {(product.reviews && product.reviews.length > 0) ? (
              product.reviews.map((review, idx) => (
                <div
                  key={review.id || idx}
                  className="review-slide"
                  style={{
                    minWidth: '280px',
                    maxWidth: '320px',
                    background: '#fafbfc',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    padding: '16px',
                    scrollSnapAlign: 'start',
                    boxShadow: '0 2px 8px #eee'
                  }}
                >
                  <div className="reviewer-name" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {review.reviewerName || review.User?.username || review.guestName || 'Anonymous'}
                  </div>
                  <div className="review-stars" style={{ color: '#f59e42', marginBottom: 4 }}>
                                {Array.from({ length: review.rating }).map((_, i) => (
                      <span key={i}>★</span>
                                ))}
                              </div>
                  <div className="review-text" style={{ fontSize: 14, marginBottom: 8 }}>
                    {review.review}
                            </div>
                  <div className="review-date" style={{ fontSize: 12, color: '#888' }}>
                              {new Date(review.createdAt).toLocaleDateString()}
                          </div>
                            {review.ReviewImages && review.ReviewImages.length > 0 && (
                    <div className="review-images" style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                      {review.ReviewImages.map((image, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={forceEnvImageBase(`/uploads/reviews/${image.fileName}`)}
                          alt={`Review image ${imgIdx + 1}`}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                        />
                                ))}
                              </div>
                            )}
                          </div>
              ))
                  ) : (
              <div style={{ color: '#888', fontSize: 14 }}>No reviews yet.</div>
                  )}
                </div>
          {showReviewForm && (
            <div className="review-form-modal">
              <div className="review-form-modal-content">
                <button
                  className="close-modal-btn"
                  onClick={() => setShowReviewForm(false)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 16,
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#888'
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
                  <h3>Write a Review</h3>
                  {renderReviewForm()}
                </div>
              </div>
            )}
        </div>
        <Footer />
      </div>
    </SeoWrapper>
  );
} 