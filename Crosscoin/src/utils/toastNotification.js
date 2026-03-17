import { toast } from 'react-toastify';

// Toast configuration with custom styling
const toastConfig = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: true,
  theme: 'light',
};

// Custom toast messages for common actions
const messages = {
  // Success messages
  success: {
    addedToCart: '✓ Added to bag!',
    addedToWishlist: '♥ Added to wishlist',
    removedFromWishlist: '✓ Removed from wishlist',
    removedFromCart: '✓ Removed from bag',
    wishlistCleared: '✓ Wishlist cleared',
    allAddedToCart: '✓ All items added to bag!',
    copiedToClipboard: '✓ Copied to clipboard',
    wishlistShared: '✓ Wishlist link copied!',
    orderPlaced: '✓ Order placed successfully',
    paymentSuccessful: '✓ Payment successful',
    profileUpdated: '✓ Profile updated successfully',
    passwordChanged: '✓ Password changed successfully',
    emailVerified: '✓ Email verified successfully',
    productAdded: '✓ Product added successfully',
    productUpdated: '✓ Product updated successfully',
    productDeleted: '✓ Product deleted successfully',
    brandCreated: '✓ Brand created successfully',
    brandUpdated: '✓ Brand updated successfully',
    brandDeleted: '✓ Brand deleted successfully',
    categoryCreated: '✓ Category created successfully',
    categoryUpdated: '✓ Category updated successfully',
    categoryDeleted: '✓ Category deleted successfully',
    settingUpdated: '✓ Setting updated successfully',
    settingAdded: '✓ Setting added successfully',
    settingDeleted: '✓ Setting deleted successfully',
    sliderCreated: '✓ Slider created successfully',
    sliderUpdated: '✓ Slider updated successfully',
    sliderDeleted: '✓ Slider deleted successfully',
    orderSynced: '✓ Order synced successfully',
    orderCancelled: '✓ Order cancelled successfully',
    awbUpdated: '✓ AWB number updated successfully',
    paymentRefunded: '✓ Payment refunded successfully',
    exported: '✓ Data exported successfully',
    brandStatusUpdated: '✓ Brand status updated',
  },

  // Error messages
  error: {
    addToCartFailed: '✗ Failed to add to bag. Please try again.',
    addToWishlistFailed: '✗ Failed to add to wishlist. Please try again.',
    removeFromWishlistFailed: '✗ Failed to remove from wishlist.',
    removeFromCartFailed: '✗ Failed to remove from bag.',
    clearWishlistFailed: '✗ Failed to clear wishlist.',
    noItemsToAdd: '✗ No items to add to bag',
    loginRequired: '✗ Please log in to continue',
    invalidEmail: '✗ Please enter a valid email',
    passwordMismatch: '✗ Passwords do not match',
    passwordTooShort: '✗ Password must be at least 8 characters',
    fieldRequired: '✗ This field is required',
    loadingFailed: '✗ Failed to load data. Please try again.',
    saveFailed: '✗ Failed to save. Please try again.',
    deleteFailed: '✗ Failed to delete. Please try again.',
    updateFailed: '✗ Failed to update. Please try again.',
    networkError: '✗ Network error. Please check your connection.',
    serverError: '✗ Server error. Please try again later.',
    unauthorized: '✗ You are not authorized to perform this action.',
    notFound: '✗ The requested item was not found.',
    paymentFailed: '✗ Payment failed. Please try again.',
    orderFailed: '✗ Failed to place order. Please try again.',
    syncFailed: '✗ Failed to sync order. Please try again.',
    exportFailed: '✗ Failed to export data. Please try again.',
    invalidInput: '✗ Please check your input and try again.',
    dateError: '✗ Start date must be before end date',
    selectDates: '✗ Please select both start and end dates',
    syncInProgress: '⏳ Sync already in progress. Please wait...',
  },

  // Info messages
  info: {
    loading: '⏳ Loading...',
    processing: '⏳ Processing...',
    saving: '⏳ Saving...',
    deleting: '⏳ Deleting...',
    syncing: '⏳ Syncing...',
    checkingEmail: '⏳ Checking email...',
    verifying: '⏳ Verifying...',
  },

  // Warning messages
  warning: {
    confirmDelete: '⚠ Are you sure? This action cannot be undone.',
    confirmClear: '⚠ Clear your entire wishlist?',
    unsavedChanges: '⚠ You have unsaved changes',
    sessionExpired: '⚠ Your session has expired. Please log in again.',
    lowStock: '⚠ Low stock available',
  },
};

/**
 * Show success toast
 * @param {string} key - Message key from messages.success
 * @param {string} customMessage - Optional custom message to override
 */
export const showSuccess = (key, customMessage) => {
  const message = customMessage || messages.success[key] || 'Success!';
  toast.success(message, toastConfig);
};

/**
 * Show error toast
 * @param {string} key - Message key from messages.error
 * @param {string} customMessage - Optional custom message to override
 */
export const showError = (key, customMessage) => {
  const message = customMessage || messages.error[key] || 'Something went wrong. Please try again.';
  toast.error(message, toastConfig);
};

/**
 * Show info toast
 * @param {string} key - Message key from messages.info
 * @param {string} customMessage - Optional custom message to override
 */
export const showInfo = (key, customMessage) => {
  const message = customMessage || messages.info[key] || 'Info';
  toast.info(message, toastConfig);
};

/**
 * Show warning toast
 * @param {string} key - Message key from messages.warning
 * @param {string} customMessage - Optional custom message to override
 */
export const showWarning = (key, customMessage) => {
  const message = customMessage || messages.warning[key] || 'Warning';
  toast.warning(message, toastConfig);
};

/**
 * Show loading toast (doesn't auto-close)
 * @param {string} key - Message key from messages.info
 * @returns {string} Toast ID for later dismissal
 */
export const showLoading = (key) => {
  const message = messages.info[key] || 'Loading...';
  return toast.loading(message, {
    ...toastConfig,
    autoClose: false,
  });
};

/**
 * Update a toast
 * @param {string} toastId - Toast ID from showLoading
 * @param {object} options - Update options
 */
export const updateToast = (toastId, options) => {
  toast.update(toastId, options);
};

/**
 * Dismiss a specific toast
 * @param {string} toastId - Toast ID
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

export default {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showLoading,
  updateToast,
  dismissToast,
  dismissAllToasts,
  messages,
};
