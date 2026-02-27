# Requirements Document

## Introduction

This document specifies the requirements for integrating Razorpay Magic Checkout into the Cross Coin e-commerce platform. Magic Checkout enables customers to save addresses and payment details securely across the Razorpay network, reduces COD Return-to-Origin (RTO) through address quality analysis, and provides a seamless checkout experience. The integration must maintain backward compatibility with existing order flows while adding new capabilities for address validation, COD serviceability checks, and promotion management.

## Glossary

- **Magic_Checkout**: Razorpay's enhanced checkout solution that enables saved addresses and payment methods across the Razorpay network
- **RTO**: Return-to-Origin, when a COD order is returned undelivered
- **COD**: Cash on Delivery payment method
- **Prepaid**: Payment completed before order fulfillment
- **Guest_User**: Customer who checks out without creating an account
- **Authenticated_User**: Customer with a registered account
- **Promotion**: Discount or coupon applicable to an order
- **Serviceability**: Whether shipping or COD is available for a specific address
- **Address_Quality**: Score indicating likelihood of successful delivery based on historical data
- **FShip**: Third-party shipping integration service
- **Order_Context**: Data structure containing order details for Magic Checkout API calls
- **Customer_Context**: Data structure containing customer information for Magic Checkout
- **Magic_Checkout_SDK**: JavaScript library provided by Razorpay for frontend integration
- **Standard_Checkout**: Current Razorpay checkout implementation being replaced

## Requirements

### Requirement 1: Magic Checkout SDK Integration

**User Story:** As a developer, I want to integrate the Magic Checkout SDK, so that customers can access saved addresses and payment methods.

#### Acceptance Criteria

1. WHEN the checkout page loads, THE Frontend SHALL load the Magic Checkout SDK from Razorpay's CDN
2. WHEN the SDK is loaded, THE Frontend SHALL initialize Magic Checkout with the merchant key
3. WHEN initialization fails, THE Frontend SHALL fall back to standard checkout flow
4. WHEN a customer opens the checkout, THE Frontend SHALL pass order context to Magic Checkout
5. THE Frontend SHALL replace the standard Razorpay checkout.js with Magic Checkout SDK

### Requirement 2: Promotions API Endpoint

**User Story:** As a customer, I want to see applicable promotions during checkout, so that I can save money on my purchase.

#### Acceptance Criteria

1. WHEN Magic Checkout requests promotions, THE Backend SHALL return a list of applicable promotions for the order
2. THE Backend SHALL validate that promotions are active and not expired
3. THE Backend SHALL check promotion applicability based on cart items and customer eligibility
4. WHEN a customer has already used a promotion, THE Backend SHALL exclude it from the list if usage limit is reached
5. THE Backend SHALL return promotion details including code, description, discount type, and discount value
6. THE Backend SHALL calculate discount amounts for percentage-based promotions with maximum discount caps
7. WHEN no promotions are applicable, THE Backend SHALL return an empty promotions array

### Requirement 3: Apply Promotion API Endpoint

**User Story:** As a customer, I want to apply a promotion code, so that I receive the discount on my order.

#### Acceptance Criteria

1. WHEN a customer applies a promotion code, THE Backend SHALL validate the promotion code exists and is active
2. THE Backend SHALL verify the promotion has not exceeded usage limits
3. THE Backend SHALL verify the customer has not exceeded per-user usage limits
4. THE Backend SHALL calculate the discount amount based on promotion type and cart total
5. WHEN the promotion is valid, THE Backend SHALL return the discount amount and updated order total
6. WHEN the promotion is invalid, THE Backend SHALL return an error with a descriptive message
7. THE Backend SHALL ensure minimum purchase requirements are met before applying the promotion
8. THE Backend SHALL respect maximum discount caps for percentage-based promotions

### Requirement 4: Shipping Info API Endpoint

**User Story:** As a customer, I want to know if delivery is available to my address, so that I can complete my purchase.

#### Acceptance Criteria

1. WHEN Magic Checkout requests shipping info, THE Backend SHALL return shipping serviceability for each customer address
2. THE Backend SHALL return COD serviceability status for each address
3. THE Backend SHALL calculate and return shipping fees based on address and payment method
4. THE Backend SHALL calculate and return COD fees if COD is serviceable
5. THE Backend SHALL validate address completeness before checking serviceability
6. WHEN an address is incomplete, THE Backend SHALL return serviceability as false
7. THE Backend SHALL integrate with FShip to determine actual shipping serviceability
8. THE Backend SHALL return estimated delivery time for serviceable addresses

### Requirement 5: Address Quality Validation

