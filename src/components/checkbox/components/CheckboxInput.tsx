import React from 'react';
import type { CheckboxInputProps } from '../types';

export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  tabIndex,
}) => {
  const handleChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      tabIndex={tabIndex}
      className="sr-only"
    />
  );
};
