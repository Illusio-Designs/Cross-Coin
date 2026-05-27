import { useCallback, useRef } from 'react';
import { retryHandler } from './retryHandler';

// Hook for handling API errors with recovery strategies
export const useErrorRecovery = () => {
  const recoveryStrategies = useRef({});

  // Check if we can recover from an error
  const canRecover = useCallback((error, errorType) => {
    if (!error) return false;

    // Timeout errors - can retry
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return true;
    }

    // Network errors - can retry
    if (error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
      return true;
    }

    // 429 (Too Many Requests) - implement backoff
    if (error.response?.status === 429) {
      return true;
    }

    // 503 (Service Unavailable) - can retry
    if (error.response?.status === 503) {
      return true;
    }

    // 502 (Bad Gateway) - temporary, can retry
    if (error.response?.status === 502) {
      return true;
    }

    // 408 (Request Timeout) - can retry
    if (error.response?.status === 408) {
      return true;
    }

    return false;
  }, []);

  // Get recovery action for error
  const getRecoveryAction = useCallback((error, errorType) => {
    // Rate limit error - use retry with exponential backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      return {
        type: 'wait_and_retry',
        waitMs: retryAfter ? parseInt(retryAfter) * 1000 : 2000,
        message: 'Too many requests. Please wait a moment and try again.',
      };
    }

    // Timeout - retry with backoff
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        type: 'retry_with_backoff',
        maxRetries: 3,
        initialDelayMs: 1000,
        message: 'Request timed out. Retrying...',
      };
    }

    // Network errors - retry
    if (error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
      return {
        type: 'retry_with_backoff',
        maxRetries: 3,
        initialDelayMs: 500,
        message: 'Network error. Retrying...',
      };
    }

    // Server error - retry
    if (error.response?.status >= 500) {
      return {
        type: 'retry_with_backoff',
        maxRetries: 2,
        initialDelayMs: 1500,
        message: 'Server error. Retrying...',
      };
    }

    // Validation error - don't retry, user action needed
    if (error.response?.status === 400) {
      return {
        type: 'user_action',
        message: error.response?.data?.message || 'Please check your input and try again.',
      };
    }

    // Authentication error - redirect to login
    if (error.response?.status === 401) {
      return {
        type: 'redirect',
        target: '/auth/adminlogin',
        message: 'Your session has expired. Please log in again.',
      };
    }

    // Generic fallback
    return {
      type: 'generic_error',
      message: error.message || 'An error occurred. Please try again.',
    };
  }, []);

  // Execute recovery strategy
  const executeRecovery = useCallback(async (recoveryAction, retryFn) => {
    switch (recoveryAction.type) {
      case 'wait_and_retry': {
        await new Promise(resolve => setTimeout(resolve, recoveryAction.waitMs));
        return retryFn();
      }

      case 'retry_with_backoff': {
        return retryHandler.executeWithRetry(retryFn, {
          maxRetries: recoveryAction.maxRetries || 2,
        });
      }

      case 'redirect': {
        if (typeof window !== 'undefined') {
          window.location.href = recoveryAction.target;
        }
        return null;
      }

      case 'user_action':
      case 'generic_error':
      default: {
        throw new Error(recoveryAction.message);
      }
    }
  }, []);

  // Main error handler with automatic recovery
  const handleErrorWithRecovery = useCallback(async (error, retryFn, options = {}) => {
    const { errorType = 'generic', autoRetry = true, onRecoveryAttempt = null } = options;

    if (!autoRetry || !canRecover(error, errorType)) {
      // Can't recover, return error for manual handling
      return {
        recovered: false,
        error,
        recoveryAction: getRecoveryAction(error, errorType),
      };
    }

    try {
      const recoveryAction = getRecoveryAction(error, errorType);

      if (onRecoveryAttempt) {
        onRecoveryAttempt(recoveryAction);
      }

      const result = await executeRecovery(recoveryAction, retryFn);

      return {
        recovered: true,
        result,
        recoveryAction,
      };
    } catch (recoveryError) {
      // Recovery failed
      return {
        recovered: false,
        error: recoveryError,
        recoveryAction: getRecoveryAction(recoveryError, errorType),
      };
    }
  }, [canRecover, getRecoveryAction, executeRecovery]);

  return {
    canRecover,
    getRecoveryAction,
    executeRecovery,
    handleErrorWithRecovery,
    retryHandler,
  };
};

export default useErrorRecovery;
