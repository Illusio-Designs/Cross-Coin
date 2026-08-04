'use strict';

const AppError = require('../utils/AppError.js');
const { logger } = require('../config/logging.js');

/**
 * Global error handling middleware.
 * Mount LAST in Express middleware chain.
 *
 * Catches:
 * - AppError (operational) → structured JSON response
 * - Sequelize errors → mapped to AppError
 * - Unknown errors → 500 with safe message in production
 */
function errorMiddleware(err, req, res, next) {
  // Already sent headers — delegate to Express default
  if (res.headersSent) return next(err);

  const isProd = process.env.NODE_ENV === 'production';

  // ── Map known error types to AppError ───────────────────────────────────

  if (err.name === 'SequelizeValidationError') {
    err = AppError.badRequest(
      err.errors?.[0]?.message || 'Validation error',
      'VALIDATION_ERROR',
      err.errors?.map(e => ({ field: e.path, message: e.message }))
    );
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    err = AppError.conflict(`${field} already exists`, 'DUPLICATE_ENTRY');
  }

  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    err = new AppError('Database connection error', 503, 'DB_UNAVAILABLE');
  }

  if (err.name === 'JsonWebTokenError') {
    err = AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    err = AppError.unauthorized('Token expired', 'TOKEN_EXPIRED');
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    err = AppError.badRequest('File too large', 'FILE_TOO_LARGE');
  }

  // CORS rejections are a disallowed-origin client issue (403), not a server
  // fault — map so they log at warn and don't flood Sentry with false 500s.
  if (err.message === 'Not allowed by CORS') {
    err = new AppError('Origin not allowed', 403, 'CORS_BLOCKED');
  }

  // ── Build response ──────────────────────────────────────────────────────

  const statusCode = err.statusCode || 500;
  const isOperational = err instanceof AppError && err.isOperational;

  // Log: operational errors at warn, programming errors at error
  if (isOperational) {
    logger.warn(`[${statusCode}] ${err.code}: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id || null,
    });
  } else {
    logger.error(`[${statusCode}] Unhandled error:`, {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isOperational || !isProd ? err.message : 'Something went wrong',
    },
  };

  // Include details in non-production or for operational errors
  if (err.details && (isOperational || !isProd)) {
    response.error.details = err.details;
  }

  // Include stack in development only
  if (!isProd && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorMiddleware;
