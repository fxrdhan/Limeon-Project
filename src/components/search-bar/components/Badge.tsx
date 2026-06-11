import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TbCirclePlus, TbPencil, TbTrash, TbX } from 'react-icons/tb';
import { BADGE_COLORS, BadgeConfig } from '../types/badge';
import { validateFilterValue } from '../utils/validationUtils';
import { BadgeActionButton } from './badge/BadgeActionButton';
import { BADGE_TYPE_LABELS, formatCurrencyDisplay } from './badge/badgeDisplay';
import { useBadgeActionVisibility } from './badge/useBadgeActionVisibility';

interface BadgeProps {
  config: BadgeConfig;
  onSelect?: () => void;
}

const Badge: React.FC<BadgeProps> = ({ config, onSelect }) => {
  const colors = BADGE_COLORS[config.type];
  const badgeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Flag to prevent blur handler after intentional clear actions (Delete, Backspace on empty)
  const isClearing = useRef(false);
  // Track cursor position to restore after value changes
  const cursorPosition = useRef<number | null>(null);
  // Shake animation state for validation feedback
  const [isShaking, setIsShaking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);

  const isEditing = config.isEditing || false;
  const editingValue = config.editingValue || '';
  const onValueChange = config.onValueChange;
  const onEditComplete = config.onEditComplete;
  const isSelected = config.isSelected || false;
  const columnType = config.columnType;
  const onHoverChange = config.onHoverChange;
  const hasActionMenu =
    !!config.canEdit || !!config.canClear || !!config.canInsert;
  const badgeTypeLabel = BADGE_TYPE_LABELS[config.type];

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
      setIsMenuOpen(false);
      inputRef.current.focus();
      // Position cursor at end
      inputRef.current.setSelectionRange(
        editingValue.length,
        editingValue.length
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]); // Only trigger on edit mode change, not value length change

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!badgeRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isMenuOpen]);

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
    'shadow-[0_0_12px_oklch(64.5%_0.215_16.4_/_0.5),0_0_24px_oklch(64.5%_0.215_16.4_/_0.3)]';
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
  const shouldExposeActions =
    isSelected || isMenuOpen || isPointerInside || hasFocusWithin;
  const wantsEditButton = isEditing || shouldExposeActions;
  const wantsDeleteButton = !isEditing && shouldExposeActions;
  const wantsInsertButton =
    !isEditing && !!config.canInsert && shouldExposeActions;
  const {
    deleteIconVisible,
    editIconVisible,
    insertIconVisible,
    showDeleteButtonSpace,
    showEditButtonSpace,
    showInsertButtonSpace,
  } = useBadgeActionVisibility({
    onHoverChange,
    wantsDeleteButton,
    wantsEditButton,
    wantsInsertButton,
  });
  const hasMenuAction = hasActionMenu && !isEditing;
  const actionTargetLabel = `${badgeTypeLabel.toLowerCase()} ${displayLabel}`;
  const badgeAriaLabel = config.canClear
    ? `${badgeTypeLabel} ${displayLabel}. Press Delete or Backspace to remove.`
    : `${badgeTypeLabel} ${displayLabel}`;

  return (
    <div
      ref={badgeRef}
      className={`inline-flex h-8 items-center whitespace-nowrap rounded-lg text-sm font-medium ${colors.bg} ${colors.text} flex-shrink-0 transition-[box-shadow,background-color] duration-200 ease-out ${selectedClass} ${errorClass}`}
      data-selected={isSelected}
      style={{
        ...shakeStyle,
      }}
      {...(hasMenuAction
        ? {
            onClick: () => {
              badgeRef.current?.focus({ preventScroll: true });
              onSelect?.();
              setIsMenuOpen(prev => !prev);
              onHoverChange?.(true);
            },
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.target !== event.currentTarget) return;

              if (
                config.canClear &&
                (event.key === 'Delete' || event.key === 'Backspace')
              ) {
                event.preventDefault();
                event.stopPropagation();
                setIsMenuOpen(false);
                config.onClear?.();
                return;
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsMenuOpen(prev => !prev);
                onHoverChange?.(true);
              }
            },
            onFocus: () => {
              onSelect?.();
              setHasFocusWithin(true);
              onHoverChange?.(true);
            },
            onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
              if (
                event.relatedTarget instanceof Node &&
                event.currentTarget.contains(event.relatedTarget)
              ) {
                return;
              }
              setHasFocusWithin(false);
              setIsMenuOpen(false);
              onHoverChange?.(false);
            },
            onMouseEnter: () => {
              setIsPointerInside(true);
            },
            onMouseLeave: () => {
              setIsPointerInside(false);
            },
            'aria-keyshortcuts': config.canClear
              ? 'Delete Backspace'
              : undefined,
            'aria-label': badgeAriaLabel,
            role: 'button' as const,
            tabIndex: 0,
          }
        : {})}
    >
      <div className="flex items-center">
        <div className="flex items-center py-1.5 pl-2.5 pr-1.5">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editingValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              aria-label={`Edit ${actionTargetLabel}`}
              className={`bg-transparent border-none outline-none text-sm font-medium ${colors.text} max-w-[200px] p-0 badge-edit-input transition-[width] duration-150 ease-out`}
              style={{ width: `${Math.max(editingValue.length * 8, 20)}px` }}
            />
          ) : (
            <span className={hasActionMenu ? 'cursor-pointer' : ''}>
              {displayLabel}
            </span>
          )}
        </div>
        <div className="flex items-center pr-1">
          {/* Edit/Cancel button - same position, swaps icon based on mode */}
          {config.canEdit && config.onEdit && (
            <BadgeActionButton
              ariaHidden={!wantsEditButton}
              ariaLabel={
                isEditing
                  ? `Finish editing ${actionTargetLabel}`
                  : `Edit ${actionTargetLabel}`
              }
              hoverBgClassName={colors.hoverBg}
              iconVisible={editIconVisible}
              onClick={e => {
                e.stopPropagation();
                if (isEditing) {
                  onEditComplete?.(editingValue);
                  return;
                }
                setIsMenuOpen(false);
                config.onEdit?.();
              }}
              onMouseDown={e => {
                e.stopPropagation();
                // Set flag to prevent blur validation when clicking X to cancel edit
                if (isEditing) {
                  isClearing.current = true;
                }
              }}
              showButtonSpace={showEditButtonSpace}
              tabIndex={wantsEditButton ? 0 : -1}
              tooltipLabel={isEditing ? 'Finish editing' : 'Edit'}
              withLeadingMargin={true}
            >
              {isEditing ? (
                <TbX className="block w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <TbPencil className="block w-3.5 h-3.5 flex-shrink-0" />
              )}
            </BadgeActionButton>
          )}
          {/* Clear/Delete button (Trash) - shown on hover or selected, hidden when editing */}
          {!isEditing && config.canClear && (
            <BadgeActionButton
              ariaHidden={!wantsDeleteButton}
              ariaLabel={`Remove ${actionTargetLabel}`}
              hoverBgClassName={colors.hoverBg}
              iconVisible={deleteIconVisible}
              onClick={e => {
                e.stopPropagation();
                // Blur the button to release focus before clearing
                // This allows the parent handler to focus the input
                e.currentTarget.blur();
                setIsMenuOpen(false);
                config.onClear?.();
              }}
              onMouseDown={e => e.stopPropagation()}
              showButtonSpace={showDeleteButtonSpace}
              tabIndex={wantsDeleteButton ? 0 : -1}
              tooltipLabel="Remove"
            >
              <TbTrash className="block w-3.5 h-3.5 flex-shrink-0" />
            </BadgeActionButton>
          )}

          {/* Insert button (Plus) - only enabled for eligible value badges */}
          {!isEditing && config.canInsert && config.onInsert && (
            <BadgeActionButton
              ariaHidden={!wantsInsertButton}
              ariaLabel={`Add condition after ${actionTargetLabel}`}
              hoverBgClassName={colors.hoverBg}
              iconVisible={insertIconVisible}
              onClick={e => {
                e.stopPropagation();
                e.currentTarget.blur();
                setIsMenuOpen(false);
                config.onInsert?.();
              }}
              onMouseDown={e => e.stopPropagation()}
              showButtonSpace={showInsertButtonSpace}
              tabIndex={wantsInsertButton ? 0 : -1}
              tooltipLabel="Add condition"
            >
              <TbCirclePlus className="block w-4 h-4 flex-shrink-0" />
            </BadgeActionButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default Badge;
