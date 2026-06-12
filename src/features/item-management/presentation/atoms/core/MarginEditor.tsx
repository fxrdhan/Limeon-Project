/**
 * Inline margin editor used by the item pricing form.
 */

import React from 'react';
import { MarginEditInPlace } from './GenericEditInPlaceFactory';

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
