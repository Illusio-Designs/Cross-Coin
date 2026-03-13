import { useState, useCallback } from 'react';

/**
 * Custom hook for form input handling
 * Eliminates duplicate form state logic across components
 */
export const useFormInput = (initialValue = '') => {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(null);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const setFieldError = useCallback((errorMsg) => {
    setError(errorMsg);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
    setTouched(false);
    setError(null);
  }, [initialValue]);

  const bind = {
    value,
    onChange: handleChange,
    onBlur: handleBlur
  };

  return {
    value,
    setValue,
    touched,
    error,
    setFieldError,
    reset,
    bind,
    isValid: !error && touched
  };
};

/**
 * Hook for managing multiple form fields
 */
export const useForm = (initialValues = {}, onSubmit = null) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: null
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (onSubmit) {
      try {
        await onSubmit(values);
      } catch (err) {
        setErrors(err.errors || {});
      }
    }
    
    setIsSubmitting(false);
  }, [values, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError
  };
};
