import React, { forwardRef } from 'react';
import Button from './button/Button';
import { useButtonText } from '../hooks/button/useButtonText';
import { useButtonExpansion } from '../hooks/button/useButtonExpansion';

interface DropdownButtonProps {
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
      selectedOption,
      placeholder = '-- Pilih --',
      isOpen,
      isClosing,
      hasError,
      name,
      tabIndex,
      onClick,
      onKeyDown,
      onBlur,
    },
    ref,
  ) => {
    const buttonRef = ref as React.RefObject<HTMLButtonElement>;
    
    const { isExpanded, handleExpansionChange } = useButtonExpansion({
      selectedOption,
      buttonRef,
    });

    const { displayText, titleText } = useButtonText({
      selectedOption,
      placeholder,
      isExpanded,
      buttonRef,
    });

    return (
      <Button
        ref={ref}
        displayText={displayText}
        titleText={titleText}
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
        onBlur={onBlur}
      />
    );
  },
);

DropdownButton.displayName = 'DropdownButton';

export default DropdownButton;