// Security utilities for OWASP compliance and hardening

// Sanitize HTML to prevent XSS
export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';

  const temp = document.createElement('div');
  temp.textContent = dirty;
  return temp.innerHTML;
};

// Validate and sanitize URLs
export const sanitizeURL = (url) => {
  if (!url) return '';

  try {
    // Check for javascript: protocol
    if (url.toLowerCase().startsWith('javascript:')) {
      return '';
    }

    // Check for data: protocol (can be used for XSS)
    if (url.toLowerCase().startsWith('data:')) {
      return '';
    }

    // Validate URL format
    new URL(url);
    return url;
  } catch {
    // Not a valid URL
    return '';
  }
};

// Escape special characters for safe HTML rendering
export const escapeHTML = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, char => map[char]);
};

// Validate email addresses
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone numbers (basic)
export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Rate limit login attempts
export const createLoginLimiter = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return {
    recordAttempt: (identifier) => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier) || [];

      // Remove old attempts outside window
      const recentAttempts = userAttempts.filter(ts => now - ts < windowMs);
      recentAttempts.push(now);

      attempts.set(identifier, recentAttempts);

      return recentAttempts.length;
    },

    isLimited: (identifier) => {
      const userAttempts = attempts.get(identifier) || [];
      return userAttempts.length >= maxAttempts;
    },

    reset: (identifier) => {
      attempts.delete(identifier);
    },

    getRemainingTime: (identifier) => {
      const userAttempts = attempts.get(identifier) || [];
      if (userAttempts.length === 0) return 0;

      const oldestAttempt = userAttempts[0];
      const remainingTime = Math.max(0, windowMs - (Date.now() - oldestAttempt));
      return remainingTime;
    },
  };
};

// CSRF token management
export const createCSRFProtection = () => {
  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const token = generateToken();

  return {
    token,
    getToken: () => token,
    validateToken: (provided) => provided === token,
    refreshToken: () => {
      const newToken = generateToken();
      return newToken;
    },
  };
};

// Validate file uploads
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'],
  } = options;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  // Check file type (MIME type)
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  // Check file extension
  const extension = file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension .${extension} not allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Content Security Policy helper
export const getCSPHeaders = () => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.crosscoin.in",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };
};

// Secure local storage wrapper (encryption not included - use HTTPS)
export const createSecureStorage = () => {
  return {
    setSecure: (key, value) => {
      // Warning: localStorage is NOT secure by itself
      // Use HTTPS and httpOnly cookies for sensitive data
      if (key === 'token' || key === 'password') {
        console.warn('⚠️ Never store sensitive data in localStorage. Use httpOnly cookies instead.');
      }

      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    },

    getSecure: (key) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error('Failed to retrieve from localStorage:', e);
        return null;
      }
    },

    removeSecure: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Failed to remove from localStorage:', e);
      }
    },

    clearAll: () => {
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
    },
  };
};

// Detect and prevent common attack patterns
export const detectSecurityThreats = (input) => {
  const threats = [];

  // SQL injection patterns
  if (/('|(--)|(\*)|(\/)|(;)|(xp_)|(exec)|(execute)|(select)|(union)|(drop)|(create)|(alter))/i.test(input)) {
    threats.push('Potential SQL injection detected');
  }

  // XSS patterns
  if (/<script|javascript:|on\w+\s*=|<iframe|<object|<embed|<svg/i.test(input)) {
    threats.push('Potential XSS detected');
  }

  // Path traversal
  if (/\.\.\//i.test(input)) {
    threats.push('Potential path traversal detected');
  }

  // Command injection
  if (/[;&|`$()]/.test(input)) {
    threats.push('Potential command injection detected');
  }

  return {
    safe: threats.length === 0,
    threats,
  };
};

// API request signing for HMAC verification
export const signAPIRequest = (method, url, body, secret) => {
  if (typeof crypto === 'undefined') {
    console.warn('crypto API not available');
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method}${url}${timestamp}${body || ''}`;

  // Note: This is a simplified example
  // In production, use proper HMAC-SHA256 with crypto.subtle
  return {
    timestamp,
    signature: message, // Replace with actual HMAC signature
  };
};

// Validate Same-Origin requests
export const isSameOrigin = (url) => {
  try {
    const requested = new URL(url, window.location.href);
    return requested.origin === window.location.origin;
  } catch {
    return false;
  }
};

// Security headers recommendation check
export const recommendedSecurityHeaders = () => {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
};

export default {
  sanitizeHTML,
  sanitizeURL,
  escapeHTML,
  validateEmail,
  validatePhoneNumber,
  createLoginLimiter,
  createCSRFProtection,
  validateFileUpload,
  getCSPHeaders,
  createSecureStorage,
  detectSecurityThreats,
  signAPIRequest,
  isSameOrigin,
  recommendedSecurityHeaders,
};
