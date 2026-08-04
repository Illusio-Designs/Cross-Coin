/**
 * Public API — Barrel re-export file.
 *
 * All API functions are split into domain-specific modules under ./api/:
 *   api/config.js      — shared axios config, base URL, brand header
 *   api/userApi.js     — auth, profile, account management
 *   api/cartApi.js     — cart + wishlist CRUD
 *   api/orderApi.js    — order creation, tracking, cancellation
 *   api/paymentApi.js  — Razorpay, checkout, OTP, shipping fees
 *   api/productApi.js  — products, categories, sliders, reviews, SEO, blogs, addresses
 *   api/couponApi.js   — coupon integration service, offer API
 *
 * This file re-exports everything so existing imports continue to work:
 *   import { createOrder, getCart } from '../services/publicApi';
 *
 * New code should import directly from the domain file:
 *   import { createOrder } from '../services/api/orderApi';
 */

// ── Config ────────────────────────────────────────────────────────────────
export { API_URL, API_BASE_URL, BRAND_NAME, createPublicApiClient, addBrandHeader, offerAPI } from './api/config';

// ── User & Auth ───────────────────────────────────────────────────────────
export { registerUser, loginUser, forgotPassword, resetPassword, getCurrentUser, updateUserProfile, updateUserPassword, logout, deleteAccount } from './api/userApi';

// ── Cart & Wishlist ───────────────────────────────────────────────────────
export { getCart, addToCart, updateCartItem, removeFromCart, clearCart, getWishlist, addToWishlist, removeFromWishlist, clearWishlist } from './api/cartApi';

// ── Orders ────────────────────────────────────────────────────────────────
export { getUserOrders, createOrder, createGuestOrder, trackOrderByOrderNumber, trackOrderByAWB, cancelOrder, initiateReturn } from './api/orderApi';

// ── Payments & Checkout ───────────────────────────────────────────────────
export { createRazorpayOrder, updateOrderPayment, initiateCheckout, initiateGuestCheckout, retryCheckout, sendCheckoutPhoneOtp, verifyCheckoutPhoneOtp, getShippingFees, checkPincodeServiceability } from './api/paymentApi';

// ── Products, Categories, Content ─────────────────────────────────────────
export { getPublicCategories, getPublicCategoryByName, getPublicSliders, getPublicLookbooks, getPublicLookbookBySlug, getPublicProductBySlug, getAllPublicProducts, searchProducts, getPublicCoupons, validateCoupon, getPublicProductReviews, createPublicReview, getAllPublicReviews, getSeoByPageName, getPublicPolicyByName, getPublicBlogs, getPublicBlogBySlug, getPublicBlogTags, createShippingAddress, getUserShippingAddresses, updateShippingAddress, deleteShippingAddress, setDefaultShippingAddress, createGuestShippingAddress, getGuestShippingAddresses } from './api/productApi';

// ── Coupons & Offers ──────────────────────────────────────────────────────
export { CouponIntegrationService, couponIntegrationService, offerAPIService } from './api/couponApi';
