import { useCallback, useEffect, useState } from 'react';
import { VALIDATION_MESSAGES } from '@/components/dropdown/constants';
import type { DropdownValue } from '@/components/dropdown/internal-types';

export const useComboboxValidationState = ({
  required,
  validate,
  value,
  showValidationOnBlur,
}: {
  required: boolean;
  validate: boolean;
  value: DropdownValue;
  showValidationOnBlur: boolean;
}) => {
  const [touched, setTouched] = useState(false);
  const [showValidationOverlay, setShowValidationOverlay] = useState(false);
  const [hasAutoHidden, setHasAutoHidden] = useState(false);
  const hasValue = Array.isArray(value)
    ? value.length > 0
    : value.trim() !== '';
  const hasError = (required || validate) && touched && !hasValue;
  const errorMessage = hasError ? VALIDATION_MESSAGES.REQUIRED : null;

  useEffect(() => {
    if (!hasError) {
      setShowValidationOverlay(false);
      setHasAutoHidden(false);
    }
  }, [hasError]);

  const markTouched = useCallback(() => {
    setTouched(true);
    if ((required || validate) && !hasValue && showValidationOnBlur) {
      setShowValidationOverlay(true);
    }
  }, [hasValue, required, showValidationOnBlur, validate]);

  const closeValidation = useCallback(() => {
    setShowValidationOverlay(false);
    setHasAutoHidden(false);
  }, []);

  const handleAutoHide = useCallback(() => {
    setShowValidationOverlay(false);
    setHasAutoHidden(true);
  }, []);

  return {
    hasError,
    errorMessage,
    hasAutoHidden,
    showValidationOverlay,
    markTouched,
    closeValidation,
    handleAutoHide,
  };
};
