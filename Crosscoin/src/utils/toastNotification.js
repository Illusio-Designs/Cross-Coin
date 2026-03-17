import { toast } from 'react-toastify';
import { TOAST_TEXT } from '../constants/toastMessages';

// Toast configuration with custom styling
const toastConfig = {
  position: 'top-right',
  autoClose: 2500,  // Reduced from 3000ms to 2500ms (2.5 seconds)
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,  // Don't pause on hover - toast closes immediately
  draggable: true,
  theme: 'light',
  limit: 3,  // Limit to 3 toasts max
};

// Custom toast messages for common actions (kept for backward compatibility)
const messages = {
  success: TOAST_TEXT,
  error: TOAST_TEXT,
  info: TOAST_TEXT,
  warning: TOAST_TEXT,
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
  toastConfig,
};
