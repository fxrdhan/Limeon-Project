import React, { useEffect, useRef } from 'react';
import { LuX } from 'react-icons/lu';
import { FiEdit2 } from 'react-icons/fi';
import { PiTrashSimpleBold } from 'react-icons/pi';
import { BadgeConfig, BADGE_COLORS } from '../types/badge';

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

  const isEditing = config.isEditing || false;
  const editingValue = config.editingValue || '';
  const onValueChange = config.onValueChange;
  const onEditComplete = config.onEditComplete;
  const isSelected = config.isSelected || false;

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

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Pass current value directly to avoid race condition
      onEditComplete?.(editingValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // Pass current value directly to avoid race condition
      onEditComplete?.(editingValue);
    } else if (e.key === 'Delete') {
      // Delete key while editing - immediately clear the badge (double-Delete to delete)
      e.preventDefault();
      e.stopPropagation();
      // Set flag to prevent blur handler from re-applying old value
      isClearing.current = true;
      onEditComplete?.('');
    } else if (e.key === 'Backspace' && editingValue === '') {
      // If backspace pressed on empty input, clear the badge
      e.preventDefault();
      e.stopPropagation();
      // Set flag to prevent blur handler from re-applying old value
      isClearing.current = true;
      onEditComplete?.('');
    }
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

    // If user cleared all text, immediately trigger clear action
    // Pass the newValue directly to avoid race condition with state update
    if (newValue.trim() === '') {
      // Set flag to prevent blur handler from re-applying old value
      isClearing.current = true;
      onEditComplete?.(newValue);
    }
  };

  // Handle blur (clicking outside)
  const handleBlur = () => {
    // Skip if we're in the middle of a clear operation
    // This prevents race condition where blur re-applies old value after Delete/clear
    if (isClearing.current) {
      isClearing.current = false;
      return;
    }
    // Pass current editingValue directly
    onEditComplete?.(editingValue);
  };

  // Glow effect for selected badge (color based on badge type)
  const selectedClass = isSelected ? colors.glow : '';

  return (
    <div
      className={`group flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${colors.bg} ${colors.text} flex-shrink-0 transition-shadow duration-200 ease-out ${selectedClass}`}
      data-selected={isSelected}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editingValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`bg-transparent border-none outline-none text-sm font-medium ${colors.text} max-w-[200px] p-0`}
          style={{ width: `${Math.max(editingValue.length * 8, 20)}px` }}
        />
      ) : (
        <span
          onClick={config.canEdit && config.onEdit ? config.onEdit : undefined}
          onMouseDown={
            config.canEdit && config.onEdit
              ? e => e.stopPropagation()
              : undefined
          }
          className={config.canEdit && config.onEdit ? 'cursor-pointer' : ''}
        >
          {config.label}
        </span>
      )}
      {/* Edit/Cancel button - same position, swaps icon based on mode */}
      {config.canEdit && config.onEdit && (
        <button
          onClick={
            isEditing ? () => onEditComplete?.(editingValue) : config.onEdit
          }
          onMouseDown={e => e.stopPropagation()}
          className={`rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0 ${
            isEditing || isSelected
              ? 'ml-1.5 max-w-[24px] opacity-100'
              : 'max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5'
          }`}
          type="button"
          style={{
            transition:
              'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
          }}
        >
          {isEditing ? (
            <LuX className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <FiEdit2 className="w-3.5 h-3.5 flex-shrink-0" />
          )}
        </button>
      )}
      {/* Clear/Delete button (Trash) - shown on hover or selected, hidden when editing */}
      {!isEditing && config.canClear && (
        <button
          onClick={e => {
            e.stopPropagation();
            // Blur the button to release focus before clearing
            // This allows the parent handler to focus the input
            e.currentTarget.blur();
            config.onClear?.();
          }}
          onMouseDown={e => e.stopPropagation()}
          className={`${
            isSelected
              ? 'ml-1.5 max-w-[24px] opacity-100'
              : 'max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5'
          } rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0`}
          type="button"
          style={{
            transition:
              'max-width 100ms ease-out, margin-left 100ms ease-out, opacity 100ms ease-out',
          }}
        >
          <PiTrashSimpleBold className="w-3.5 h-3.5 flex-shrink-0" />
        </button>
      )}
    </div>
  );
};

export default Badge;
