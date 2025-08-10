import React, { forwardRef } from 'react';
import ButtonText from './ButtonText';
import ButtonIcon from './ButtonIcon';
import type { DropdownMode } from '@/types';

interface ButtonProps {
  mode?: DropdownMode;
  displayText: string;
  titleText?: string;
  isPlaceholder: boolean;
  isOpen: boolean;
  isClosing: boolean;
  isExpanded: boolean;
  hasError: boolean;
  name?: string;
  tabIndex?: number;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      mode = 'input',
      displayText,
      titleText,
      isPlaceholder,
      isOpen,
      isClosing,
      isExpanded,
      hasError,
      name,
      tabIndex,
      onClick,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
    },
    ref
  ) => {
    // For text mode, render as plain text appearance
    if (mode === 'text') {
      return (
        <button
          ref={ref}
          type="button"
          name={name}
          tabIndex={tabIndex}
          className={`inline-flex items-center gap-1 text-sm text-gray-800 hover:text-gray-900 focus:outline-hidden transition duration-200 ease-in-out cursor-pointer ${
            isPlaceholder 
              ? 'text-gray-500 hover:text-gray-600' 
              : 'text-gray-800 hover:text-gray-900'
          }`}
          aria-haspopup="menu"
          aria-expanded={isOpen || isClosing}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-controls={isOpen ? 'dropdown-options-list' : undefined}
        >
          <ButtonText
            displayText={displayText}
            titleText={titleText}
            isPlaceholder={isPlaceholder}
            isExpanded={isExpanded}
          />
          <ButtonIcon
            isOpen={isOpen}
            isClosing={isClosing}
            isExpanded={isExpanded}
          />
        </button>
      );
    }

    // Default input mode rendering
    return (
      <button
        ref={ref}
        type="button"
        name={name}
        tabIndex={tabIndex}
        className={`py-2.5 px-3 w-full inline-flex justify-between text-sm font-medium rounded-lg border bg-white text-gray-800 hover:bg-gray-50 focus:outline-hidden focus:ring-3 transition duration-200 ease-in-out ${
          isExpanded ? 'items-start' : 'items-center'
        } ${
          hasError
            ? 'border-danger ring-3 ring-danger/20 focus:ring-red-200 focus:border-danger'
            : 'border-gray-300 focus:ring-emerald-200 focus:border-primary'
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen || isClosing}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-controls={isOpen ? 'dropdown-options-list' : undefined}
      >
        <ButtonText
          displayText={displayText}
          titleText={titleText}
          isPlaceholder={isPlaceholder}
          isExpanded={isExpanded}
        />
        <ButtonIcon
          isOpen={isOpen}
          isClosing={isClosing}
          isExpanded={isExpanded}
        />
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
