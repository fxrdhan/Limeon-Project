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

  const isEditing = config.isEditing || false;
  const editingValue = config.editingValue || '';
  const onValueChange = config.onValueChange;
  const onEditComplete = config.onEditComplete;

  // Auto-focus input when entering editing mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end
      inputRef.current.setSelectionRange(
        editingValue.length,
        editingValue.length
      );
    }
  }, [isEditing, editingValue.length]);

  // Handle keyboard events for inline editing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    } else if (e.key === 'Backspace' && editingValue === '') {
      // If backspace pressed on empty input, clear the badge
      e.preventDefault();
      e.stopPropagation();
      // Pass empty string to trigger clear
      onEditComplete?.('');
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange?.(newValue);

    // If user cleared all text, immediately trigger clear action
    // Pass the newValue directly to avoid race condition with state update
    if (newValue.trim() === '') {
      // No setTimeout needed - pass value directly
      onEditComplete?.(newValue);
    }
  };

  // Handle blur (clicking outside)
  const handleBlur = () => {
    // Pass current editingValue directly
    onEditComplete?.(editingValue);
  };

  return (
    <div
      className={`group flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${colors.bg} ${colors.text} flex-shrink-0`}
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
        <span>{config.label}</span>
      )}
      {/* Edit/Cancel button - same position, swaps icon based on mode */}
      {config.canEdit && config.onEdit && (
        <button
          onClick={
            isEditing ? () => onEditComplete?.(editingValue) : config.onEdit
          }
          className={`rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0 ${
            isEditing
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
      {/* Clear/Delete button (Trash) - shown on hover, hidden when editing */}
      {!isEditing && config.canClear && (
        <button
          onClick={config.onClear}
          className={`max-w-0 opacity-0 overflow-hidden group-hover:max-w-[24px] group-hover:opacity-100 ml-0 group-hover:ml-1.5 rounded-sm p-0.5 ${colors.hoverBg} flex-shrink-0`}
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