**User Story:** As a merchant, I want to validate address quality, so that I can reduce RTO rates for COD orders.

#### Acceptance Criteria

1. WHEN a customer provides an address, THE Backend SHALL validate address format and completeness
2. THE Backend SHALL check address against historical delivery data if available
3. THE Backend SHALL assign an address quality score based on validation results
4. WHEN address quality is low, THE Backend SHALL recommend prepaid payment over COD
5. THE Backend SHALL validate pincode format and existence
6. THE Backend SHALL validate phone number format and length
7. WHEN address validation fails, THE Backend SHALL return specific validation errors

### Requirement 6: COD Serviceability Check

**User Story:** As a customer, I want to know if COD is available for my address, so that I can choose my preferred payment method.

#### Acceptance Criteria

1. WHEN a customer selects an address, THE Backend SHALL check if COD is serviceable for that pincode
2. THE Backend SHALL consider address quality score when determining COD serviceability
3. WHEN address quality is below threshold, THE Backend SHALL disable COD option
4. THE Backend SHALL integrate with FShip COD serviceability data
5. THE Backend SHALL return COD fees if COD is serviceable
6. WHEN COD is not serviceable, THE Backend SHALL provide a clear reason to the customer
7. THE Backend SHALL cache COD serviceability data to improve performance

### Requirement 7: Order Creation with Magic Checkout

**User Story:** As a customer, I want to complete my purchase using Magic Checkout, so that I can use my saved payment methods.

#### Acceptance Criteria

1. WHEN a customer completes payment via Magic Checkout, THE Backend SHALL create an order with payment details
2. THE Backend SHALL validate the Magic Checkout payment signature
3. THE Backend SHALL store Magic Checkout transaction identifiers with the order
4. THE Backend SHALL support both authenticated and guest user orders
5. THE Backend SHALL apply validated promotions to the order
6. THE Backend SHALL calculate final order amount including shipping fees and discounts
7. WHEN order creation succeeds, THE Backend SHALL return order details including order number
8. WHEN order creation fails, THE Backend SHALL return a descriptive error message

### Requirement 8: Payment Verification for Magic Checkout

**User Story:** As a merchant, I want to verify Magic Checkout payments, so that I can prevent fraud and ensure payment authenticity.

#### Acceptance Criteria

1. WHEN a Magic Checkout payment is received, THE Backend SHALL verify the payment signature using Razorpay secret key
2. THE Backend SHALL validate that the payment amount matches the order amount
3. THE Backend SHALL validate that the order ID matches the expected order
4. WHEN signature verification fails, THE Backend SHALL reject the payment and mark order as failed
5. THE Backend SHALL store payment verification status with the order
6. THE Backend SHALL update order payment status to "paid" only after successful verification
7. WHEN verification succeeds, THE Backend SHALL trigger order fulfillment workflow

### Requirement 9: Saved Payment Methods Support

**User Story:** As a customer, I want to use my saved payment methods, so that I can checkout faster.

#### Acceptance Criteria

1. WHEN Magic Checkout loads, THE Frontend SHALL display saved payment methods from Razorpay network
2. THE Frontend SHALL allow customers to select a saved payment method
3. THE Frontend SHALL allow customers to add new payment methods
4. WHEN a customer selects a saved payment method, THE Frontend SHALL pass the payment method token to Magic Checkout
5. THE Frontend SHALL handle payment method selection errors gracefully
6. THE Frontend SHALL display payment method details securely without exposing sensitive information

### Requirement 10: Saved Addresses Support

**User Story:** As a customer, I want to use my saved addresses, so that I don't have to re-enter my address for every order.

#### Acceptance Criteria

1. WHEN Magic Checkout loads, THE Frontend SHALL display saved addresses from Razorpay network
2. THE Frontend SHALL merge saved addresses with platform-specific addresses
3. THE Frontend SHALL allow customers to select a saved address
4. THE Frontend SHALL allow customers to add new addresses
5. WHEN a customer selects a saved address, THE Frontend SHALL validate address completeness
6. THE Frontend SHALL display address quality indicators for each address
7. THE Frontend SHALL show COD availability status for each address

### Requirement 11: Guest Checkout with Magic Checkout

**User Story:** As a guest customer, I want to checkout without creating an account, so that I can complete my purchase quickly.

#### Acceptance Criteria

1. WHEN a guest customer accesses checkout, THE Frontend SHALL allow checkout without authentication
2. THE Frontend SHALL collect guest email, name, and phone number
3. THE Frontend SHALL pass guest information to Magic Checkout
4. THE Backend SHALL create a guest user record for the order
5. THE Backend SHALL associate the order with the guest user
6. THE Backend SHALL send order confirmation to guest email
7. THE Backend SHALL allow guest order tracking using order number and email

