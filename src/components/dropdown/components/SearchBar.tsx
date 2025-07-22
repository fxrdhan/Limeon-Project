import React, { forwardRef, RefObject } from 'react';
import SearchInput from './search/SearchInput';
import SearchIcon from './search/SearchIcon';
import AddNewButton from './search/AddNewButton';
import { SEARCH_STATES } from '../constants';

interface SearchBarProps {
  searchTerm: string;
  searchState: string;
  isOpen: boolean;
  highlightedIndex: number;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  onAddNew?: (term: string) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      searchTerm,
      searchState,
      isOpen,
      highlightedIndex,
      currentFilteredOptions,
      onAddNew,
      onSearchChange,
      onKeyDown,
      onFocus,
      leaveTimeoutRef,
    },
    ref,
  ) => {
    const showAddNew = (searchState === SEARCH_STATES.NOT_FOUND ||
      (searchState === SEARCH_STATES.TYPING && currentFilteredOptions.length === 0)) && onAddNew;

    return (
      <div className="p-2 border-b border-gray-200 sticky top-0 z-10">
        <div className="relative flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <SearchInput
              ref={ref}
              searchTerm={searchTerm}
              searchState={searchState}
              isOpen={isOpen}
              highlightedIndex={highlightedIndex}
              currentFilteredOptions={currentFilteredOptions}
              onSearchChange={onSearchChange}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              leaveTimeoutRef={leaveTimeoutRef}
            />
            <SearchIcon
              searchState={searchState}
              hasSearchTerm={!!searchTerm}
              position="absolute"
            />
          </div>
          {searchTerm && (
            <div className="flex items-center">
              {showAddNew && onAddNew ? (
                <AddNewButton
                  searchTerm={searchTerm}
                  searchState={searchState}
                  onAddNew={onAddNew}
                />
              ) : (
                <SearchIcon
                  searchState={searchState}
                  hasSearchTerm={!!searchTerm}
                  position="relative"
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;