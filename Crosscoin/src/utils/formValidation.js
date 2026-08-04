/**
 * Form validation utilities for client-side validation
 * Provides reusable validators and error messages
 */

/**
 * Validators object - each returns true if valid, false if invalid
 */
export const validators = {
  required: (value) => {
    if (typeof value === 'string') return value?.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  },

  email: (value) => {
    if (!value) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  minLength: (length) => (value) => {
    return value && value.length >= length;
  },

  maxLength: (length) => (value) => {
    return !value || value.length <= length;
  },

  number: (value) => {
    if (!value) return false;
    return !isNaN(value) && isFinite(value);
  },

  positiveNumber: (value) => {
    return validators.number(value) && Number(value) > 0;
  },

  phone: (value) => {
    if (!value) return false;
    const phoneRegex = /^[0-9\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(value.replace(/\D/g, ''));
  },

  url: (value) => {
    if (!value) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  alphanumeric: (value) => {
    if (!value) return false;
    const regex = /^[a-zA-Z0-9 \-_]*$/;
    return regex.test(value);
  },

  noSpecialChars: (value) => {
    if (!value) return false;
    const regex = /^[a-zA-Z0-9\s\-_.,]*$/;
    return regex.test(value);
  },
};

/**
 * Error messages for validators
 */
export const errorMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minLength: (length) => `Minimum ${length} characters required`,
  maxLength: (length) => `Maximum ${length} characters allowed`,
  number: 'Please enter a valid number',
  positiveNumber: 'Please enter a positive number',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  alphanumeric: 'Only letters, numbers, spaces, hyphens and underscores allowed',
  noSpecialChars: 'Special characters not allowed',
};

/**
 * Validate form field
 * @param {*} value - Field value
 * @param {Array} rules - Validation rules [{type: 'required'}, {type: 'minLength', value: 5}]
 * @returns {string|null} Error message or null if valid
 */
export const validateField = (value, rules = []) => {
  for (const rule of rules) {
    const { type, value: ruleValue } = rule;

    if (type === 'required') {
      if (!validators.required(value)) return errorMessages.required;
    } else if (type === 'email') {
      if (value && !validators.email(value)) return errorMessages.email;
    } else if (type === 'minLength') {
      if (value && !validators.minLength(ruleValue)(value)) {
        return errorMessages.minLength(ruleValue);
      }
    } else if (type === 'maxLength') {
      if (value && !validators.maxLength(ruleValue)(value)) {
        return errorMessages.maxLength(ruleValue);
      }
    } else if (type === 'number') {
      if (value && !validators.number(value)) return errorMessages.number;
    } else if (type === 'positiveNumber') {
      if (value && !validators.positiveNumber(value)) return errorMessages.positiveNumber;
    } else if (type === 'phone') {
      if (value && !validators.phone(value)) return errorMessages.phone;
    } else if (type === 'url') {
      if (value && !validators.url(value)) return errorMessages.url;
    } else if (type === 'alphanumeric') {
      if (value && !validators.alphanumeric(value)) return errorMessages.alphanumeric;
    } else if (type === 'noSpecialChars') {
      if (value && !validators.noSpecialChars(value)) return errorMessages.noSpecialChars;
    } else if (type === 'custom' && typeof ruleValue === 'function') {
      if (!ruleValue(value)) return rule.message || 'Invalid value';
    }
  }

  return null;
};

/**
 * Validate entire form
 * @param {Object} formData - Form data object
 * @param {Object} validationSchema - Schema {fieldName: [{type: 'required'}, ...]}
 * @returns {Object} Errors object {fieldName: 'error message'}
 */
export const validateForm = (formData, validationSchema) => {
  const errors = {};

  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const error = validateField(formData[fieldName], rules);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
};

/**
 * Check if form has any errors
 * @param {Object} errors - Errors object from validation
 * @returns {boolean} True if no errors
 */
export const isFormValid = (errors) => {
  return Object.keys(errors).length === 0;
};

export default {
  validators,
  errorMessages,
  validateField,
  validateForm,
  isFormValid,
};
