import React, { forwardRef, RefObject } from 'react';
import { SEARCH_STATES } from '../../constants';
import { renderComboboxElement } from '../../utils/renderPart';
import {
  FORM_CONTROL_BORDER_DEFAULT_CLASS,
  FORM_CONTROL_BORDER_ERROR_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_FOCUS_ERROR_CLASS,
} from '@/styles/uiPrimitives';
import type {
  ComboboxSearchInputRenderProps,
  ComboboxSearchInputState,
  ComboboxSearchInputProps,
} from '../../types';

interface SearchInputProps extends ComboboxSearchInputProps {
  id: string;
  listboxId: string;
  activeDescendantId?: string;
  searchTerm: string;
  searchState: string;
  isOpen: boolean;
  isListEmpty: boolean;
  placeholder: string;
  ariaLabel: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      id,
      listboxId,
      activeDescendantId,
      searchTerm,
      searchState,
      isOpen,
      isListEmpty,
      placeholder,
      ariaLabel,
      onSearchChange,
      onKeyDown,
      onFocus,
      leaveTimeoutRef,
      className,
      style,
      render,
    },
    ref
  ) => {
    const inputClassName = `w-full py-2 text-sm border rounded-lg focus:outline-hidden transition-all duration-300 ease-in-out min-w-0 pl-2 ${
      searchState === SEARCH_STATES.NOT_FOUND
        ? `${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_CLASS}`
        : `${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
    } ${className ?? ''}`;
    const inputProps = {
      id,
      ref,
      type: 'text',
      className: inputClassName,
      style,
      placeholder,
      value: searchTerm,
      onChange: onSearchChange,
      onKeyDown,
      onClick: (e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation(),
      onFocus: () => {
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
          leaveTimeoutRef.current = null;
        }
        onFocus();
      },
      'data-state': isOpen ? 'open' : 'closed',
      'data-open': isOpen ? 'true' : 'false',
      'data-popup-open': isOpen ? '' : undefined,
      'data-empty': isListEmpty ? '' : undefined,
      'data-list-empty': isListEmpty ? '' : undefined,
      'data-invalid': searchState === SEARCH_STATES.NOT_FOUND ? '' : undefined,
      'aria-label': ariaLabel,
      'aria-autocomplete': 'list' as const,
      'aria-controls': isOpen ? listboxId : undefined,
      'aria-activedescendant': isOpen ? activeDescendantId : undefined,
    } as ComboboxSearchInputRenderProps;
    const state = {
      open: isOpen,
      empty: isListEmpty,
      value: searchTerm,
      invalid: searchState === SEARCH_STATES.NOT_FOUND,
    } satisfies ComboboxSearchInputState;
    const renderedElement = renderComboboxElement(render, inputProps, state);

    if (renderedElement) {
      return renderedElement;
    }

    const { ref: _renderRef, ...inputDomProps } = inputProps;

    return (
      <input
        ref={ref}
        {...(inputDomProps as React.ComponentPropsWithoutRef<'input'>)}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
