/**
 * Inline minimum-stock editor used by the item settings form.
 */

import React from 'react';
import { MinStockEditInPlace } from './GenericEditInPlaceFactory';

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
