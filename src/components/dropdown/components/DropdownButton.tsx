import React, { forwardRef } from 'react';
import Button from './button/Button';
import { useTextExpansion } from '../hooks/useTextExpansion';
import type { DropdownMode } from '@/types';

interface DropdownButtonProps {
  mode?: DropdownMode;
  selectedOption?: { id: string; name: string };
  placeholder?: string;
  isOpen: boolean;
  isClosing: boolean;
  hasError: boolean;
  name?: string;
  tabIndex?: number;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
}

const DropdownButton = forwardRef<HTMLButtonElement, DropdownButtonProps>(
  (
    {
      mode = 'input',
      selectedOption,
      placeholder = 'Pilih',
      isOpen,
      isClosing,
      hasError,
      name,
      tabIndex,
      disabled = false,
      onClick,
      onKeyDown,
      onBlur,
    },
    ref
  ) => {
    const buttonRef = ref as React.RefObject<HTMLButtonElement>;

    const { isButtonTextExpanded } = useTextExpansion({
      buttonRef,
      selectedOption,
      isOpen,
    });

    // Expansion is disabled on hover for truncated text
    const isExpanded = false;

    const displayText = selectedOption
      ? isButtonTextExpanded
        ? selectedOption.name
        : selectedOption.name
      : placeholder;

    const titleText = selectedOption?.name || placeholder;
    const isPlaceholder = !selectedOption;

    return (
      <Button
        ref={ref}
        mode={mode}
        displayText={displayText}
        titleText={titleText}
        isPlaceholder={isPlaceholder}
        isOpen={isOpen}
        isClosing={isClosing}
        isExpanded={isExpanded}
        hasError={hasError}
        name={name}
        tabIndex={tabIndex}
        disabled={disabled}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        onFocus={() => {}}
        onBlur={() => {
          onBlur();
        }}
      />
    );
  }
);

DropdownButton.displayName = 'DropdownButton';

export default DropdownButton;
