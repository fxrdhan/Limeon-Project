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
      onClick,
      onKeyDown,
      onBlur,
    },
    ref
  ) => {
    const buttonRef = ref as React.RefObject<HTMLButtonElement>;

    const { isExpanded, handleExpansionChange, isButtonTextExpanded } =
      useTextExpansion({
        buttonRef,
        selectedOption,
        isOpen,
      });

    // Calculate display text based on expansion state
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
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={() => handleExpansionChange(true)}
        onMouseLeave={() => handleExpansionChange(false)}
        onFocus={() => handleExpansionChange(true)}
        onBlur={() => {
          handleExpansionChange(false);
          onBlur();
        }}
      />
    );
  }
);

DropdownButton.displayName = 'DropdownButton';

export default DropdownButton;
