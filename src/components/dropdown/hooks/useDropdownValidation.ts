import { useState, useCallback, useRef, useEffect } from 'react';
import { VALIDATION_MESSAGES } from '../constants';

interface UseDropdownValidationProps {
  validate?: boolean;
  required?: boolean;
  value?: string;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
}

export const useDropdownValidation = ({
  validate = false,
  required = false,
  value,
  showValidationOnBlur = true,
  validationAutoHide = true,
  validationAutoHideDelay,
}: UseDropdownValidationProps) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [showValidationOverlay, setShowValidationOverlay] = useState(false);
  const [hasAutoHidden, setHasAutoHidden] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateDropdown = useCallback(() => {
    if (!validate && !required) return true;

    if (required && (!value || value.trim() === '')) {
      setHasError(true);
      setErrorMessage(VALIDATION_MESSAGES.REQUIRED);
      return false;
    }

    setHasError(false);
    setErrorMessage(null);
    return true;
  }, [validate, required, value]);

  const handleCloseValidation = useCallback(() => {
    setShowValidationOverlay(false);
    setHasError(false);
    setErrorMessage(null);
    setHasAutoHidden(false);
  }, []);

  const handleValidationAutoHide = useCallback(() => {
    setShowValidationOverlay(false);
    setHasAutoHidden(true);
  }, []);

  useEffect(() => {
    if (touched && (validate || required)) {
      const isValid = validateDropdown();
      if (!isValid && showValidationOnBlur) {
        if (
          validationAutoHide &&
          validationAutoHideDelay &&
          validationAutoHideDelay > 0
        ) {
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
          }
          validationTimeoutRef.current = setTimeout(() => {
            // Auto-hide timeout is handled by overlay state
          }, validationAutoHideDelay);
        }
      } else if (isValid) {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
      }
    }
  }, [
    touched,
    validate,
    required,
    validateDropdown,
    showValidationOnBlur,
    validationAutoHide,
    validationAutoHideDelay,
  ]);

  // Clear validation when value changes to valid
  useEffect(() => {
    if (touched && (validate || required) && value && value.trim() !== '') {
      handleCloseValidation();
    }
  }, [value, touched, validate, required, handleCloseValidation]);

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasError,
    errorMessage,
    touched,
    setTouched,
    showValidationOverlay,
    setShowValidationOverlay,
    hasAutoHidden,
    validateDropdown,
    handleCloseValidation,
    handleValidationAutoHide,
  };
};
