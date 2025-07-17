import React, { forwardRef, useState, useRef, useImperativeHandle } from "react";
import { z } from "zod";
import type { InputProps } from "@/types";
import { classNames } from "@/lib/classNames";
import ValidationOverlay from "@/components/validation-overlay";
import { useFieldValidation } from "@/hooks/useFieldValidation";

interface ExtendedInputProps extends Omit<InputProps, "error"> {
  validate?: boolean;
  validationSchema?: z.ZodSchema;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  onValidationChange?: (isValid: boolean, error: string | null) => void;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, ExtendedInputProps>(
  ({ 
    label, 
    error, 
    className, 
    fullWidth = true, 
    validate = false,
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
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
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
      if (validate && validationSchema && onValidationChange) {
        onValidationChange(validation.validation.isValid, validation.validation.error);
      }
    }, [validation.validation.isValid, validation.validation.error, validate, validationSchema, onValidationChange]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (validate && validationSchema) {
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
      if (validate && showValidationError) {
        setShowValidationError(false);
        validation.clearError();
      }
      onChange?.(e);
    };

    const handleCloseValidation = () => {
      setShowValidationError(false);
      validation.clearError();
    };

    const shouldShowOverlay = () => {
      if (!value || typeof value !== "string" || !isHovered)
        return false;

      // Create a temporary element to measure text width
      const tempElement = document.createElement("span");
      tempElement.style.font = "14px system-ui, -apple-system, sans-serif"; // text-sm
      tempElement.style.visibility = "hidden";
      tempElement.style.position = "absolute";
      tempElement.style.whiteSpace = "nowrap";
      tempElement.textContent = value;

      document.body.appendChild(tempElement);
      const textWidth = tempElement.offsetWidth;
      document.body.removeChild(tempElement);

      // Calculate available width (input width - padding)
      const inputWidth = fullWidth ? 300 : 200; // approximate widths
      const availableWidth = inputWidth - 24; // 12px padding on each side

      return textWidth > availableWidth;
    };

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-gray-700 mb-2" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            value={value}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            className={classNames(
              "p-2.5 border rounded-lg",
              "px-3 text-sm",
              "text-ellipsis overflow-hidden whitespace-nowrap",
              "h-[2.5rem]",
              error ? "border-red-500" : "border-gray-300",
              "focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200",
              "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 read-only:bg-gray-100 read-only:cursor-default read-only:opacity-70",
              "disabled:focus:ring-0 disabled:focus:border-gray-300 read-only:focus:ring-0 read-only:focus:border-gray-300",
              "transition-all duration-200 ease-in-out",
              fullWidth ? "w-full" : "",
              className,
            )}
            {...props}
          />
          {shouldShowOverlay() && (
            <div
              className={classNames(
                "absolute bottom-full left-0 right-0 z-10 mb-1",
                "p-2.5 px-3 text-sm",
                "border rounded-lg bg-white/50 backdrop-blur-md",
                "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),4px_0_6px_-1px_rgba(0,0,0,0.1),-4px_0_6px_-1px_rgba(0,0,0,0.1)]",
                "whitespace-pre-wrap break-words",
                "min-h-[2.5rem] max-h-32 overflow-y-auto",
                error ? "border-red-500" : "border-gray-300",
                "pointer-events-none",
              )}
            >
              {value}
            </div>
          )}
          {validate && validationSchema && (
            <ValidationOverlay
              isVisible={showValidationError && validation.validation.showError}
              error={validation.validation.error}
              targetRef={inputRef}
              onClose={handleCloseValidation}
              autoHide={validationAutoHide}
              autoHideDelay={validationAutoHideDelay}
            />
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
