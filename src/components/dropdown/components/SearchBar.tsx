import { forwardRef } from 'react';
import SearchInput from './search/SearchInput';
import SearchIcon from './search/SearchIcon';
import AddNewButton from './search/AddNewButton';
import { SEARCH_STATES } from '../constants';
import { useDropdownContext } from '../hooks/useDropdownContext';
import type { SearchBarProps } from '../types';

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ onKeyDown, onFocus, leaveTimeoutRef }, ref) => {
    const {
      searchTerm,
      searchState,
      isOpen,
      highlightedIndex,
      filteredOptions,
      onAddNew,
      onSearchChange,
    } = useDropdownContext();

    const handleAddNewFromSearch = (term: string) => {
      onAddNew?.(term);
    };
    const showAddNew =
      (searchState === SEARCH_STATES.NOT_FOUND ||
        (searchState === SEARCH_STATES.TYPING &&
          filteredOptions.length === 0)) &&
      onAddNew;

    return (
      <div className="p-2 border-b border-slate-200 sticky top-0 z-10">
        <div className="relative flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <SearchInput
              ref={ref}
              searchTerm={searchTerm}
              searchState={searchState}
              isOpen={isOpen}
              highlightedIndex={highlightedIndex}
              currentFilteredOptions={filteredOptions}
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
              {showAddNew ? (
                <AddNewButton
                  searchTerm={searchTerm}
                  searchState={searchState}
                  onAddNew={handleAddNewFromSearch}
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
  }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
