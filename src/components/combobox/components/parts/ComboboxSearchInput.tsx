import { useLayoutEffect } from 'react';
import SearchInput from '../search/SearchInput';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import type { ComboboxSearchInputProps } from '../../types';

const ComboboxSearchInput = ({
  className,
  style,
  render,
}: ComboboxSearchInputProps) => {
  const {
    searchInputRef,
    listboxId,
    searchInputId,
    activeDescendantId,
    searchTerm,
    searchState,
    isOpen,
    filteredOptions,
    labels,
    onSearchChange,
    onSearchKeyDown,
    leaveTimeoutRef,
    onSearchPartMount,
  } = useComboboxContext();

  useLayoutEffect(() => onSearchPartMount(), [onSearchPartMount]);

  return (
    <SearchInput
      ref={searchInputRef}
      id={searchInputId}
      listboxId={listboxId}
      activeDescendantId={activeDescendantId}
      searchTerm={searchTerm}
      searchState={searchState}
      isOpen={isOpen}
      isListEmpty={filteredOptions.length === 0}
      placeholder={labels.searchPlaceholder}
      ariaLabel={labels.search}
      onSearchChange={onSearchChange}
      onKeyDown={onSearchKeyDown}
      onFocus={() => {}}
      leaveTimeoutRef={leaveTimeoutRef}
      className={className}
      style={style}
      render={render}
    />
  );
};

export default ComboboxSearchInput;
