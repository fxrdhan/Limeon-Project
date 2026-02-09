import React, { forwardRef, RefObject } from 'react';
import { SEARCH_STATES } from '../../constants';

interface SearchInputProps {
  searchTerm: string;
  searchState: string;
  isOpen: boolean;
  highlightedIndex: number;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      searchTerm,
      searchState,
      isOpen,
      highlightedIndex,
      currentFilteredOptions,
      onSearchChange,
      onKeyDown,
      onFocus,
      leaveTimeoutRef,
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type="text"
        className={`w-full py-2 text-sm border rounded-lg focus:outline-hidden transition-all duration-300 ease-in-out min-w-0 pl-2 ${
          searchState === SEARCH_STATES.NOT_FOUND
            ? 'border-danger focus:border-danger focus:ring-3 focus:ring-red-200'
            : 'border-slate-300 focus:border-primary focus:ring-3 focus:ring-emerald-200'
        }`}
        placeholder="Cari..."
        value={searchTerm}
        onChange={onSearchChange}
        onKeyDown={onKeyDown}
        onClick={e => e.stopPropagation()}
        onFocus={() => {
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
          onFocus();
        }}
        data-open={isOpen ? 'true' : 'false'}
        aria-controls="dropdown-options-list"
        aria-activedescendant={
          highlightedIndex >= 0 && currentFilteredOptions[highlightedIndex]
            ? `dropdown-option-${currentFilteredOptions[highlightedIndex].id}`
            : undefined
        }
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
