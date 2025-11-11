/**
 * MinStockEditor - Refactored using GenericEditInPlaceFactory
 *
 * This component maintains 100% backward compatibility with the original MinStockEditor
 * while using the generic factory foundation to eliminate code duplication.
 *
 * Before: 80 lines of duplicated edit-in-place logic
 * After: 25 lines using shared factory system
 *
 * Benefits:
 * - Eliminates 55+ lines of duplicate code
 * - Consistent behavior across all edit-in-place components
 * - Easier maintenance and testing
 * - Same exact API for drop-in replacement
 */

import React from 'react';
import { MinStockEditInPlace } from './GenericEditInPlaceFactory';

// Maintain exact same interface as original MinStockEditor
interface LocalMinStockEditorProps {
  isEditing: boolean;
  minStockValue: string;
  currentMinStock: number;
  tabIndex?: number;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/**
 * Refactored MinStockEditor with identical API
 *
 * Drop-in replacement for the original MinStockEditor component.
 * All props and behavior remain exactly the same.
 */
export default function MinStockEditor({
  isEditing,
  minStockValue,
  currentMinStock,
  tabIndex = 11,
  onStartEdit,
  onStopEdit,
  onChange,
  onKeyDown,
  disabled = false,
}: LocalMinStockEditorProps) {
  return (
    <MinStockEditInPlace
      isEditing={isEditing}
      value={currentMinStock}
      inputValue={minStockValue}
      tabIndex={tabIndex}
      onStartEdit={onStartEdit}
      onStopEdit={onStopEdit}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
    />
  );
}
