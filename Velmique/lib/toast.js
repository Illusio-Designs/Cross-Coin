/* Centralised toast helpers for Velmique. Same shape as Knitwink/Crosscoin
   so call sites stay consistent — branded copy is Velmique-specific.
   The visual theme (cream + ink + gold) is applied via the .Toastify__*
   overrides in app/globals.css (see "Velmique toast skin"). */
import { toast } from 'react-toastify';

const config = {
  position: 'top-right',
  autoClose: 2500,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: false,
  theme: 'light',
};

const show = (type, message, id) => {
  const toastId = id || message;
  toast.dismiss(toastId);
  toast[type](message, { ...config, toastId });
};

export const showSuccess = (msg, id) => show('success', msg, id);
export const showError   = (msg, id) => show('error',   msg, id);
export const showInfo    = (msg, id) => show('info',    msg, id);
export const showWarning = (msg, id) => show('warning', msg, id);

/* ── Auth ────────────────────────────────────────────────── */
export const toastLoginSuccess    = ()  => showSuccess('Logged in successfully. Welcome back to Velmique.', 'login');
export const toastLoginError      = (e) => showError(e || 'Login failed. Please try again.', 'login-err');
export const toastRegisterSuccess = ()  => showSuccess('Account created successfully. Welcome to Velmique.', 'register');
export const toastRegisterError   = (e) => showError(e || 'Registration failed.', 'register-err');
export const toastLogoutSuccess   = ()  => showSuccess('Logged out successfully.', 'logout');
export const toastOtpSent         = ()  => showSuccess('OTP sent to your phone successfully.', 'otp-sent');
export const toastOtpError        = (e) => showError(e || 'Could not verify OTP.', 'otp-err');

/* ── Cart ────────────────────────────────────────────────── */
export const toastAddedToCart     = (name) => showSuccess(`${name || 'Item'} added to your bag successfully.`, 'cart-add');
export const toastRemovedFromCart = (name) => showSuccess(`${name || 'Item'} removed from your bag successfully.`, 'cart-remove');
export const toastCartUpdated     = ()     => showSuccess('Bag updated successfully.', 'cart-update');
export const toastCartCleared     = ()     => showSuccess('Bag cleared successfully.', 'cart-clear');

/* ── Wishlist ────────────────────────────────────────────── */
export const toastAddedToWishlist     = (name) => showSuccess(`${name || 'Item'} added to your wishlist successfully.`, 'wish-add');
export const toastRemovedFromWishlist = (name) => showSuccess(`${name || 'Item'} removed from your wishlist successfully.`, 'wish-remove');

/* ── Profile ─────────────────────────────────────────────── */
export const toastProfileUpdated = ()  => showSuccess('Profile updated successfully.', 'profile');
export const toastProfileError   = (e) => showError(e || 'Failed to update profile.', 'profile-err');

/* ── Addresses ───────────────────────────────────────────── */
export const toastAddressAdded   = ()  => showSuccess('Address added successfully.', 'addr-add');
export const toastAddressUpdated = ()  => showSuccess('Address updated successfully.', 'addr-update');
export const toastAddressDeleted = ()  => showSuccess('Address deleted successfully.', 'addr-delete');
export const toastAddressDefault = ()  => showSuccess('Default address updated successfully.', 'addr-default');
export const toastAddressError   = (e) => showError(e || 'Could not save address.', 'addr-err');

/* ── Orders ──────────────────────────────────────────────── */
export const toastOrderPlaced    = (num) => showSuccess(`Order ${num ? `#${num} ` : ''}placed successfully.`, 'order');
export const toastOrderError     = (e)   => showError(e || 'Failed to place order.', 'order-err');
export const toastOrderCancelled = ()    => showSuccess('Order cancelled successfully.', 'order-cancel');

/* ── Payments ────────────────────────────────────────────── */
export const toastPaymentSuccess = () => showSuccess('Payment received successfully. Thank you.', 'pay-ok');
export const toastPaymentError   = (e) => showError(e || 'Payment failed.', 'pay-err');

/* ── Reviews / Coupons / Misc ────────────────────────────── */
export const toastReviewSubmitted = ()  => showSuccess('Review submitted successfully. Thank you.', 'review');
export const toastReviewError     = (e) => showError(e || 'Failed to submit review.', 'review-err');
export const toastCouponApplied   = (code) => showSuccess(`Coupon ${code ? `“${code}” ` : ''}applied successfully.`, 'coupon');
export const toastCouponError     = (e)    => showError(e || 'Invalid coupon code.', 'coupon-err');
export const toastNetworkError    = ()  => showError('Network error. Check your connection.', 'network');
export const toastCopied          = ()  => showSuccess('Copied to clipboard successfully.', 'copy');
