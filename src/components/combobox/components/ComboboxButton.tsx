import React, { forwardRef } from 'react';
import Button from './button/Button';
import { useTextExpansion } from '../hooks/useTextExpansion';
import type { ComboboxMode } from '@/types';

interface ComboboxButtonProps {
  id: string;
  mode?: ComboboxMode;
  selectedOption?: { id: string; name: string; metaLabel?: string };
  placeholder?: string;
  isOpen: boolean;
  isClosing: boolean;
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
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
}

const ComboboxButton = forwardRef<HTMLButtonElement, ComboboxButtonProps>(
  (
    {
      id,
      mode = 'input',
      selectedOption,
      placeholder = 'Pilih',
      isOpen,
      isClosing,
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
        id={id}
        mode={mode}
        displayText={displayText}
        titleText={titleText}
        metaLabel={selectedOption?.metaLabel}
        isPlaceholder={isPlaceholder}
        isOpen={isOpen}
        isClosing={isClosing}
        isExpanded={isExpanded}
        hasError={hasError}
        name={name}
        popupId={popupId}
        listboxId={listboxId}
        searchList={searchList}
        activeDescendantId={activeDescendantId}
        tabIndex={tabIndex}
        required={required}
        disabled={disabled}
        ariaLabel={ariaLabel}
        ariaLabelledBy={ariaLabelledBy}
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

ComboboxButton.displayName = 'ComboboxButton';

export default ComboboxButton;
