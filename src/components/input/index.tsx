import React, {
  forwardRef,
  useState,
  useRef,
  useImperativeHandle,
  useCallback,
  useEffect,
} from 'react';
import { z } from 'zod';
import type { InputProps } from '@/types';
import classNames from 'classnames';
import { useFieldValidation } from '@/hooks/forms/useFieldValidation';
import ValidationOverlay from '@/components/validation-overlay';

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
      validationAutoHideDelay,
      onValidationChange,
      value,
      onBlur,
      onKeyDown,
      onChange,
      type = 'text',
      ...props
    },
    ref
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
      if (!value) return '';
      return value.replace(/^Rp\s*/, '').replace(/[^0-9]/g, '');
    }, []);

    const formatCurrencyDisplay = useCallback(
      (value: string) => {
        const cleanValue = getCleanPriceValue(value);
        if (!cleanValue) return '';

        // Add thousand separators (dots) for Indonesian format
        const formattedNumber = cleanValue.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          '.'
        );
        return `Rp ${formattedNumber}`;
      },
      [getCleanPriceValue]
    );

    // Get the actual display value based on type
    const getDisplayValue = useCallback(() => {
      if (type === 'currency' && typeof value === 'string') {
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
      if (type === 'currency') {
        return isFocused ? '0' : 'Rp 0';
      }
      return props.placeholder;
    }, [type, isFocused, props.placeholder]);

    const validation = useFieldValidation({
      schema: validationSchema || z.any(),
      value: value,
      showOnBlur: showValidationOnBlur,
    });

    // Notify parent about validation changes
    useEffect(() => {
      if (validate && validationSchema && onValidationChange) {
        onValidationChange(
          validation.validation.isValid,
          validation.validation.error
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

      if (type === 'currency') {
        const inputValue = e.target.value;
        const cleanValue = inputValue.replace(/[^0-9]/g, ''); // Only keep numbers

        // Create a completely new event object with the currency format
        const newEvent = {
          ...e,
          target: {
            ...e.target,
            name: e.target.name,
            value: cleanValue ? `Rp ${cleanValue}` : '',
          },
        };

        onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
      } else {
        onChange?.(e);
      }
    };

    const handleValidationAutoHide = useCallback(() => {
      setShowValidationError(false);
      setHasAutoHidden(true);
    }, []);

    const shouldShowOverlay = () => {
      const displayValue = getDisplayValue();
      if (!displayValue || typeof displayValue !== 'string' || !isHovered)
        return false;

      // Create a temporary element to measure text width
      const tempElement = document.createElement('span');
      // Use font from Tailwind @theme (defined in App.scss)
      const fontFamily = getComputedStyle(document.documentElement)
        .getPropertyValue('--font-sans')
        .trim();
      const fontSize = getComputedStyle(document.documentElement)
        .getPropertyValue('--font-size-base')
        .trim();
      tempElement.style.font = `500 ${fontSize} ${fontFamily}`;
      tempElement.style.visibility = 'hidden';
      tempElement.style.position = 'absolute';
      tempElement.style.whiteSpace = 'nowrap';
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
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-gray-700 mb-2" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            type={type === 'currency' ? 'text' : type}
            value={getDisplayValue()}
            placeholder={getPlaceholder()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            className={classNames(
              'p-2.5 border rounded-lg',
              'px-3 text-sm font-medium text-gray-800',
              'text-ellipsis overflow-hidden whitespace-nowrap',
              'h-[2.5rem]',
              'placeholder:text-gray-400',
              {
                'border-danger ring-3 ring-danger/20':
                  error ||
                  (validate &&
                    !validation.validation.isValid &&
                    validation.validation.error &&
                    !isFocused),
                'border-gray-300':
                  !error &&
                  (!validate ||
                    validation.validation.isValid ||
                    !validation.validation.error ||
                    isFocused),
              },
              'focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200',
              'disabled:bg-gray-100 disabled:cursor-not-allowed read-only:bg-gray-100 read-only:cursor-default',
              'disabled:focus:ring-0 disabled:focus:border-gray-300 read-only:focus:ring-0 read-only:focus:border-gray-300',
              'transition-all duration-200 ease-in-out',
              {
                'w-full': fullWidth,
              },
              className
            )}
            {...props}
          />
          {shouldShowOverlay() && (
            <div
              className={classNames(
                'absolute bottom-full left-0 right-0 z-10 mb-1',
                'p-2.5 px-3 text-sm font-medium text-gray-800',
                'border rounded-lg bg-white/50 backdrop-blur-md',
                'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),4px_0_6px_-1px_rgba(0,0,0,0.1),-4px_0_6px_-1px_rgba(0,0,0,0.1)]',
                'whitespace-pre-wrap break-words',
                'min-h-[2.5rem] max-h-32 overflow-y-auto',
                {
                  'border-danger':
                    error ||
                    (validate &&
                      !validation.validation.isValid &&
                      validation.validation.error),
                  'border-gray-300':
                    !error &&
                    (!validate ||
                      validation.validation.isValid ||
                      !validation.validation.error),
                },
                'pointer-events-none'
              )}
            >
              {type === 'currency' && typeof value === 'string'
                ? formatCurrencyDisplay(value)
                : getDisplayValue()}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {validate && (
          <ValidationOverlay
            error={validation.validation.error}
            showError={showValidationError && validation.validation.showError}
            targetRef={inputRef}
            autoHide={validationAutoHide}
            autoHideDelay={validationAutoHideDelay}
            onAutoHide={handleValidationAutoHide}
            isHovered={isHovered}
            hasAutoHidden={hasAutoHidden}
          />
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
