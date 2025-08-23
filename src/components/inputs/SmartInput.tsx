import React, { forwardRef, useState, useEffect } from 'react';
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
  showPendingIndicator?: boolean;
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
      showPendingIndicator = true,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync local value with prop value when not focused
    useEffect(() => {
      if (!isFocused) {
        setLocalValue(value);
      }
    }, [value, isFocused]);

    // Get field handlers from smart form sync
    const fieldHandlers = smartFormSync?.getFieldHandlers(fieldName);
    const hasPendingUpdate =
      smartFormSync?.hasPendingUpdate(fieldName) || false;

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
            {hasPendingUpdate && showPendingIndicator && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse" />
                Perubahan tersimpan
              </span>
            )}
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
              // Visual indicator for pending updates
              hasPendingUpdate &&
                !isFocused &&
                'border-l-4 border-l-blue-500 bg-blue-50',
              // Error state
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />

          {/* Pending update indicator */}
          {hasPendingUpdate && !isFocused && showPendingIndicator && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

        {/* Development helper */}
        {process.env.NODE_ENV === 'development' && hasPendingUpdate && (
          <p className="mt-1 text-xs text-blue-600">
            🔄 Ada perubahan yang akan diaplikasikan setelah Anda selesai
            mengedit
          </p>
        )}
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;
