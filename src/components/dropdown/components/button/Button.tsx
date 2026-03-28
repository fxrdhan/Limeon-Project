import React, { forwardRef } from 'react';
import ButtonText from './ButtonText';
import ButtonIcon from './ButtonIcon';
import type { DropdownMode } from '@/types';
import {
  FORM_CONTROL_BORDER_DEFAULT_CLASS,
  FORM_CONTROL_BORDER_ERROR_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_FOCUS_ERROR_CLASS,
} from '@/styles/uiPrimitives';

interface ButtonProps {
  mode?: DropdownMode;
  displayText: string;
  titleText?: string;
  metaLabel?: string;
  isPlaceholder: boolean;
  isOpen: boolean;
  isClosing: boolean;
  isExpanded: boolean;
  hasError: boolean;
  name?: string;
  tabIndex?: number;
  disabled?: boolean;
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
      metaLabel,
      isPlaceholder,
      isOpen,
      isClosing,
      isExpanded,
      hasError,
      name,
      tabIndex,
      disabled = false,
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
          disabled={disabled}
          className={`inline-flex items-center gap-1 min-h-[1.5rem] text-base font-medium transition duration-200 ease-in-out ${
            disabled
              ? 'cursor-not-allowed'
              : isPlaceholder
                ? 'text-slate-500 hover:text-slate-600 cursor-pointer'
                : 'text-slate-700 hover:text-slate-800 cursor-pointer'
          }`}
          aria-haspopup="menu"
          aria-expanded={isOpen || isClosing}
          onClick={disabled ? undefined : onClick}
          onKeyDown={disabled ? undefined : onKeyDown}
          onMouseEnter={disabled ? undefined : onMouseEnter}
          onMouseLeave={disabled ? undefined : onMouseLeave}
          onFocus={disabled ? undefined : onFocus}
          onBlur={disabled ? undefined : onBlur}
          aria-controls={isOpen ? 'dropdown-options-list' : undefined}
        >
          <ButtonText
            displayText={displayText}
            titleText={titleText}
            metaLabel={metaLabel}
            isPlaceholder={isPlaceholder}
            isExpanded={false}
          />
          <ButtonIcon isOpen={isOpen} isClosing={isClosing} />
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
        disabled={disabled}
        className={`py-2.5 px-3 w-full inline-flex justify-between text-sm font-medium rounded-xl border transition duration-200 ease-in-out ${
          isExpanded ? 'items-start' : 'items-center'
        } ${
          disabled
            ? 'bg-slate-100 text-slate-800 cursor-not-allowed border-slate-200'
            : hasError
              ? `bg-white text-slate-800 hover:bg-slate-50 ${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_CLASS}`
              : `bg-white text-slate-800 hover:bg-slate-50 ${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen || isClosing}
        onClick={disabled ? undefined : onClick}
        onKeyDown={disabled ? undefined : onKeyDown}
        onMouseEnter={disabled ? undefined : onMouseEnter}
        onMouseLeave={disabled ? undefined : onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-controls={isOpen ? 'dropdown-options-list' : undefined}
      >
        <ButtonText
          displayText={displayText}
          titleText={titleText}
          metaLabel={metaLabel}
          isPlaceholder={isPlaceholder}
          isExpanded={isExpanded}
        />
        <ButtonIcon isOpen={isOpen} isClosing={isClosing} />
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
