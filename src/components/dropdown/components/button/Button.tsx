import React, { forwardRef } from 'react';
import ButtonText from './ButtonText';
import ButtonIcon from './ButtonIcon';

interface ButtonProps {
  displayText: string;
  titleText?: string;
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
      displayText,
      titleText,
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
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        name={name}
        tabIndex={tabIndex}
        className={`py-2.5 px-3 w-full inline-flex justify-between text-sm font-medium rounded-lg border bg-white/50 backdrop-blur-md text-gray-800 shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-3 transition duration-200 ease-in-out ${
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
          isExpanded={isExpanded}
        />
        <ButtonIcon
          isOpen={isOpen}
          isClosing={isClosing}
          isExpanded={isExpanded}
        />
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;