/* ──────────────────────────────────────────────────────────────────
   Gripzus — toast notifications
   Dependency-free, mirrors the coverage of Crosscoin / Knitwink.
   Call any helper from anywhere; the <ToastViewport /> mounted in
   _app subscribes and renders them.
   ────────────────────────────────────────────────────────────────── */

let toasts = [];
let listeners = [];
let counter = 0;

const DURATION = 2800;

function emit() {
  for (const listener of listeners) listener(toasts);
}

/* The viewport component subscribes here; returns an unsubscribe fn. */
export function subscribeToasts(listener) {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function show(type, message, key) {
  if (!message) return;
  // De-dupe by key — a repeated action replaces its toast instead of stacking.
  if (key) toasts = toasts.filter((t) => t.key !== key);
  const id = ++counter;
  toasts = [...toasts, { id, key: key || `toast-${id}`, type, message }];
  emit();
  if (typeof window !== 'undefined') {
    setTimeout(() => dismissToast(id), DURATION);
  }
}

/* ── Generic ─────────────────────────────────────────────────────── */
export const showSuccess = (msg, key) => show('success', msg, key);
export const showError   = (msg, key) => show('error',   msg, key);
export const showInfo    = (msg, key) => show('info',    msg, key);
export const showWarning = (msg, key) => show('warning', msg, key);

/* ── Auth ────────────────────────────────────────────────────────── */
export const toastLoginSuccess    = ()  => showSuccess('Welcome back — you are now signed in.', 'login');
export const toastLoginError      = (e) => showError(e || 'Sign in failed. Please check your details.', 'login-err');
export const toastRegisterSuccess = ()  => showSuccess('Account created — welcome to Gripzus!', 'register');
export const toastRegisterError   = (e) => showError(e || 'Registration failed. Please try again.', 'register-err');
export const toastLogoutSuccess   = ()  => showInfo('You have been signed out.', 'logout');

/* ── Cart ────────────────────────────────────────────────────────── */
export const toastAddedToCart     = (name) => showSuccess(`${name || 'Item'} added to cart.`, 'cart-add');
export const toastRemovedFromCart = (name) => showInfo(`${name || 'Item'} removed from cart.`, 'cart-remove');
export const toastCartUpdated     = ()     => showInfo('Cart updated.', 'cart-update');
export const toastCartCleared     = ()     => showInfo('Cart cleared.', 'cart-clear');

/* ── Wishlist ────────────────────────────────────────────────────── */
export const toastAddedToWishlist     = (name) => showSuccess(`${name || 'Item'} added to wishlist.`, 'wish-add');
export const toastRemovedFromWishlist = (name) => showInfo(`${name || 'Item'} removed from wishlist.`, 'wish-remove');
export const toastWishlistCleared     = ()     => showInfo('Wishlist cleared.', 'wish-clear');

/* ── Account / profile ───────────────────────────────────────────── */
export const toastProfileUpdated  = ()  => showSuccess('Profile updated successfully.', 'profile');
export const toastProfileError    = (e) => showError(e || 'Failed to update profile.', 'profile-err');
export const toastPasswordUpdated = ()  => showSuccess('Password updated successfully.', 'password');
export const toastPasswordError   = (e) => showError(e || 'Failed to update password.', 'password-err');

/* ── Addresses ───────────────────────────────────────────────────── */
export const toastAddressAdded   = () => showSuccess('Address added successfully.', 'addr-add');
export const toastAddressUpdated = () => showSuccess('Address updated successfully.', 'addr-update');
export const toastAddressDeleted = () => showInfo('Address deleted.', 'addr-delete');

/* ── Orders / payment ────────────────────────────────────────────── */
export const toastOrderPlaced    = (num) => showSuccess(num ? `Order #${num} placed successfully!` : 'Order placed successfully!', 'order');
export const toastOrderError     = (e)   => showError(e || 'Failed to place order. Please try again.', 'order-err');
export const toastOrderCancelled = ()    => showInfo('Order cancelled.', 'order-cancel');
export const toastPaymentSuccess = ()    => showSuccess('Payment processed successfully.', 'payment');
export const toastPaymentError   = (e)   => showError(e || 'Payment failed. Please try again.', 'payment-err');

/* ── Reviews / coupons ───────────────────────────────────────────── */
export const toastReviewSubmitted = ()     => showSuccess('Review submitted — pending approval.', 'review');
export const toastReviewError     = (e)    => showError(e || 'Failed to submit review.', 'review-err');
export const toastCouponApplied   = (code) => showSuccess(code ? `Coupon "${code}" applied!` : 'Coupon applied!', 'coupon');
export const toastCouponError     = (e)    => showError(e || 'Invalid coupon code.', 'coupon-err');
export const toastCouponRemoved   = ()     => showInfo('Coupon removed.', 'coupon-remove');

/* ── Misc ────────────────────────────────────────────────────────── */
export const toastSubscribed      = ()    => showSuccess('Subscribed — check your inbox!', 'subscribe');
export const toastMessageSent     = ()    => showSuccess("Message sent — we'll be in touch soon.", 'contact');
export const toastCopied          = ()    => showInfo('Copied to clipboard.', 'copy');
export const toastNetworkError    = ()    => showError('Network error. Please check your connection.', 'network');
export const toastValidationError = (msg) => showWarning(msg || 'Please check your input and try again.', 'validation');
