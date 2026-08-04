'use strict';

/**
 * Centralized application error class.
 * Throw this from controllers/services — caught by errorMiddleware.
 *
 * Usage:
 *   throw new AppError('Cannot cancel shipped order', 400, 'ORDER_INVALID_STATE');
 *   throw AppError.badRequest('Email is required');
 *   throw AppError.notFound('Order not found');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // distinguishes from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory methods ───────────────────────────────────────────────────────

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  static tooMany(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }

  // ── Domain-specific errors ────────────────────────────────────────────────

  static orderInvalidState(currentStatus, targetStatus) {
    return new AppError(
      `Cannot transition order from "${currentStatus}" to "${targetStatus}"`,
      400, 'ORDER_INVALID_STATE', { currentStatus, targetStatus }
    );
  }

  static orderNotCancellable(status) {
    return new AppError(
      `Cannot cancel order in "${status}" status`,
      400, 'ORDER_NOT_CANCELLABLE', { status }
    );
  }

  static codBlocked(reason) {
    return new AppError(reason, 400, 'COD_BLOCKED');
  }

  static outOfStock(productId) {
    return new AppError(
      `Product ${productId} is out of stock`,
      400, 'OUT_OF_STOCK', { productId }
    );
  }

  static duplicateOrder(idempotencyKey) {
    return new AppError(
      'Order already created with this idempotency key',
      200, 'DUPLICATE_ORDER', { idempotencyKey }
    );
  }

  static paymentFailed(reason) {
    return new AppError(reason, 402, 'PAYMENT_FAILED');
  }
}

module.exports = AppError;
