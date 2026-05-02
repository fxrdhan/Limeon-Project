import React, { forwardRef } from 'react';
import ButtonText from './ButtonText';
import ButtonIcon from './ButtonIcon';
import type { ComboboxMode } from '@/types';
import {
  FORM_CONTROL_BORDER_DEFAULT_CLASS,
  FORM_CONTROL_BORDER_ERROR_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_FOCUS_ERROR_CLASS,
} from '@/styles/uiPrimitives';

interface ButtonProps {
  id: string;
  mode?: ComboboxMode;
  displayText: string;
  titleText?: string;
  metaLabel?: string;
  isPlaceholder: boolean;
  isOpen: boolean;
  isClosing: boolean;
  isExpanded: boolean;
  hasError: boolean;
  name?: string;
  popupId: string;
  listboxId: string;
  searchList: boolean;
  activeDescendantId?: string;
  tabIndex?: number;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  style?: React.CSSProperties;
  render?: (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      ref: React.ForwardedRef<HTMLButtonElement>;
    },
    state: {
      open: boolean;
      disabled: boolean;
      invalid: boolean;
      placeholder: boolean;
    }
  ) => React.ReactElement;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      id,
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
      popupId,
      listboxId,
      searchList,
      activeDescendantId,
      tabIndex,
      required = false,
      disabled = false,
      ariaLabel,
      ariaLabelledBy,
      className,
      style,
      render,
      onClick,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
    },
    ref
  ) => {
    const popupControlId = searchList ? popupId : listboxId;
    const valueTextId = `${id}-value`;
    const labelledBy = ariaLabelledBy
      ? `${ariaLabelledBy} ${valueTextId}`
      : undefined;
    const triggerLabel = labelledBy ? undefined : (ariaLabel ?? titleText);
    const state = {
      open: isOpen,
      disabled,
      invalid: hasError,
      placeholder: isPlaceholder,
    };

    // For text mode, render as plain text appearance
    if (mode === 'text') {
      const buttonProps = {
        ref,
        id,
        type: 'button' as const,
        name,
        tabIndex,
        disabled,
        className: `inline-flex items-center gap-1 min-h-[1.5rem] text-base font-medium transition duration-200 ease-in-out ${
          disabled
            ? 'cursor-not-allowed'
            : isPlaceholder
              ? 'text-slate-500 hover:text-slate-600 cursor-pointer'
              : 'text-slate-700 hover:text-slate-800 cursor-pointer'
        } ${className ?? ''}`,
        style,
        'aria-expanded': isOpen || isClosing,
        onClick: disabled ? undefined : onClick,
        onKeyDown: disabled ? undefined : onKeyDown,
        onMouseEnter: disabled ? undefined : onMouseEnter,
        onMouseLeave: disabled ? undefined : onMouseLeave,
        onFocus: disabled ? undefined : onFocus,
        onBlur: disabled ? undefined : onBlur,
        role: 'combobox',
        'aria-label': triggerLabel,
        'aria-labelledby': labelledBy,
        'aria-controls': isOpen || isClosing ? popupControlId : undefined,
        'aria-activedescendant':
          isOpen && activeDescendantId ? activeDescendantId : undefined,
        'aria-invalid': hasError || undefined,
        'aria-required': required || undefined,
        'data-popup-open': isOpen ? '' : undefined,
        'data-disabled': disabled ? '' : undefined,
        'data-invalid': hasError ? '' : undefined,
        'data-required': required ? '' : undefined,
        'data-placeholder': isPlaceholder ? '' : undefined,
        children: (
          <>
            <ButtonText
              valueTextId={valueTextId}
              displayText={displayText}
              titleText={titleText}
              metaLabel={metaLabel}
              isPlaceholder={isPlaceholder}
              isExpanded={false}
            />
            <ButtonIcon isOpen={isOpen} isClosing={isClosing} />
          </>
        ),
      };

      if (render) {
        return render(buttonProps, state);
      }

      return <button {...buttonProps} />;
    }

    // Default input mode rendering
    const buttonProps = {
      ref,
      id,
      type: 'button' as const,
      name,
      tabIndex,
      disabled,
      className: `py-2.5 px-3 w-full inline-flex justify-between text-sm font-medium rounded-xl border transition duration-200 ease-in-out ${
        isExpanded ? 'items-start' : 'items-center'
      } ${
        disabled
          ? 'bg-slate-100 text-slate-800 cursor-not-allowed border-slate-200'
          : hasError
            ? `bg-white text-slate-800 hover:bg-slate-50 ${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_CLASS}`
            : `bg-white text-slate-800 hover:bg-slate-50 ${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
      } ${className ?? ''}`,
      style,
      'aria-expanded': isOpen || isClosing,
      onClick: disabled ? undefined : onClick,
      onKeyDown: disabled ? undefined : onKeyDown,
      onMouseEnter: disabled ? undefined : onMouseEnter,
      onMouseLeave: disabled ? undefined : onMouseLeave,
      onFocus,
      onBlur,
      role: 'combobox',
      'aria-label': triggerLabel,
      'aria-labelledby': labelledBy,
      'aria-controls': isOpen || isClosing ? popupControlId : undefined,
      'aria-activedescendant':
        isOpen && activeDescendantId ? activeDescendantId : undefined,
      'aria-invalid': hasError || undefined,
      'aria-required': required || undefined,
      'data-popup-open': isOpen ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      'data-invalid': hasError ? '' : undefined,
      'data-required': required ? '' : undefined,
      'data-placeholder': isPlaceholder ? '' : undefined,
      children: (
        <>
          <ButtonText
            valueTextId={valueTextId}
            displayText={displayText}
            titleText={titleText}
            metaLabel={metaLabel}
            isPlaceholder={isPlaceholder}
            isExpanded={isExpanded}
          />
          <ButtonIcon isOpen={isOpen} isClosing={isClosing} />
        </>
      ),
    };

    if (render) {
      return render(buttonProps, state);
    }

    return <button {...buttonProps} />;
  }
);

Button.displayName = 'Button';

export default Button;
