import React from 'react';
import type { UseKeyboardHandlerProps } from '../types';

export const useKeyboardHandler = ({
  disabled,
  onChange,
  checked,
}: UseKeyboardHandlerProps) => {
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLLabelElement>) => {
      if (event.key === 'Enter' && !disabled) {
        event.preventDefault();
        onChange(!checked);
      }
    },
    [disabled, onChange, checked]
  );

  return { handleKeyDown };
};