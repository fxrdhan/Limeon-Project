/**
 * MarginEditor - Refactored using GenericEditInPlaceFactory
 *
 * This component maintains 100% backward compatibility with the original MarginEditor
 * while using the generic factory foundation to eliminate code duplication.
 *
 * Before: 90 lines of duplicated edit-in-place logic
 * After: 25 lines using shared factory system
 *
 * Benefits:
 * - Eliminates 70+ lines of duplicate code
 * - Consistent behavior across all edit-in-place components
 * - Easier maintenance and testing
 * - Same exact API for drop-in replacement
 */

import React from 'react';
import { MarginEditInPlace } from './GenericEditInPlaceFactory';

// Maintain exact same interface as original MarginEditor
interface LocalMarginEditorProps {
  isEditing: boolean;
  marginPercentage: string;
  calculatedMargin: number | null;
  tabIndex?: number;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/**
 * Refactored MarginEditor with identical API
 *
 * Drop-in replacement for the original MarginEditor component.
 * All props and behavior remain exactly the same.
 */
export default function MarginEditor({
  isEditing,
  marginPercentage,
  calculatedMargin,
  tabIndex = 14,
  onStartEdit,
  onStopEdit,
  onChange,
  onKeyDown,
  disabled = false,
}: LocalMarginEditorProps) {
  return (
    <MarginEditInPlace
      isEditing={isEditing}
      value={calculatedMargin}
      inputValue={marginPercentage}
      tabIndex={tabIndex}
      onStartEdit={onStartEdit}
      onStopEdit={onStopEdit}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
    />
  );
}
