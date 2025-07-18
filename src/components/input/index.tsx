import React, {
  forwardRef,
  useState,
  useRef,
  useImperativeHandle,
  useEffect,
  useCallback,
} from "react";
import { z } from "zod";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationTriangle } from "react-icons/fa";
import type { InputProps } from "@/types";
import { classNames } from "@/lib/classNames";
import { useFieldValidation } from "@/hooks/useFieldValidation";

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
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
      type = "text",
      ...props
    },
    ref,
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showValidationError, setShowValidationError] = React.useState(false);
    const [hasAutoHidden, setHasAutoHidden] = React.useState(false);

    // Expose the input ref to parent components
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Currency helper functions
    const getCleanPriceValue = useCallback((value: string) => {
      if (!value) return "";
      return value.replace(/^Rp\s*/, "").replace(/[^0-9]/g, "");
    }, []);

    const formatCurrencyDisplay = useCallback(
      (value: string) => {
        const cleanValue = getCleanPriceValue(value);
        if (!cleanValue) return "";

        // Add thousand separators (dots) for Indonesian format
        const formattedNumber = cleanValue.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          ".",
        );
        return `Rp ${formattedNumber}`;
      },
      [getCleanPriceValue],
    );

    // Get the actual display value based on type
    const getDisplayValue = useCallback(() => {
      if (type === "currency" && typeof value === "string") {
        if (isFocused) {
          // When focused, show only numbers for easy editing
          return getCleanPriceValue(value);
        } else {
          // When not focused, show formatted currency with thousand separators
          return formatCurrencyDisplay(value);
        }
      }
      return value;
    }, [type, value, isFocused, getCleanPriceValue, formatCurrencyDisplay]);

    // Get the appropriate placeholder
    const getPlaceholder = useCallback(() => {
      if (type === "currency") {
        return isFocused ? "0" : "Rp 0";
      }
      return props.placeholder;
    }, [type, isFocused, props.placeholder]);

    const validation = useFieldValidation({
      schema: validationSchema || z.any(),
      value: value,
      showOnBlur: showValidationOnBlur,
    });

    // Notify parent about validation changes
    React.useEffect(() => {
      if (validate && validationSchema && onValidationChange) {
        onValidationChange(
          validation.validation.isValid,
          validation.validation.error,
        );
      }
    }, [
      validation.validation.isValid,
      validation.validation.error,
      validate,
      validationSchema,
      onValidationChange,
    ]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (validate && validationSchema) {
        validation.handleBlur();
        setShowValidationError(true);
        setHasAutoHidden(false); // Reset auto-hide state for new validation
      }
      onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
    };

    // ValidationOverlay integrated logic
    const [validationPosition, setValidationPosition] = React.useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use refs to avoid dependency issues
    const validationRef = useRef(validation);
    validationRef.current = validation;

    const handleCloseValidation = useCallback(() => {
      setShowValidationError(false);
      validationRef.current.clearError();
      setHasAutoHidden(false);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear validation error when user starts typing
      if (validate && (showValidationError || hasAutoHidden)) {
        handleCloseValidation();
      }

      if (type === "currency") {
        const inputValue = e.target.value;
        const cleanValue = inputValue.replace(/[^0-9]/g, ""); // Only keep numbers

        // Create a completely new event object with the currency format
        const newEvent = {
          ...e,
          target: {
            ...e.target,
            name: e.target.name,
            value: cleanValue ? `Rp ${cleanValue}` : "",
          },
        };

        onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
      } else {
        onChange?.(e);
      }
    };

    // Effect for positioning
    useEffect(() => {
      if (
        validate &&
        showValidationError &&
        validation.validation.error &&
        inputRef.current
      ) {
        const rect = inputRef.current.getBoundingClientRect();
        setValidationPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        });
      }
    }, [validate, showValidationError, validation.validation.error]);

    // Effect for auto-hide timeout
    useEffect(() => {
      if (
        validate &&
        showValidationError &&
        validation.validation.showError &&
        validationAutoHide &&
        validationAutoHideDelay > 0
      ) {
        validationTimeoutRef.current = setTimeout(() => {
          setShowValidationError(false);
          setHasAutoHidden(true);
        }, validationAutoHideDelay);
      }

      return () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
          validationTimeoutRef.current = null;
        }
      };
    }, [
      validate,
      showValidationError,
      validation.validation.showError,
      validationAutoHide,
      validationAutoHideDelay,
    ]);

    // Effect for hover-triggered validation display after auto-hide
    useEffect(() => {
      if (validate && hasAutoHidden && validation.validation.error) {
        if (isHovered) {
          setShowValidationError(true);
        } else {
          setShowValidationError(false);
        }
      }
    }, [validate, hasAutoHidden, validation.validation.error, isHovered]);

    const renderValidationOverlay = () => {
      if (!validate || !validation.validation.error || !validationPosition) {
        return null;
      }

      return createPortal(
        <AnimatePresence>
          {showValidationError && validation.validation.error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: validationPosition.top,
                left: validationPosition.left,
              }}
            >
              <div className="bg-danger/75 text-white text-sm px-3 py-2 rounded-lg shadow-lg backdrop-blur-xs flex items-center gap-2 w-fit">
                <FaExclamationTriangle
                  className="text-yellow-300 flex-shrink-0"
                  size={14}
                />
                <span className="font-medium">
                  {validation.validation.error}
                </span>
              </div>
              {/* Arrow pointing up */}
              <div className="absolute -top-1 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-danger/75 backdrop-blur-xs"></div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      );
    };

    const shouldShowOverlay = () => {
      const displayValue = getDisplayValue();
      if (!displayValue || typeof displayValue !== "string" || !isHovered)
        return false;

      // Create a temporary element to measure text width
      const tempElement = document.createElement("span");
      tempElement.style.font = "14px system-ui, -apple-system, sans-serif"; // text-sm
      tempElement.style.visibility = "hidden";
      tempElement.style.position = "absolute";
      tempElement.style.whiteSpace = "nowrap";
      tempElement.textContent = displayValue;

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
            type={type === "currency" ? "text" : type}
            value={getDisplayValue()}
            placeholder={getPlaceholder()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            className={classNames(
              "p-2.5 border rounded-lg",
              "px-3 text-sm",
              "text-ellipsis overflow-hidden whitespace-nowrap",
              "h-[2.5rem]",
              error ||
                (validate &&
                  !validation.validation.isValid &&
                  validation.validation.error &&
                  !isFocused)
                ? "border-danger ring-3 ring-danger/20"
                : "border-gray-300",
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
                error ||
                  (validate &&
                    !validation.validation.isValid &&
                    validation.validation.error)
                  ? "border-danger"
                  : "border-gray-300",
                "pointer-events-none",
              )}
            >
              {type === "currency" && typeof value === "string"
                ? formatCurrencyDisplay(value)
                : getDisplayValue()}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {renderValidationOverlay()}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