### Requirement 12: Backward Compatibility with Existing Orders

**User Story:** As a developer, I want to maintain backward compatibility, so that existing orders and workflows continue to function.

#### Acceptance Criteria

1. THE Backend SHALL continue to support existing order creation endpoints
2. THE Backend SHALL maintain existing database schema for orders
3. THE Backend SHALL support both Magic Checkout and standard checkout orders
4. THE Backend SHALL maintain existing FShip integration for order fulfillment
5. THE Backend SHALL preserve existing coupon validation logic
6. THE Backend SHALL maintain existing payment verification for standard checkout
7. THE Backend SHALL support querying both Magic Checkout and standard checkout orders

### Requirement 13: Error Handling and Fallback

**User Story:** As a customer, I want checkout to work even if Magic Checkout fails, so that I can complete my purchase.

#### Acceptance Criteria

1. WHEN Magic Checkout SDK fails to load, THE Frontend SHALL fall back to standard checkout
2. WHEN Magic Checkout API calls fail, THE Frontend SHALL display appropriate error messages
3. WHEN Magic Checkout initialization fails, THE Frontend SHALL log the error and use standard checkout
4. THE Backend SHALL handle missing or invalid Magic Checkout parameters gracefully
5. THE Backend SHALL return meaningful error messages for API failures
6. THE Frontend SHALL provide a manual address entry option if saved addresses fail to load
7. THE Frontend SHALL allow manual payment entry if saved payment methods fail to load

### Requirement 14: Analytics and Tracking

**User Story:** As a merchant, I want to track Magic Checkout usage, so that I can measure adoption and performance.

#### Acceptance Criteria

1. THE Frontend SHALL track Magic Checkout initialization events
2. THE Frontend SHALL track saved address usage vs manual entry
3. THE Frontend SHALL track saved payment method usage vs manual entry
4. THE Frontend SHALL track Magic Checkout completion rate
5. THE Backend SHALL log Magic Checkout API call success and failure rates
6. THE Backend SHALL track RTO rate comparison between Magic Checkout and standard checkout orders
7. THE Backend SHALL maintain existing Facebook Pixel integration for purchase events

### Requirement 15: Magic Checkout Configuration

**User Story:** As a developer, I want to configure Magic Checkout settings, so that I can customize the integration for our platform.

#### Acceptance Criteria

1. THE Backend SHALL store Razorpay Magic Checkout API credentials securely
2. THE Backend SHALL allow configuration of COD serviceability thresholds
3. THE Backend SHALL allow configuration of address quality score thresholds
4. THE Backend SHALL allow enabling/disabling Magic Checkout feature flag
5. THE Frontend SHALL read Magic Checkout configuration from environment variables
6. THE Backend SHALL validate Magic Checkout configuration on startup
7. THE Backend SHALL provide configuration validation endpoint for testing

### Requirement 16: Promotion Validation Round Trip

**User Story:** As a developer, I want to ensure promotion data integrity, so that discounts are applied correctly.

#### Acceptance Criteria

1. FOR ALL valid promotions, THE Backend SHALL ensure that fetching promotion details then applying the promotion produces consistent discount amounts
2. FOR ALL promotion codes, THE Backend SHALL ensure that validating a code then applying it maintains the same validation rules
3. FOR ALL cart states, THE Backend SHALL ensure that calculating discount then recalculating produces the same result
4. THE Backend SHALL ensure promotion applicability checks are idempotent

### Requirement 17: Address Data Serialization

**User Story:** As a developer, I want to ensure address data is correctly serialized, so that Magic Checkout receives valid address information.

#### Acceptance Criteria

1. WHEN serializing address data for Magic Checkout, THE Backend SHALL encode addresses using JSON format
2. FOR ALL valid addresses, THE Backend SHALL ensure that serializing then deserializing produces equivalent address objects
3. THE Backend SHALL validate address JSON structure before sending to Magic Checkout
4. THE Backend SHALL handle special characters in addresses correctly during serialization

### Requirement 18: Shipping Fee Calculation Consistency

**User Story:** As a customer, I want consistent shipping fees, so that I know the exact cost before payment.

#### Acceptance Criteria

1. FOR ALL address and payment method combinations, THE Backend SHALL calculate shipping fees consistently
2. THE Backend SHALL ensure shipping fee calculation matches between promotion API and order creation
3. THE Backend SHALL cache shipping fee calculations to prevent inconsistencies
4. FOR ALL orders, THE Backend SHALL validate that displayed shipping fee matches charged shipping fee
