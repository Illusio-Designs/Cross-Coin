import { toast } from 'react-toastify';

// Success toasts
export const showSuccessToast = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Error toasts
export const showErrorToast = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Info toasts
export const showInfoToast = (message) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Warning toasts
export const showWarningToast = (message) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

// Specific action toasts
export const showLoginSuccessToast = () => {
  showSuccessToast('Successfully logged in! Welcome back!');
};

export const showLoginErrorToast = (error) => {
  showErrorToast(error || 'Login failed. Please check your credentials.');
};

export const showRegisterSuccessToast = () => {
  showSuccessToast('Registration successful! Please log in to continue.');
};

export const showRegisterErrorToast = (error) => {
  showErrorToast(error || 'Registration failed. Please try again.');
};

export const showLogoutSuccessToast = () => {
  showInfoToast('Successfully logged out. See you soon!');
};

export const showAddToCartSuccessToast = (productName) => {
  showSuccessToast(`${productName} added to cart successfully!`);
};

export const showAddToCartErrorToast = (error) => {
  showErrorToast(error || 'Failed to add item to cart. Please try again.');
};

export const showRemoveFromCartSuccessToast = (productName) => {
  showInfoToast(`${productName} removed from cart.`);
};

export const showRemoveFromCartErrorToast = (error) => {
  showErrorToast(error || 'Failed to remove item from cart. Please try again.');
};

export const showUpdateCartSuccessToast = () => {
  showSuccessToast('Cart updated successfully!');
};

export const showClearCartSuccessToast = () => {
  showInfoToast('Cart cleared successfully!');
};

export const showAddToWishlistSuccessToast = (productName) => {
  showSuccessToast(`${productName} added to wishlist!`);
};

export const showAddToWishlistErrorToast = (error) => {
  showErrorToast(error || 'Failed to add item to wishlist. Please try again.');
};

export const showRemoveFromWishlistSuccessToast = (productName) => {
  showInfoToast(`${productName} removed from wishlist.`);
};

export const showClearWishlistSuccessToast = () => {
  showInfoToast('Wishlist cleared successfully!');
};

export const showOrderPlacedSuccessToast = (orderNumber) => {
  showSuccessToast(`Order #${orderNumber} placed successfully! Thank you for your purchase.`);
};

export const showOrderPlacedErrorToast = (error) => {
  showErrorToast(error || 'Failed to place order. Please try again.');
};

export const showPaymentSuccessToast = () => {
  showSuccessToast('Payment processed successfully!');
};

export const showPaymentErrorToast = (error) => {
  showErrorToast(error || 'Payment failed. Please try again.');
};

export const showProfileUpdateSuccessToast = () => {
  showSuccessToast('Profile updated successfully!');
};

export const showProfileUpdateErrorToast = (error) => {
  showErrorToast(error || 'Failed to update profile. Please try again.');
};

export const showAddressAddedSuccessToast = () => {
  showSuccessToast('Shipping address added successfully!');
};

export const showAddressUpdatedSuccessToast = () => {
  showSuccessToast('Shipping address updated successfully!');
};

export const showAddressDeletedSuccessToast = () => {
  showInfoToast('Shipping address deleted successfully!');
};

export const showReviewSubmittedSuccessToast = () => {
  showSuccessToast('Review submitted successfully! Thank you for your feedback.');
};

export const showReviewSubmittedErrorToast = (error) => {
  showErrorToast(error || 'Failed to submit review. Please try again.');
};

export const showCouponAppliedSuccessToast = (code) => {
  showSuccessToast(`Coupon "${code}" applied successfully!`);
};

export const showCouponAppliedErrorToast = (error) => {
  showErrorToast(error || 'Failed to apply coupon. Please check the code and try again.');
};

export const showCouponRemovedToast = () => {
  showInfoToast('Coupon removed from order.');
};

export const showNetworkErrorToast = () => {
  showErrorToast('Network error. Please check your connection and try again.');
};

export const showValidationErrorToast = (message) => {
  showWarningToast(message || 'Please check your input and try again.');
}; 