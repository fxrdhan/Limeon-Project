import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SmartInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  fieldName: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  smartFormSync?: {
    getFieldHandlers: (fieldName: string) => {
      onFocus: () => void;
      onBlur: () => void;
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    };
    hasPendingUpdate: (fieldName: string) => boolean;
  };
  label?: string;
  error?: string;
}

/**
 * Smart Input Component with Realtime Conflict Resolution
 *
 * Features:
 * - Prevents realtime updates while user is typing
 * - Shows visual indicator for pending updates
 * - Applies updates when user finishes editing
 */
const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  (
    {
      fieldName,
      value,
      onChange,
      smartFormSync,
      label,
      error,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    // Use getDerivedStateFromProps pattern to sync localValue when not focused
    const [inputState, setInputState] = useState({
      isFocused: false,
      value,
      localValue: value,
    });
    if (
      isFocused !== inputState.isFocused ||
      (!isFocused && value !== inputState.value)
    ) {
      setInputState({
        isFocused,
        value,
        localValue: isFocused ? inputState.localValue : value,
      });
    }
    const localValue = inputState.localValue;
    const setLocalValue = (newValue: string) => {
      setInputState(prev => ({ ...prev, localValue: newValue }));
    };

    // Get field handlers from smart form sync
    const fieldHandlers = smartFormSync?.getFieldHandlers(fieldName);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      fieldHandlers?.onFocus();
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      fieldHandlers?.onBlur();
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      onChange(e);
      fieldHandlers?.onChange(e);
    };

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            value={localValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
              'focus:ring-blue-500 focus:border-blue-500',
              'placeholder-gray-400',
              // Error state
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;
