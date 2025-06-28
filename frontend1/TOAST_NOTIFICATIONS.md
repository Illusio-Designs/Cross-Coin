# Toast Notifications System

This document describes the toast notification system implemented in the Cross-Coin frontend application.

## Overview

The application uses `react-toastify` for displaying toast notifications throughout the user interface. All toast notifications are centralized through a utility file (`src/utils/toast.js`) to ensure consistency in styling and behavior.

## Setup

### Dependencies
- `react-toastify`: Already installed in the project

### Configuration
The toast container is configured in `src/pages/_app.jsx` with the following settings:
- Position: Top-right
- Auto-close: 3-4 seconds
- Progress bar: Visible
- Draggable: Yes
- Pause on hover: Yes
- Theme: Light

## Toast Types

### 1. Success Toasts
- **Duration**: 3 seconds
- **Color**: Green
- **Use cases**: Successful operations like login, registration, adding to cart, etc.

### 2. Error Toasts
- **Duration**: 4 seconds
- **Color**: Red
- **Use cases**: Failed operations, validation errors, network errors

### 3. Info Toasts
- **Duration**: 3 seconds
- **Color**: Blue
- **Use cases**: Informational messages like logout, item removal

### 4. Warning Toasts
- **Duration**: 4 seconds
- **Color**: Orange
- **Use cases**: Validation warnings, important notices

## Available Toast Functions

### Authentication
- `showLoginSuccessToast()` - Login successful
- `showLoginErrorToast(error)` - Login failed
- `showRegisterSuccessToast()` - Registration successful
- `showRegisterErrorToast(error)` - Registration failed
- `showLogoutSuccessToast()` - Logout successful

### Cart Operations
- `showAddToCartSuccessToast(productName)` - Item added to cart
- `showAddToCartErrorToast(error)` - Failed to add to cart
- `showRemoveFromCartSuccessToast(productName)` - Item removed from cart
- `showUpdateCartSuccessToast()` - Cart updated
- `showClearCartSuccessToast()` - Cart cleared

### Wishlist Operations
- `showAddToWishlistSuccessToast(productName)` - Item added to wishlist
- `showAddToWishlistErrorToast(error)` - Failed to add to wishlist
- `showRemoveFromWishlistSuccessToast(productName)` - Item removed from wishlist
- `showClearWishlistSuccessToast()` - Wishlist cleared

### Order Operations
- `showOrderPlacedSuccessToast(orderNumber)` - Order placed successfully
- `showOrderPlacedErrorToast(error)` - Order placement failed
- `showPaymentSuccessToast()` - Payment successful
- `showPaymentErrorToast(error)` - Payment failed

### Profile Operations
- `showProfileUpdateSuccessToast()` - Profile updated
- `showProfileUpdateErrorToast(error)` - Profile update failed
- `showAddressAddedSuccessToast()` - Address added
- `showAddressUpdatedSuccessToast()` - Address updated
- `showAddressDeletedSuccessToast()` - Address deleted

### Review Operations
- `showReviewSubmittedSuccessToast()` - Review submitted
- `showReviewSubmittedErrorToast(error)` - Review submission failed

### Coupon Operations
- `showCouponAppliedSuccessToast(code)` - Coupon applied
- `showCouponAppliedErrorToast(error)` - Coupon application failed
- `showCouponRemovedToast()` - Coupon removed

### General
- `showNetworkErrorToast()` - Network error
- `showValidationErrorToast(message)` - Validation error
- `showSuccessToast(message)` - Generic success
- `showErrorToast(message)` - Generic error
- `showInfoToast(message)` - Generic info
- `showWarningToast(message)` - Generic warning

## Implementation Details

### Context Integration
Toast notifications are integrated into the following contexts:
- **AuthContext**: Login, register, logout operations
- **CartContext**: Add, remove, update, clear cart operations
- **WishlistContext**: Add, remove, clear wishlist operations

### Page Integration
Toast notifications are used in the following pages:
- **Login/Register**: Authentication feedback
- **ProductDetails**: Add to cart, add to wishlist, review submission
- **Profile**: Profile updates, password reset, address management
- **UnifiedCheckout**: Order placement, validation errors
- **Wishlist**: Wishlist operations (via context)

### Error Handling
All async operations are wrapped in try-catch blocks with appropriate toast notifications:
- Success cases show success toasts
- Error cases show error toasts with specific error messages
- Validation errors show warning toasts

## Usage Example

```javascript
import { showSuccessToast, showErrorToast } from '../utils/toast';

const handleOperation = async () => {
  try {
    const result = await someApiCall();
    showSuccessToast('Operation completed successfully!');
  } catch (error) {
    showErrorToast(error.message || 'Operation failed');
  }
};
```

## Customization

To customize toast behavior, modify the configuration in `src/pages/_app.jsx`:

```javascript
<ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
  theme="light"
/>
```

To add new toast functions, add them to `src/utils/toast.js` following the existing pattern.

## Best Practices

1. **Consistent Messaging**: Use the predefined toast functions for consistency
2. **Error Handling**: Always provide meaningful error messages
3. **User Feedback**: Show toasts for all user actions that have outcomes
4. **Performance**: Don't show too many toasts simultaneously
5. **Accessibility**: Toast messages should be clear and actionable 