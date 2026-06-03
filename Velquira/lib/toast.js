import { toast } from 'react-toastify'

const config = {
  position: 'top-right',
  autoClose: 2500,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: false,
  theme: 'light',
}

const show = (type, message, id) => {
  const toastId = id || message
  toast.dismiss(toastId)
  toast[type](message, { ...config, toastId })
}

export const showSuccess = (msg, id) => show('success', msg, id)
export const showError   = (msg, id) => show('error',   msg, id)
export const showInfo    = (msg, id) => show('info',    msg, id)
export const showWarning = (msg, id) => show('warning', msg, id)

// Specific actions
export const toastLoginSuccess    = () => showSuccess('Welcome back! You are now logged in.', 'login')
export const toastLoginError      = (e) => showError(e || 'Login failed. Please try again.', 'login-err')
export const toastRegisterSuccess = () => showSuccess('Account created! Welcome to Velquira.', 'register')
export const toastRegisterError   = (e) => showError(e || 'Registration failed.', 'register-err')
export const toastLogoutSuccess   = () => showInfo('You have been signed out.', 'logout')
export const toastAddedToCart     = (name) => showSuccess(`${name} added to bag!`, 'cart-add')
export const toastRemovedFromCart = (name) => showInfo(`${name} removed from bag.`, 'cart-remove')
export const toastAddedToWishlist     = (name) => showSuccess(`${name || 'Item'} added to wishlist.`, 'wish-add')
export const toastRemovedFromWishlist = (name) => showInfo(`${name || 'Item'} removed from wishlist.`, 'wish-remove')
export const toastProfileUpdated  = () => showSuccess('Profile updated successfully!', 'profile')
export const toastProfileError    = (e) => showError(e || 'Failed to update profile.', 'profile-err')
export const toastPasswordUpdated = () => showSuccess('Password updated successfully!', 'password')
export const toastPasswordError   = (e) => showError(e || 'Failed to update password.', 'password-err')
export const toastAddressAdded    = () => showSuccess('Address added successfully!', 'addr-add')
export const toastAddressUpdated  = () => showSuccess('Address updated successfully!', 'addr-update')
export const toastAddressDeleted  = () => showInfo('Address deleted.', 'addr-delete')
export const toastOrderPlaced     = (num) => showSuccess(`Order #${num} placed successfully!`, 'order')
export const toastOrderError      = (e) => showError(e || 'Failed to place order.', 'order-err')
export const toastOrderCancelled  = () => showInfo('Order cancelled.', 'order-cancel')
export const toastReviewSubmitted = () => showSuccess('Review submitted! Pending approval.', 'review')
export const toastReviewError     = (e) => showError(e || 'Failed to submit review.', 'review-err')
export const toastCouponApplied   = (code) => showSuccess(`Coupon "${code}" applied!`, 'coupon')
export const toastCouponError     = (e) => showError(e || 'Invalid coupon code.', 'coupon-err')
export const toastNetworkError    = () => showError('Network error. Check your connection.', 'network')
export const toastCopied          = () => showInfo('Copied to clipboard!', 'copy')
