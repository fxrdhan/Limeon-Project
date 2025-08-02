import { useState, useCallback } from 'react';
import { z } from 'zod';

interface ValidationState {
  isValid: boolean;
  error: string | null;
  showError: boolean;
}

interface UseFieldValidationProps<T extends z.ZodSchema> {
  schema: T;
  value: unknown;
  showOnBlur?: boolean;
}

export const useFieldValidation = <T extends z.ZodSchema>({
  schema,
  value,
  showOnBlur = true,
}: UseFieldValidationProps<T>) => {
  const [validation, setValidation] = useState<ValidationState>({
    isValid: true,
    error: null,
    showError: false,
  });

  const validateField = useCallback(
    (showError: boolean = false) => {
      try {
        schema.parse(value);
        setValidation({
          isValid: true,
          error: null,
          showError: false,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          setValidation({
            isValid: false,
            error: firstError.message,
            showError,
          });
        }
      }
    },
    [schema, value]
  );

  const handleBlur = useCallback(() => {
    if (showOnBlur) {
      validateField(true);
    }
  }, [validateField, showOnBlur]);

  const clearError = useCallback(() => {
    setValidation(prev => ({
      ...prev,
      showError: false,
    }));
  }, []);

  const forceValidate = useCallback(() => {
    validateField(true);
  }, [validateField]);

  return {
    validation,
    handleBlur,
    clearError,
    forceValidate,
  };
};
