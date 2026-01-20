import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import { LuX } from 'react-icons/lu';
import { PiTrashSimpleBold } from 'react-icons/pi';
import { BADGE_COLORS, BadgeConfig } from '../types/badge';
import { validateFilterValue } from '../utils/validationUtils';

// Format currency value for display (e.g., "500" -> "Rp 500")
const formatCurrencyDisplay = (value: string): string => {
  // Extract numeric value, handling existing currency symbols and formatting
  const cleanValue = value
    .replace(/^(Rp\.?\s*|\$\s*|€\s*|¥\s*|£\s*|IDR\s*|USD\s*|EUR\s*)/i, '')
    .replace(/[.,]/g, '') // Remove thousand separators
    .trim();

  // If value contains space (e.g. "500 600"), don't format it
  // This prevents formatting partial/multiple values as a single currency
  if (cleanValue.includes(' ')) {
    return value;
  }

  const numericValue = parseInt(cleanValue, 10);

  if (isNaN(numericValue)) {
    return value; // Return original if can't parse
  }

  // Format with thousand separators (Indonesian style: 1.000.000)
  const formatted = numericValue.toLocaleString('id-ID');
  return `Rp ${formatted}`;
};

interface BadgeProps {
  config: BadgeConfig;
}

const Badge: React.FC<BadgeProps> = ({ config }) => {
  const colors = BADGE_COLORS[config.type];
  const inputRef = useRef<HTMLInputElement>(null);
  // Flag to prevent blur handler after intentional clear actions (Delete, Backspace on empty)
  const isClearing = useRef(false);
  // Track cursor position to restore after value changes
  const cursorPosition = useRef<number | null>(null);
  // Shake animation state for validation feedback
  const [isShaking, setIsShaking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isEditing = config.isEditing || false;
  const editingValue = config.editingValue || '';
  const onValueChange = config.onValueChange;
  const onEditComplete = config.onEditComplete;
  const isSelected = config.isSelected || false;
  const columnType = config.columnType;
  const onHoverChange = config.onHoverChange;

  // Format display label for currency columns (only for value badges)
  const displayLabel = useMemo(() => {
    const isValueBadge = config.type === 'value' || config.type === 'valueTo';
    if (isValueBadge && columnType === 'currency' && config.label) {
      return formatCurrencyDisplay(config.label);
    }
    return config.label;
  }, [config.type, config.label, columnType]);

  // Trigger shake animation for validation error
  const triggerShake = () => {
    setIsShaking(true);
    config.onInvalidValue?.();
    setTimeout(() => setIsShaking(false), 400);
  };

  // Validate value based on column type
  const validateValue = (value: string): boolean => {
    return validateFilterValue(value, columnType);
  };

  // Auto-focus input when entering editing mode
  // Only position cursor once when entering edit mode, not on every value change
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end
      inputRef.current.setSelectionRange(
        editingValue.length,
        editingValue.length
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]); // Only trigger on edit mode change, not value length change

  // Auto-enter edit mode if badge value is invalid (for value badges only)
  // Track if we've already triggered for this label to prevent infinite loop
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    // Only for value badges (type 'value' or 'valueTo')
    const isValueBadgeType =
      config.type === 'value' || config.type === 'valueTo';
    if (isValueBadgeType && !isEditing && !hasAutoTriggered.current) {
      const isInvalid = !validateValue(config.label);
      if (isInvalid) {
        hasAutoTriggered.current = true;
        // Shake to indicate error
        triggerShake();
        // If editable, auto-enter edit mode immediately using RAF
        if (config.canEdit && config.onEdit) {
          requestAnimationFrame(() => {
            config.onEdit?.();
          });
        }
      }
    }
    // Reset flag when label changes to a valid value
    if (hasAutoTriggered.current && validateValue(config.label)) {
      hasAutoTriggered.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.label, config.type, config.canEdit, config.onEdit, isEditing]);

  // Restore cursor position after value changes (but not when entering edit mode)
  useEffect(() => {
    if (isEditing && inputRef.current && cursorPosition.current !== null) {
      const pos = cursorPosition.current;
      inputRef.current.setSelectionRange(pos, pos);
      cursorPosition.current = null;
    }
  }, [editingValue, isEditing]);

  // Handle keyboard events for inline editing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Ctrl+D (delete badge during edit)
    if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      e.stopPropagation();
      // Set flag to prevent blur handler
      isClearing.current = true;
      // Clear value which effectively deletes the badge
      onEditComplete?.('');
      return;
    }

    // Handle Ctrl+E (left) and Ctrl+Shift+E (right) to navigate between badges
    if (e.ctrlKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      e.stopPropagation();
      // Set flag to prevent blur handler
      isClearing.current = true;
      // Call navigate handler with direction: Shift = right, no Shift = left
      const direction = e.shiftKey ? 'right' : 'left';
      config.onNavigateEdit?.(direction);
      return;
    }

    // Handle Ctrl+I to exit edit mode and focus main input
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      e.stopPropagation();
      // Set flag to prevent blur handler
      isClearing.current = true;
      // Call focus input handler
      config.onFocusInput?.();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Validate value (empty check + type-specific validation)
      if (!validateValue(editingValue)) {
        triggerShake();
        return;
      }
      // Pass current value directly to avoid race condition
      onEditComplete?.(editingValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // Pass current value directly to avoid race condition
      onEditComplete?.(editingValue);
    } else if (e.key === 'Delete') {
      // Delete key while editing - clear the badge
      e.preventDefault();
      e.stopPropagation();
      // Set flag to prevent blur handler from re-applying old value
      isClearing.current = true;
      onEditComplete?.('');
    }
    // Backspace on empty input: do nothing (don't delete badge)
    // User can use DELETE key to explicitly delete the badge
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Capture cursor position before value change
    const cursorPos = e.target.selectionStart;
    if (cursorPos !== null) {
      cursorPosition.current = cursorPos;
    }

    onValueChange?.(newValue);
    // Don't auto-clear when value becomes empty - let user continue typing
    // Clear only happens on: Enter, Escape, Blur, or Backspace when already empty
  };

  // Handle blur (clicking outside)
  const handleBlur = () => {
    // Skip if we're in the middle of a clear operation
    // This prevents race condition where blur re-applies old value after Delete/clear
    if (isClearing.current) {
      isClearing.current = false;
      return;
    }
    // Validate value (empty check + type-specific validation)
    if (!validateValue(editingValue)) {
      triggerShake();
      // Re-focus input after shake
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }
    // Pass current editingValue directly
    onEditComplete?.(editingValue);
  };

  // Check if badge value is invalid (for value badges only, when not editing)
  const isValueBadge = config.type === 'value' || config.type === 'valueTo';
  const hasInvalidValue =
    isValueBadge && !isEditing && !validateValue(config.label);
  const lastInvalidLabelRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasInvalidValue && config.onInvalidValue) {
      if (lastInvalidLabelRef.current !== config.label) {
        config.onInvalidValue();
        lastInvalidLabelRef.current = config.label;
      }
      return;
    }

    lastInvalidLabelRef.current = null;
  }, [hasInvalidValue, config.label, config.onInvalidValue, config]);

  // Glow effect - red for invalid/shaking, otherwise badge type color
  const errorGlow =
    'shadow-[0_0_12px_rgba(244,63,94,0.5),0_0_24px_rgba(244,63,94,0.3)]';
  const selectedClass =
    isShaking || hasInvalidValue
      ? errorGlow
      : isSelected || isEditing
        ? colors.glow
        : '';

  // Shake animation styles
  const shakeStyle: React.CSSProperties = isShaking
    ? {
        animation: 'badge-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
      }
    : {};

  // Error state styles - persistent for invalid values, temporary during shake
  const errorClass =
    isShaking || hasInvalidValue ? '!bg-rose-200 !text-rose-800' : '';
  const wantsEditButton = isEditing || isSelected || isHovered;
  const wantsDeleteButton = !isEditing && (isSelected || isHovered);
  const [editIconVisible, setEditIconVisible] = useState(wantsEditButton);
  const [deleteIconVisible, setDeleteIconVisible] = useState(wantsDeleteButton);

  useEffect(() => {
    if (wantsEditButton) {
      const rafId = requestAnimationFrame(() => {
        onHoverChange?.(true);
        setEditIconVisible(true);
      });
      return () => cancelAnimationFrame(rafId);
    }
    const timeoutId = setTimeout(() => {
      onHoverChange?.(false);
      setEditIconVisible(false);
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [wantsEditButton, onHoverChange]);

  useEffect(() => {
    if (wantsDeleteButton) {
      const rafId = requestAnimationFrame(() => {
        onHoverChange?.(true);
        setDeleteIconVisible(true);
      });
      return () => cancelAnimationFrame(rafId);
    }
    const timeoutId = setTimeout(() => {
      onHoverChange?.(false);
      setDeleteIconVisible(false);
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [wantsDeleteButton, onHoverChange]);

  const showEditButtonSpace = wantsEditButton || editIconVisible;
  const showDeleteButtonSpace = wantsDeleteButton || deleteIconVisible;
  const wantsAnyButtons = wantsEditButton || wantsDeleteButton;
  const badgeTransform = wantsAnyButtons ? 'scaleX(1.02)' : 'scaleX(1)';

  return (
    <div
      className={`rounded-md text-sm font-medium ${colors.bg} ${colors.text} flex-shrink-0 transition-[box-shadow] duration-150 ease-out ${selectedClass} ${errorClass}`}
      data-selected={isSelected}
      style={{
        ...shakeStyle,
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverChange?.(false);
      }}
    >
      <div className="flex items-center">
        <div className="flex items-center py-1.5 pl-2.5">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editingValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className={`bg-transparent border-none outline-none text-sm font-medium ${colors.text} max-w-[200px] p-0 badge-edit-input`}
              style={{ width: `${Math.max(editingValue.length * 8, 20)}px` }}
            />
          ) : (
            <span
              onClick={
                config.canEdit && config.onEdit ? config.onEdit : undefined
              }
              onMouseDown={
                config.canEdit && config.onEdit
                  ? e => e.stopPropagation()
                  : undefined
              }
              className={
                config.canEdit && config.onEdit ? 'cursor-pointer' : ''
              }
            >
              {displayLabel}
            </span>
          )}
        </div>
        <div
          className="flex items-center pt-0.5 pr-1 transition-transform ease-out"
          style={{
            transform: badgeTransform,
            transformOrigin: 'center',
          }}
        >
          {/* Edit/Cancel button - same position, swaps icon based on mode */}
          {config.canEdit && config.onEdit && (
            <div
              className={`flex-shrink-0 overflow-hidden transition-opacity duration-150 ease-out ml-2 ${
                showEditButtonSpace ? 'w-6 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              <button
                onClick={
                  isEditing
                    ? () => onEditComplete?.(editingValue)
                    : config.onEdit
                }
                onMouseDown={e => {
                  e.stopPropagation();
                  // Set flag to prevent blur validation when clicking X to cancel edit
                  if (isEditing) {
                    isClearing.current = true;
                  }
                }}
                className={`rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0 transition-[opacity,transform] duration-150 ease-out ${
                  editIconVisible
                    ? 'opacity-100 translate-x-0'
                    : 'pointer-events-none opacity-0 -translate-x-1'
                }`}
                type="button"
              >
                {isEditing ? (
                  <LuX className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <FiEdit2 className="w-3.5 h-3.5 flex-shrink-0" />
                )}
              </button>
            </div>
          )}
          {/* Clear/Delete button (Trash) - shown on hover or selected, hidden when editing */}
          {!isEditing && config.canClear && (
            <div
              className={`flex-shrink-0 overflow-hidden transition-opacity duration-150 ease-out ${
                showDeleteButtonSpace ? 'w-6 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              <button
                onClick={e => {
                  e.stopPropagation();
                  // Blur the button to release focus before clearing
                  // This allows the parent handler to focus the input
                  e.currentTarget.blur();
                  config.onClear?.();
                }}
                onMouseDown={e => e.stopPropagation()}
                className={`rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0 transition-[opacity,transform] duration-150 ease-out ${
                  deleteIconVisible
                    ? 'opacity-100 translate-x-0'
                    : 'pointer-events-none opacity-0 -translate-x-1'
                }`}
                type="button"
              >
                <PiTrashSimpleBold className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Badge;
