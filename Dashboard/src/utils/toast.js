import React from 'react';
import { toast } from 'react-toastify';
import ToastMessage from '../components/common/ToastMessage';

// Render the custom Obzus toast (see components/common/ToastMessage +
// styles/common/obzToast.css). icon/closeButton off — our card owns them.
const baseConfig = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: true,
  pauseOnFocusLoss: false,
  draggable: false,
  icon: false,
  closeButton: false,
};

const push = (type, message, toastId) => {
  const id = toastId || (typeof message === 'string' ? message : type);
  toast.dismiss(id);
  toast(React.createElement(ToastMessage, { type, message }), { ...baseConfig, toastId: id });
};

export const showSuccessToast = (message, toastId) => push('success', message, toastId);
export const showErrorToast = (message, toastId) => push('error', message, toastId);
export const showInfoToast = (message, toastId) => push('info', message, toastId);
export const showWarningToast = (message, toastId) => push('warning', message, toastId);

// Specific action toasts
export const showLoginSuccessToast = () => {
  showSuccessToast('Successfully logged in! Welcome back!', 'login-success');
};

export const showLoginErrorToast = (error) => {
  showErrorToast(error || 'Login failed. Please check your credentials.', 'login-error');
};

export const showRegisterSuccessToast = () => {
  showSuccessToast('Registration successful! Please log in to continue.', 'register-success');
};

export const showRegisterErrorToast = (error) => {
  showErrorToast(error || 'Registration failed. Please try again.', 'register-error');
};

export const showLogoutSuccessToast = () => {
  showInfoToast('Successfully logged out. See you soon!', 'logout-success');
};

export const showAddToCartSuccessToast = (productName) => {
  showSuccessToast(`${productName} added to cart successfully!`, 'add-cart');
};

export const showAddToCartErrorToast = (error) => {
  showErrorToast(error || 'Failed to add item to cart. Please try again.', 'add-cart-error');
};

export const showRemoveFromCartSuccessToast = (productName) => {
  showInfoToast(`${productName} removed from cart.`, 'remove-cart');
};

export const showRemoveFromCartErrorToast = (error) => {
  showErrorToast(error || 'Failed to remove item from cart. Please try again.', 'remove-cart-error');
};

export const showUpdateCartSuccessToast = () => {
  showSuccessToast('Cart updated successfully!', 'update-cart');
};

export const showClearCartSuccessToast = () => {
  showInfoToast('Cart cleared successfully!', 'clear-cart');
};

export const showAddToWishlistSuccessToast = (productName) => {
  showSuccessToast(`${productName} added to wishlist!`, 'add-wishlist');
};

export const showAddToWishlistErrorToast = (error) => {
  showErrorToast(error || 'Failed to add item to wishlist. Please try again.', 'add-wishlist-error');
};

export const showRemoveFromWishlistSuccessToast = (productName) => {
  showInfoToast(`${productName} removed from wishlist.`, 'remove-wishlist');
};

export const showClearWishlistSuccessToast = () => {
  showInfoToast('Wishlist cleared successfully!', 'clear-wishlist');
};

export const showOrderPlacedSuccessToast = (orderNumber) => {
  showSuccessToast(`Order #${orderNumber} placed successfully! Thank you for your purchase.`, 'order-placed');
};

export const showOrderPlacedErrorToast = (error) => {
  showErrorToast(error || 'Failed to place order. Please try again.', 'order-error');
};

export const showPaymentSuccessToast = () => {
  showSuccessToast('Payment processed successfully!', 'payment-success');
};

export const showPaymentErrorToast = (error) => {
  showErrorToast(error || 'Payment failed. Please try again.', 'payment-error');
};

export const showProfileUpdateSuccessToast = () => {
  showSuccessToast('Profile updated successfully!', 'profile-update');
};

export const showProfileUpdateErrorToast = (error) => {
  showErrorToast(error || 'Failed to update profile. Please try again.', 'profile-error');
};

export const showAddressAddedSuccessToast = () => {
  showSuccessToast('Shipping address added successfully!', 'addr-added');
};

export const showAddressUpdatedSuccessToast = () => {
  showSuccessToast('Shipping address updated successfully!', 'addr-updated');
};

export const showAddressDeletedSuccessToast = () => {
  showInfoToast('Shipping address deleted successfully!', 'addr-deleted');
};

export const showReviewSubmittedSuccessToast = () => {
  showSuccessToast('Review submitted successfully! Thank you for your feedback.', 'review-success');
};

export const showReviewSubmittedErrorToast = (error) => {
  showErrorToast(error || 'Failed to submit review. Please try again.', 'review-error');
};

export const showCouponAppliedSuccessToast = (code) => {
  showSuccessToast(`Coupon "${code}" applied successfully!`, 'coupon-applied');
};

export const showCouponAppliedErrorToast = (error) => {
  showErrorToast(error || 'Failed to apply coupon. Please check the code and try again.', 'coupon-error');
};

export const showCouponRemovedToast = () => {
  showInfoToast('Coupon removed from order.', 'coupon-removed');
};

export const showNetworkErrorToast = () => {
  showErrorToast('Network error. Please check your connection and try again.', 'network-error');
};

export const showValidationErrorToast = (message) => {
  showWarningToast(message || 'Please check your input and try again.', 'validation-error');
}; 