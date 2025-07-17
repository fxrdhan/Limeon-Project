import React, { forwardRef, useRef, useImperativeHandle } from "react";
import { z } from "zod";
import Input from "@/components/input";
import ValidationOverlay from "@/components/validation-overlay";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import type { InputProps } from "@/types";

interface ValidatedInputProps extends Omit<InputProps, "error"> {
  validationSchema?: z.ZodSchema;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  onValidationChange?: (isValid: boolean, error: string | null) => void;
}

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      validationSchema,
      showValidationOnBlur = true,
      validationAutoHide = true,
      validationAutoHideDelay = 3000,
      onValidationChange,
      value,
      onBlur,
      onKeyDown,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showValidationError, setShowValidationError] = React.useState(false);

    // Expose the input ref to parent components
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const validation = useFieldValidation({
      schema: validationSchema || z.any(),
      value: value,
      showOnBlur: showValidationOnBlur,
    });

    // Notify parent about validation changes
    React.useEffect(() => {
      if (validationSchema && onValidationChange) {
        onValidationChange(validation.validation.isValid, validation.validation.error);
      }
    }, [validation.validation.isValid, validation.validation.error, validationSchema, onValidationChange]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (validationSchema) {
        validation.handleBlur();
        setShowValidationError(true);
      }
      onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear validation error when user starts typing
      if (showValidationError) {
        setShowValidationError(false);
        validation.clearError();
      }
      onChange?.(e);
    };

    const handleCloseValidation = () => {
      setShowValidationError(false);
      validation.clearError();
    };

    return (
      <>
        <Input
          ref={inputRef}
          value={value}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          {...props}
        />
        {validationSchema && (
          <ValidationOverlay
            isVisible={showValidationError && validation.validation.showError}
            error={validation.validation.error}
            targetRef={inputRef}
            onClose={handleCloseValidation}
            autoHide={validationAutoHide}
            autoHideDelay={validationAutoHideDelay}
          />
        )}
      </>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export default ValidatedInput;